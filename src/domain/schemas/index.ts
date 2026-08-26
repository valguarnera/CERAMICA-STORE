import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const productSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price_cents: z.number().int().positive('El precio debe ser mayor a 0'),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string().url()).optional(),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(100).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones').optional(),
  description: z.string().optional(),
  price_cents: z.number().int().positive('El precio debe ser mayor a 0'),
  stock: z.number().int().min(0).default(0),
  images: z.array(z.string().url()).optional(),
  active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().positive('El precio debe ser mayor a 0').optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string().url()).optional().nullable(),
  active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
});

export const cartSchema = z.object({
  version: z.number().int().positive(),
  items: z.array(cartItemSchema),
});

export const checkoutSchema = z.object({
  email: z.string().email('Email inválido'),
  shippingAddress: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().min(1),
    phone: z.string().min(1),
  }),
  billingAddress: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    province: z.string().min(1),
    postalCode: z.string().min(1),
  }).optional(),
  notes: z.string().optional(),
});

export const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CartInput = z.infer<typeof cartSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;