// Supabase Edge Function: classify-email
// Internal pipeline step invoked by sync-gmail/sync-outlook right after a
// new inbound email is matched to a condominio. Uses OpenAI structured
// output to fill category/urgency/ai_summary/ai_confidence, then kicks off
// generate-email-draft when the message looks like it needs a reply.

import { createAdminClient } from "../_shared/supabase-admin.ts";
import { requireServiceRole } from "../_shared/require-service-role.ts";
import { CHAT_MODEL, getOpenAIClient } from "../_shared/openai.ts";
import { stripHtml } from "../_shared/strip-html.ts";

const CATEGORIES = ["amministrativo", "manutenzione", "morosita", "reclamo", "informazioni", "altro"] as const;
const URGENCIES = ["low", "medium", "high", "critical"] as const;

Deno.serve(async (req) => {
  const admin = createAdminClient();

  try {
    requireServiceRole(req);
    const { email_id } = (await req.json()) as { email_id: string };
    if (!email_id) throw new Error("email_id mancante.");

    const { data: email, error: fetchError } = await admin
      .from("emails")
      .select("id, subject, body_text, body_html, from_address, condominium_id")
      .eq("id", email_id)
      .single();

    if (fetchError || !email) throw new Error("Email non trovata.");

    const content = email.body_text || (email.body_html ? stripHtml(email.body_html) : "") || email.subject || "";

    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_classification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              category: { type: "string", enum: CATEGORIES as unknown as string[] },
              urgency: { type: "string", enum: URGENCIES as unknown as string[] },
              summary: { type: "string", description: "Riassunto in italiano, massimo 2 frasi." },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              needs_reply: { type: "boolean" },
            },
            required: ["category", "urgency", "summary", "confidence", "needs_reply"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Sei l'assistente AI di un amministratore di condominio italiano. Classifica le email in " +
            "arrivo: categoria (amministrativo, manutenzione, morosita, reclamo, informazioni, altro), " +
            "urgenza (low/medium/high/critical -- critical solo per emergenze reali come allagamenti, " +
            "guasti pericolosi, incidenti), un riassunto conciso in italiano, un punteggio di confidenza " +
            "0-1 sulla classificazione, e se il messaggio richiede una risposta scritta (needs_reply=false " +
            "per notifiche automatiche, newsletter, conferme di lettura, ecc.).",
        },
        {
          role: "user",
          content: `Mittente: ${email.from_address}\nOggetto: ${email.subject ?? "(nessun oggetto)"}\n\n${content.slice(0, 6000)}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("Nessuna risposta dal modello.");
    const parsed = JSON.parse(raw) as {
      category: (typeof CATEGORIES)[number];
      urgency: (typeof URGENCIES)[number];
      summary: string;
      confidence: number;
      needs_reply: boolean;
    };

    const status = parsed.urgency === "high" || parsed.urgency === "critical" ? "urgent" : "to_review";

    await admin
      .from("emails")
      .update({
        category: parsed.category,
        urgency: parsed.urgency,
        ai_summary: parsed.summary,
        ai_confidence: parsed.confidence,
        status,
      })
      .eq("id", email_id);

    if (parsed.needs_reply && email.condominium_id) {
      await admin.functions.invoke("generate-email-draft", { body: { email_id } });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
});
