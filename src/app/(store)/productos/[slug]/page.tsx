import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDatabase } from '@/infrastructure/database';
import { ProductService } from '@/domain/services';
import { ProductDetail } from '@/presentation/components/store/ProductDetail';
import { generateProductJsonLd } from '@/presentation/lib/seo';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const db = getDatabase();
  const productService = new ProductService(db);
  const product = await productService.findBySlug(slug);

  if (!product || !product.active) {
    return { title: 'Producto no encontrado' };
  }

  return {
    title: `${product.name} - CERAMICA-STORE`,
    description: product.description || undefined,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.images ? JSON.parse(product.images)[0] : undefined,
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const db = getDatabase();
  const productService = new ProductService(db);
  const product = await productService.findBySlug(slug);

  if (!product || !product.active) {
    notFound();
  }

  const jsonLd = generateProductJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-6 text-sm text-muted-foreground">
          <a href="/productos" className="hover:underline">
            Catálogo
          </a>
          <span className="mx-2">/</span>
          <span className="font-medium">{product.name}</span>
        </nav>
        <ProductDetail product={product} />
      </div>
    </>
  );
}