import { Metadata } from 'next';
import { CartPage } from '@/presentation/components/store/CartPage';

export const metadata: Metadata = {
  title: 'Carrito - CERAMICA-STORE',
  description: 'Revisa tu carrito de compras',
};

export default function CartPageRoute() {
  return <CartPage />;
}