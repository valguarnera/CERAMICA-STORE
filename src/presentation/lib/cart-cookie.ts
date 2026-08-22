export function getCartSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.CART_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET or CART_SECRET environment variable is required');
  }
  return secret;
}