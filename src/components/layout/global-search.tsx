"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";

interface CondominiumResult {
  id: string;
  name: string;
  city: string | null;
}

interface DocumentResult {
  id: string;
  title: string;
  condominium_id: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [condominiums, setCondominiums] = React.useState<CondominiumResult[]>([]);
  const [documents, setDocuments] = React.useState<DocumentResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open || query.trim().length < 2) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flips the loading flag for the debounced fetch started below
    setLoading(true);

    const timeout = setTimeout(async () => {
      const [condoRes, docRes] = await Promise.all([
        supabase
          .from("condominiums")
          .select("id, name, city")
          .ilike("name", `%${query}%`)
          .is("deleted_at", null)
          .limit(5),
        supabase
          .from("documents")
          .select("id, title, condominium_id")
          .ilike("title", `%${query}%`)
          .is("deleted_at", null)
          .limit(5),
      ]);

      if (!cancelled) {
        setCondominiums(condoRes.data ?? []);
        setDocuments(docRes.data ?? []);
        setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [open, query]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start gap-2 text-muted-foreground sm:pr-12"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Cerca verbali, bilanci, delibere…</span>
        <kbd className="pointer-events-none hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Ricerca globale"
        description="Cerca condomini e documenti"
      >
        <CommandInput
          placeholder="Cerca es. 'verbali ascensore', 'bilancio 2024'…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Digita almeno 2 caratteri per cercare.</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Ricerca in corso…</CommandEmpty>
          ) : condominiums.length === 0 && documents.length === 0 ? (
            <CommandEmpty>Nessun risultato per &ldquo;{query}&rdquo;.</CommandEmpty>
          ) : null}

          {query.trim().length >= 2 && condominiums.length > 0 ? (
            <CommandGroup heading="Condomini">
              {condominiums.map((condo) => (
                <CommandItem
                  key={condo.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/condomini/${condo.id}`);
                  }}
                >
                  <Building2 />
                  <span>{condo.name}</span>
                  {condo.city ? (
                    <span className="ml-auto text-xs text-muted-foreground">{condo.city}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {query.trim().length >= 2 && documents.length > 0 ? (
            <CommandGroup heading="Documenti">
              {documents.map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/condomini/${doc.condominium_id}/documenti`);
                  }}
                >
                  <FileText />
                  <span>{doc.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
