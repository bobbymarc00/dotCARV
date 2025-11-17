import { Header } from '@/components/layout/header';
import { DomainSearchSection } from '@/components/domain-search-section';
import { MyDomainsSection } from '@/components/my-domains-section';
import { Footer } from '@/components/layout/footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-body">
      <Header />
      <main className="flex-1">
        <DomainSearchSection />
        <MyDomainsSection />
      </main>
      <Footer />
    </div>
  );
}
