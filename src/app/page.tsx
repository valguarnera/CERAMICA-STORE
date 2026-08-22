export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">CERAMICA-STORE</h1>
        <p className="text-muted-foreground">Tienda online de cerámica artesanal</p>
        <div className="mt-8 flex gap-4 justify-center">
          <a href="/api/health" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Health Check
          </a>
        </div>
      </div>
    </main>
  );
}