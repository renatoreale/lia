import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Inserisci la tua email").email("Email non valida"),
  password: z.string().min(1, "Inserisci la password"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Inserisci nome e cognome"),
    companyName: z.string().min(2, "Inserisci il nome dello studio/azienda"),
    email: z.string().min(1, "Inserisci la tua email").email("Email non valida"),
    password: z.string().min(8, "Almeno 8 caratteri"),
    confirmPassword: z.string().min(8, "Almeno 8 caratteri"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
