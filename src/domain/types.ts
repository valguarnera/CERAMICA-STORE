import type { Database } from './db';

export type User = Database['users'];
export type Session = Database['sessions'];
export type Product = Database['products'];
export type Order = Database['orders'];
export type OrderItem = Database['order_items'];
export type Payment = Database['payments'];
export type WebhookLog = Database['webhooks_log'];
export type Setting = Database['settings'];

export type OrderStatus = Database['orders']['status'];
export type PaymentStatus = Database['payments']['status'];

export interface CartItem {
  productId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Cart {
  version: number;
  items: CartItem[];
}

export interface CheckoutData {
  email: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  billingAddress?: {
    name: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
  };
  notes?: string;
}