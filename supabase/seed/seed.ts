/**
 * Demo data seed for local exploration / screenshots.
 *
 * Uses the service-role key to bypass RLS entirely, so it can freely
 * create a demo user, company, condomini and related records without
 * going through the normal signup flow.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local (never run this against a production project).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "demo@lia.local";
const DEMO_PASSWORD = "DemoPassword123!";

async function getOrCreateDemoUser() {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === DEMO_EMAIL);
  if (found) return found;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Amministratore Demo" },
  });

  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return data.user;
}

async function main() {
  console.log("Seeding demo data...");

  const user = await getOrCreateDemoUser();
  console.log(`Demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (id: ${user.id})`);

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  let companyId = existingCompany?.id;
  if (!companyId) {
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({ name: "Studio Demo Amministrazioni", owner_id: user.id, plan: "trial" })
      .select("id")
      .single();
    if (companyError || !newCompany) {
      throw new Error(`Could not create the demo company: ${companyError?.message}`);
    }
    companyId = newCompany.id;
  }

  await supabase
    .from("company_members")
    .upsert(
      { company_id: companyId, user_id: user.id, role: "owner", accepted_at: new Date().toISOString() },
      { onConflict: "company_id,user_id" },
    );

  console.log(`Company: Studio Demo Amministrazioni (id: ${companyId})`);

  const condominiumsSeed = [
    {
      name: "Condominio Via Roma 12",
      address: "Via Roma 12",
      city: "Milano",
      province: "MI",
      postal_code: "20100",
      fiscal_code: "97123450158",
      administrator_name: "Amministratore Demo",
      administrator_email: DEMO_EMAIL,
      units_count: 12,
    },
    {
      name: "Residenza Parco Nord",
      address: "Via delle Betulle 4",
      city: "Milano",
      province: "MI",
      postal_code: "20128",
      fiscal_code: "97123450257",
      administrator_name: "Amministratore Demo",
      administrator_email: DEMO_EMAIL,
      units_count: 24,
    },
  ];

  for (const condo of condominiumsSeed) {
    const { data: existing } = await supabase
      .from("condominiums")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", condo.name)
      .maybeSingle();

    const condominiumId =
      existing?.id ??
      (
        await supabase
          .from("condominiums")
          .insert({ ...condo, company_id: companyId })
          .select("id")
          .single()
      ).data?.id;

    if (!condominiumId) continue;
    console.log(`Condominium: ${condo.name} (id: ${condominiumId})`);

    const faqsSeed = [
      {
        condominium_id: condominiumId,
        question: "Come si calcolano le spese condominiali?",
        answer:
          "Le spese vengono ripartite in base ai millesimi di proprietà indicati nella tabella millesimale, salvo diverso criterio previsto dal regolamento.",
        category: "spese",
      },
      {
        condominium_id: condominiumId,
        question: "Quando si tiene l'assemblea di condominio?",
        answer:
          "L'assemblea ordinaria si tiene almeno una volta l'anno per l'approvazione del bilancio consuntivo e preventivo.",
        category: "assemblea",
      },
    ];

    for (const faq of faqsSeed) {
      const { data: existingFaq } = await supabase
        .from("faqs")
        .select("id")
        .eq("condominium_id", condominiumId)
        .eq("question", faq.question)
        .maybeSingle();

      if (!existingFaq) {
        await supabase.from("faqs").insert(faq);
      }
    }

    const { data: existingTask } = await supabase
      .from("tasks")
      .select("id")
      .eq("condominium_id", condominiumId)
      .eq("title", "Caricare il regolamento condominiale")
      .maybeSingle();

    if (!existingTask) {
      await supabase.from("tasks").insert({
        condominium_id: condominiumId,
        title: "Caricare il regolamento condominiale",
        description: "Aggiungere la versione aggiornata del regolamento in Documenti.",
        status: "todo",
        priority: "medium",
      });
    }
  }

  console.log("\nDone. Log in with:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
