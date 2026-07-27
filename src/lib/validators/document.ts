import { z } from "zod";

export const documentCategories = [
  "anagrafica",
  "regolamento",
  "tabella_millesimale",
  "verbale",
  "delibera",
  "bilancio",
  "preventivo",
  "consuntivo",
  "contratto",
  "assicurazione",
  "pratica_legale",
  "documentazione_varia",
] as const;

export const documentCategoryLabels: Record<(typeof documentCategories)[number], string> = {
  anagrafica: "Anagrafica",
  regolamento: "Regolamento",
  tabella_millesimale: "Tabella millesimale",
  verbale: "Verbale",
  delibera: "Delibera",
  bilancio: "Bilancio",
  preventivo: "Preventivo",
  consuntivo: "Consuntivo",
  contratto: "Contratto",
  assicurazione: "Assicurazione",
  pratica_legale: "Pratica legale",
  documentazione_varia: "Documentazione varia",
};

export const uploadDocumentSchema = z.object({
  condominiumId: z.string().uuid(),
  title: z.string().min(2, "Inserisci un titolo"),
  category: z.enum(documentCategories),
  description: z.string().optional().or(z.literal("")),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
