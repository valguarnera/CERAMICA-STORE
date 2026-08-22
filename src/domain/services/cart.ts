import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';
import { createHmac, timingSafeEqual } from 'crypto';
import { ProductService } from './product';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Cart {
  version: number;
  items: CartItem[];
}

const CART_VERSION = 1;

export class CartService {
  private productService: ProductService;
  private secret: string;

  constructor(db: Kysely<Database>, secret: string) {
    this.productService = new ProductService(db);
    this.secret = secret;
  }

  private sign(data: string): string {
    const hmac = createHmac('sha256', this.secret);
    hmac.update(data);
    return hmac.digest('hex');
  }

  private verify(data: string, signature: string): boolean {
    const expected = this.sign(data);
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  serialize(cart: Cart): string {
    const data = JSON.stringify(cart);
    const signature = this.sign(data);
    return `${data}.${signature}`;
  }

  deserialize(cookieValue: string): Cart | null {
    try {
      const lastDot = cookieValue.lastIndexOf('.');
      if (lastDot === -1) return null;

      const data = cookieValue.slice(0, lastDot);
      const signature = cookieValue.slice(lastDot + 1);

      if (!this.verify(data, signature)) return null;

      const cart = JSON.parse(data) as Cart;

      if (!cart.version || !Array.isArray(cart.items)) return null;

      return cart;
    } catch {
      return null;
    }
  }

  getEmptyCart(): Cart {
    return { version: CART_VERSION, items: [] };
  }

  async addItem(cart: Cart, productId: string, quantity: number): Promise<Cart> {
    const product = await this.productService.findById(productId);

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    if (!product.active) {
      throw new Error('PRODUCT_INACTIVE');
    }

    if (product.stock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const existingIndex = cart.items.findIndex((item) => item.productId === productId);

    let newItems: CartItem[];

    if (existingIndex >= 0) {
      const newQuantity = cart.items[existingIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        throw new Error('INSUFFICIENT_STOCK');
      }
      newItems = [...cart.items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newQuantity,
      };
    } else {
      if (cart.items.length >= 50) {
        throw new Error('CART_FULL');
      }
      newItems = [
        ...cart.items,
        {
          productId,
          quantity,
          unitPriceCents: product.priceCents,
        },
      ];
    }

    return {
      version: cart.version + 1,
      items: newItems,
    };
  }

  async updateQuantity(cart: Cart, productId: string, quantity: number): Promise<Cart> {
    if (quantity <= 0) {
      return this.removeItem(cart, productId);
    }

    const product = await this.productService.findById(productId);

    if (!product || !product.active) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    if (product.stock < quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const existingIndex = cart.items.findIndex((item) => item.productId === productId);

    if (existingIndex === -1) {
      throw new Error('ITEM_NOT_IN_CART');
    }

    const newItems = [...cart.items];
    newItems[existingIndex] = {
      ...newItems[existingIndex],
      quantity,
    };

    return {
      version: cart.version + 1,
      items: newItems,
    };
  }

  removeItem(cart: Cart, productId: string): Cart {
    const newItems = cart.items.filter((item) => item.productId !== productId);

    return {
      version: cart.version + 1,
      items: newItems,
    };
  }

  clearCart(): Cart {
    return this.getEmptyCart();
  }

  calculateTotal(cart: Cart): number {
    return cart.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  }

  async validateAndHydrate(cart: Cart): Promise<{
    valid: boolean;
    cart: Cart;
    errors: string[];
  }> {
    const errors: string[] = [];
    const validItems: CartItem[] = [];

    for (const item of cart.items) {
      const product = await this.productService.findById(item.productId);

      if (!product) {
        errors.push(`Producto ${item.productId} no encontrado`);
        continue;
      }

      if (!product.active) {
        errors.push(`Producto ${product.name} ya no está disponible`);
        continue;
      }

      if (product.stock < item.quantity) {
        errors.push(`Stock insuficiente para ${product.name}. Máximo: ${product.stock}`);
        if (product.stock > 0) {
          validItems.push({
            ...item,
            quantity: product.stock,
          });
        }
        continue;
      }

      validItems.push(item);
    }

    return {
      valid: errors.length === 0,
      cart: {
        version: cart.version + 1,
        items: validItems,
      },
      errors,
    };
  }
}