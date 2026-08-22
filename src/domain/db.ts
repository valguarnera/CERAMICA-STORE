export interface Database {
  users: {
    id: string;
    email: string;
    password_hash: string;
    role: 'ADMIN' | 'CUSTOMER';
    name: string | null;
    created_at: string;
    updated_at: string;
  };
  sessions: {
    id: string;
    user_id: string;
    expires_at: string;
    revoked: boolean;
    created_at: string;
  };
  products: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price_cents: number;
    stock: number;
    images: string | null;
    active: boolean;
    metadata: string | null;
    created_at: string;
    updated_at: string;
  };
  orders: {
    id: string;
    user_id: string | null;
    guest_email: string | null;
    status: OrderStatus;
    total_cents: number;
    currency: string;
    shipping_address: string | null;
    billing_address: string | null;
    notes: string | null;
    mp_preference_id: string | null;
    mp_payment_id: string | null;
    created_at: string;
    updated_at: string;
  };
  order_items: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price_cents: number;
    product_name: string;
    product_slug: string;
  };
  payments: {
    id: string;
    order_id: string;
    mp_payment_id: string | null;
    mp_preference_id: string | null;
    status: PaymentStatus;
    status_detail: string | null;
    amount_cents: number;
    currency: string;
    payment_method_id: string | null;
    payment_type_id: string | null;
    installments: number;
    payer_email: string | null;
    payer_id: string | null;
    external_reference: string | null;
    raw_response: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
  };
  webhooks_log: {
    id: string;
    mp_event_type: string;
    mp_resource_id: string;
    payload: string;
    processed: boolean;
    error: string | null;
    created_at: string;
  };
  settings: {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
  };
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED' | 'SHIPPED';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';