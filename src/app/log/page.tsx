import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { LogPageContent } from "@/components/log/log-page-content";

export const dynamic = "force-dynamic";

export default function LogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <LogPageContent />
      </main>
      <Footer />
    </div>
  );
}
