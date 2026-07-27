"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadDocument } from "@/app/(dashboard)/documenti/actions";
import { documentCategories, documentCategoryLabels } from "@/lib/validators/document";
import type { DocumentCategory } from "@/types/database.types";

export function UploadDocumentDialog({ condominiumId }: { condominiumId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("documentazione_varia");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setCategory("documentazione_varia");
    setDescription("");
    setFileName(null);
    setError(null);
    setStatusMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Seleziona un file PDF.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Per ora è supportato solo il caricamento di file PDF.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Caricamento in corso…");

    try {
      const formData = new FormData();
      formData.set("condominiumId", condominiumId);
      formData.set("title", title || file.name.replace(/\.pdf$/i, ""));
      formData.set("category", category);
      formData.set("description", description);
      formData.set("file", file);

      setStatusMessage("Estrazione testo, OCR ed embedding in corso… può richiedere qualche secondo.");
      const result = await uploadDocument(formData);

      if (result.ok) {
        toast.success(`Documento indicizzato: ${result.chunkCount} sezioni create.`);
      } else {
        toast.error(`Documento caricato ma l'elaborazione è fallita: ${result.error}`);
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Si è verificato un errore.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) {
          setOpen(next);
          if (!next) resetForm();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Upload /> Carica documento
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-file">File PDF</Label>
            <Input
              id="doc-file"
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileName(file?.name ?? null);
                if (file && !title) setTitle(file.name.replace(/\.pdf$/i, ""));
              }}
            />
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-title">Titolo</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona una categoria" />
              </SelectTrigger>
              <SelectContent>
                {documentCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {documentCategoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-description">Descrizione (opzionale)</Label>
            <Textarea
              id="doc-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Carica e indicizza
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
