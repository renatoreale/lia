import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().min(1, "Inserisci un'email").email("Email non valida"),
  role: z.enum(["administrator", "collaborator", "read_only"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  administrator: "Administrator",
  collaborator: "Collaborator",
  read_only: "Read Only",
};
