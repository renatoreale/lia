import Link from "next/link";

import { Scale } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col justify-between p-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scale className="size-4" />
          </div>
          LIA
        </Link>

        <div className="mx-auto w-full max-w-sm">{children}</div>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} LIA — Legal Intelligent Assistant
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,theme(colors.primary/15%),transparent_60%)]" />
        <div className="relative flex h-full flex-col items-start justify-center gap-4 p-16">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-sidebar-foreground">
            L&apos;assistente AI per la gestione condominiale.
          </h2>
          <p className="max-w-md text-sidebar-foreground/70">
            Automatizza le email, interroga i documenti del condominio e trova
            ogni verbale, delibera o bilancio in pochi secondi — sempre con
            citazioni verificabili.
          </p>
        </div>
      </div>
    </div>
  );
}
