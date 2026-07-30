import { z } from "zod";

export const ownerSchema = z.object({
  first_name: z.string().min(1, "Inserisci il nome"),
  last_name: z.string().min(1, "Inserisci il cognome"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  fiscal_code: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
