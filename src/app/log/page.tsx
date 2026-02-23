import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { SessionForm } from "@/components/log/session-form";

export const dynamic = "force-dynamic";

export default function LogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Log Session
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Record your practice and track your progress.
          </p>
        </div>
        <SessionForm />
      </main>
      <Footer />
    </div>
  );
}
