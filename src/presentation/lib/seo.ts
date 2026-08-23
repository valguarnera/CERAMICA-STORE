import type { Product } from '@/domain/services/product';

export function generateProductJsonLd(product: Product) {
  const images = product.images ? JSON.parse(product.images) : [];
  const imageUrl = images.length > 0 ? images[0] : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: imageUrl,
    offers: {
      '@type': 'Offer',
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: 'ARS',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };
}

export function generateProductListJsonLd(products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.images ? JSON.parse(product.images)[0] : undefined,
        offers: {
          '@type': 'Offer',
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: 'ARS',
          availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      },
    })),
  };
}