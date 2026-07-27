import { z } from "zod";

export const condominiumSchema = z.object({
  name: z.string().min(2, "Inserisci il nome del condominio"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  postal_code: z.string().optional().or(z.literal("")),
  province: z
    .string()
    .max(2, "Usa la sigla della provincia (es. MI)")
    .optional()
    .or(z.literal("")),
  fiscal_code: z.string().optional().or(z.literal("")),
  administrator_name: z.string().optional().or(z.literal("")),
  administrator_email: z
    .string()
    .email("Email non valida")
    .optional()
    .or(z.literal("")),
  administrator_phone: z.string().optional().or(z.literal("")),
  units_count: z.number().int().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
});

export type CondominiumInput = z.infer<typeof condominiumSchema>;
