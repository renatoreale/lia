# LIA — Legal Intelligent Assistant

SaaS multi-tenant per amministratori di condominio: automatizza la gestione
delle email e della documentazione condominiale con AI (RAG su documenti,
classificazione email, bozze di risposta), sempre con supervisione umana.

Stack: **Next.js (App Router) · Tailwind CSS · shadcn/ui · Supabase (Postgres,
Auth, Storage, Realtime, Edge Functions) · pgvector · OpenAI**.

## Stato del progetto

Il progetto è sviluppato in 4 fasi. Questa release copre la **Fase 3 —
Email AI**.

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Architettura, database Supabase, autenticazione, RLS, Storage, dashboard iniziale | ✅ Completata |
| 2 | Upload documenti, OCR, chunking, pgvector, ricerca semantica (RAG) | ✅ Completata |
| 3 | Integrazione Gmail/Outlook, classificazione email, bozze AI, flusso di approvazione | ✅ Completata |
| 4 | Apprendimento dalle correzioni, statistiche avanzate, notifiche realtime, ruoli avanzati | ⏳ Non ancora avviata |

Le pagine relative alle fasi future sono già presenti come route funzionanti
con uno stato "in arrivo" esplicito, così la navigazione e l'architettura
dell'app sono complete fin da ora.

## Architettura

- **Multi-tenant**: un `profile` (utente) può appartenere a più `companies`
  (l'account/studio dell'amministratore) tramite `company_members`, con
  ruolo `owner | administrator | collaborator | read_only`.
- Ogni `company` gestisce più `condominiums`. L'accesso ai singoli condomini
  può essere ulteriormente ristretto per utente tramite `condominium_members`
  (utile per limitare un Collaborator/Read Only a un sottoinsieme di edifici).
- Tutte le tabelle di dominio sono protette da **Row Level Security**: un
  utente vede solo i condomini a cui ha accesso, mai dati di altri tenant.
- Il **RAG** è progettato per non leggere mai tutti i documenti: i chunk sono
  indicizzati con embedding (`document_chunks.embedding`, `pgvector`), e la
  ricerca semantica passa per le funzioni `match_document_chunks` /
  `match_embeddings` (vedi `supabase/migrations/0012_rag_functions.sql`).

### Struttura delle cartelle

```
src/
  app/
    (auth)/            login, signup
    (dashboard)/        dashboard, condomini, documenti, ricerca, email,
                         email/[threadId], email/bozze, statistiche, utenti,
                         integrazioni, impostazioni
    api/
      team/invite/       invito utenti
      integrations/
        gmail/connect|callback/    OAuth Gmail
        outlook/connect|callback/  OAuth Outlook (Microsoft Graph)
      cron/sync-emails/   endpoint chiamato da Vercel Cron (vercel.json)
    auth/callback/      scambio codice OAuth/conferma email
  components/
    ui/                 componenti shadcn/ui (Base UI)
    layout/              sidebar, topbar, ricerca globale, notifiche
    condomini/, utenti/, dashboard/, documenti/, email/, integrazioni/, shared/
  lib/
    supabase/            client browser / server / admin / middleware
    ai/                  servizi AI: embedding, chunking, OCR, RAG (Fase 2)
    crypto/token-cipher.ts  cifratura AES-256-GCM dei token OAuth (Fase 3)
    email-providers/     invio risposte via Gmail/Graph REST (Fase 3)
    validators/          schemi zod
  services/               data access layer lato server (incl. email-service,
                           integration-service)
  types/database.types.ts tipi TypeScript dello schema Supabase
  hooks/, config/

supabase/
  migrations/            schema SQL, RLS, storage, funzioni RAG, seed (numerate)
  functions/
    _shared/               helper condivisi (cifratura, client admin, OpenAI,
                            Gmail/Graph REST, matching condominio)
    sync-gmail/, sync-outlook/    import email + allegati (Fase 3)
    classify-email/               categoria/urgenza/riassunto AI (Fase 3)
    generate-email-draft/         bozza di risposta RAG (Fase 3)
    process-document/, generate-embedding/, rag-query/  scaffolding Fase 2+
  seed/seed.ts            dati demo (idempotente)

docker/, Dockerfile, docker-compose.yml
```

### Database

Schema normalizzato con 22 tabelle (`profiles`, `companies`,
`company_members`, `condominiums`, `condominium_members`, `owners`,
`apartments`, `documents`, `document_chunks`, `embeddings`, `email_threads`,
`emails`, `email_attachments`, `email_drafts`, `knowledge`, `faqs`,
`ai_feedback`, `tasks`, `notifications`, `audit_logs`, `settings`,
`integrations`). Ogni tabella ha UUID, `created_at`/`updated_at`,
`created_by`, soft delete (`deleted_at`/`deleted_by`), indici, foreign key e
policy RLS dedicate. Dettagli e commenti nei singoli file di
`supabase/migrations/`.

## Setup

### 1. Progetto Supabase

Crea un progetto su [supabase.com](https://supabase.com), poi applica le
migrazioni in ordine. Due modi:

- **SQL Editor**: incolla il contenuto di ogni file in
  `supabase/migrations/*.sql` (in ordine numerico) nel SQL Editor del
  dashboard ed esegui.
- **Supabase CLI**: `supabase link --project-ref <ref>` seguito da
  `supabase db push`.

### 2. Variabili d'ambiente

```bash
cp .env.example .env.local
```

Compila con i valori da *Project Settings → API* del progetto Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pubbliche.
- `SUPABASE_SERVICE_ROLE_KEY` — segreta, solo server-side (inviti utenti,
  Edge Functions). Non esporla mai al client.
- `OPENAI_API_KEY` — usata a partire dalla Fase 2 (embedding, RAG, bozze).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID` /
  `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID`, `TOKEN_ENCRYPTION_KEY`,
  `CRON_SECRET` — Fase 3 (integrazioni email). Vedi la sezione dedicata
  qui sotto per come ottenerle: **"Fase 3 — Integrazioni email"**.

### 3. Installazione e avvio

```bash
npm install
npm run dev
```

App su [http://localhost:3000](http://localhost:3000). La prima
registrazione crea automaticamente l'account/studio (`companies`) e
l'utente diventa `owner`.

### 4. Dati demo (opzionale)

```bash
npm run db:seed
```

Crea (in modo idempotente) un utente demo, uno studio e due condomini con
FAQ e task di esempio:

```
email:    demo@lia.local
password: DemoPassword123!
```

### 5. Rigenerare i tipi TypeScript dallo schema reale

`src/types/database.types.ts` è scritto a mano per iniziare il progetto
senza dipendere da un client CLI. Una volta collegato il progetto Supabase:

```bash
npm run db:types
```

## Fase 3 — Integrazioni email

Ogni studio può collegare Gmail e/o Outlook a scelta (`/integrazioni`): il
sync, la classificazione AI e la generazione delle bozze girano come
Supabase Edge Functions (`supabase/functions/sync-gmail`, `sync-outlook`,
`classify-email`, `generate-email-draft`), invocate ogni 15 minuti da un
Vercel Cron job oppure a mano dal pulsante "Sincronizza ora". Le bozze non
vengono **mai** inviate automaticamente: restano in `/email/bozze` finché un
umano non le approva.

Per usarla in locale/produzione servono due app OAuth (una per Gmail, una
per Outlook) e una chiave di cifratura per i token. Nessuna delle due è
obbligatoria per il resto dell'app: senza credenziali, le card Gmail/Outlook
in Integrazioni restano semplicemente "Non connesso".

### 1. App OAuth Google (Gmail)

1. Crea (o riusa) un progetto su [Google Cloud Console](https://console.cloud.google.com).
2. **APIs & Services → Library**: abilita **Gmail API**.
3. **APIs & Services → OAuth consent screen**: tipo *External* (o *Internal*
   se workspace aziendale), aggiungi il tuo dominio/email come test user in
   fase di sviluppo.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   tipo *Web application*. In **Authorized redirect URIs** aggiungi, per
   ogni ambiente che userai:
   - `http://localhost:3000/api/integrations/gmail/callback` (sviluppo)
   - `https://<tuo-dominio>/api/integrations/gmail/callback` (produzione)
5. Copia **Client ID** e **Client secret** in `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

### 2. App OAuth Microsoft (Outlook)

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID → App
   registrations → New registration**. Come *Supported account types* scegli
   *Accounts in any organizational directory and personal Microsoft
   accounts* (o restringi al tuo tenant, impostando poi
   `MICROSOFT_TENANT_ID`).
2. **Redirect URI** (tipo *Web*):
   - `http://localhost:3000/api/integrations/outlook/callback`
   - `https://<tuo-dominio>/api/integrations/outlook/callback`
3. **Certificates & secrets → New client secret**: copia il valore subito
   (non sarà più visibile dopo).
4. **API permissions → Add a permission → Microsoft Graph → Delegated**:
   `Mail.Read`, `Mail.Send`, `offline_access`, `email`, `openid`.
5. Copia **Application (client) ID**, il client secret e (opzionale, se hai
   ristretto il tenant) il **Directory (tenant) ID** in
   `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` /
   `MICROSOFT_TENANT_ID`. Lasciando `MICROSOFT_TENANT_ID` vuoto viene usato
   `common` (account personali e aziendali di qualsiasi tenant).

### 3. Chiave di cifratura token e secret del cron

```bash
openssl rand -base64 32   # -> TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # -> CRON_SECRET
```

`TOKEN_ENCRYPTION_KEY` cifra `integrations.access_token_encrypted` /
`refresh_token_encrypted` (AES-256-GCM, vedi
`src/lib/crypto/token-cipher.ts`) prima che tocchino il database — la
tabella non contiene mai un token in chiaro. `CRON_SECRET` protegge
`/api/cron/sync-emails` da chiamate non autorizzate.

### 4. Configurare le Edge Functions

Le Edge Function girano su Supabase, non su Vercel: non leggono
`.env.local`. Vanno impostate come secret del progetto Supabase (stessi
nomi, stessi valori):

```bash
supabase secrets set \
  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
  MICROSOFT_CLIENT_ID=... MICROSOFT_CLIENT_SECRET=... MICROSOFT_TENANT_ID=... \
  TOKEN_ENCRYPTION_KEY=... OPENAI_API_KEY=...

supabase functions deploy sync-gmail sync-outlook classify-email generate-email-draft
```

(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sono già
disponibili automaticamente in ogni Edge Function: non impostarli a mano.)

### 5. Vercel Cron

`vercel.json` definisce già il job (`/api/cron/sync-emails` ogni 15 minuti).
Su Vercel, se `CRON_SECRET` è impostato tra le Environment Variables del
progetto, la piattaforma lo invia automaticamente come header
`Authorization: Bearer <CRON_SECRET>` alle chiamate cron — nessuna
configurazione aggiuntiva richiesta. In locale il job non parte da solo: usa
il pulsante "Sincronizza ora" in `/integrazioni`.

## Script disponibili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia il server di sviluppo (Turbopack) |
| `npm run build` | Build di produzione |
| `npm run start` | Avvia la build di produzione |
| `npm run lint` | ESLint |
| `npm run db:seed` | Popola dati demo (idempotente) |
| `npm run db:types` | Rigenera i tipi TS dallo schema Supabase collegato |

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Il `Dockerfile` è multi-stage e usa l'output `standalone` di Next.js per
un'immagine di produzione minimale. Le variabili `NEXT_PUBLIC_*` vengono
passate come build args (finiscono nel bundle client), le altre restano
runtime-only.

## Piano di deploy

1. **Supabase**: progetto di produzione separato da quello di sviluppo;
   applicare le migrazioni con lo stesso procedimento del setup locale.
2. **Vercel** (consigliato per Next.js):
   - collega il repository, imposta le env var (`NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
     `OPENAI_API_KEY`, e per la Fase 3 `GOOGLE_CLIENT_ID/SECRET`,
     `MICROSOFT_CLIENT_ID/SECRET/TENANT_ID`, `TOKEN_ENCRYPTION_KEY`,
     `CRON_SECRET` — vedi "Fase 3 — Integrazioni email") come Environment
     Variables del progetto;
   - build command e output sono rilevati automaticamente (Next.js);
   - `vercel.json` registra già il cron `/api/cron/sync-emails` (ogni 15
     minuti).
   - in alternativa, l'immagine Docker è pronta per qualunque piattaforma
     container (Cloud Run, ECS, Fly.io, ...) — in quel caso il cron va
     schedulato esternamente (es. `curl` con l'header `Authorization`
     corretto da un job di sistema).
3. **Storage**: i bucket (`documents`, `email-attachments`, `avatars`) e le
   relative policy sono creati dalla migrazione `0011_storage.sql`.
4. **Edge Functions**: `supabase functions deploy sync-gmail sync-outlook
   classify-email generate-email-draft` (Fase 3, richiede prima i secret —
   vedi "Fase 3 — Integrazioni email"). Le cartelle `process-document/`,
   `generate-embedding/`, `rag-query/` restano scaffolding vuoto: la
   pipeline RAG della Fase 2 gira lato Next.js (`src/lib/ai/`), non come
   Edge Function.
5. **Backup**: Point-in-Time Recovery di Supabase (piano Pro+) per il
   database; versioning nativo dello Storage bucket per i documenti.

## Sicurezza

- **Row Level Security** su tutte le tabelle di dominio; nessun accesso
  cross-tenant.
- **JWT** Supabase Auth con refresh gestito da `@supabase/ssr` nel
  `proxy.ts` (Next.js 16 — l'ex `middleware.ts`).
- **Storage Policy** allineate alle stesse regole di accesso per
  condominio.
- **Audit log** (`audit_logs`) su condomini, documenti, bozze email,
  membri e integrazioni — senza foreign key verso le entità tracciate, per
  poter registrare anche le cancellazioni.
- Le chiavi `service_role`/OpenAI restano sempre server-side.
- **Token OAuth Gmail/Outlook** cifrati AES-256-GCM prima di essere salvati
  in `integrations` (mai in chiaro nel database, vedi
  `src/lib/crypto/token-cipher.ts`). Le Edge Function di pipeline
  (`classify-email`, `generate-email-draft`) accettano solo chiamate con la
  service-role key; `sync-gmail`/`sync-outlook` accettano anche un utente
  autenticato, ma solo se `is_company_admin`/proprietario dell'integrazione
  (vedi `supabase/functions/_shared/authorize-integration.ts`).

## Note tecniche

- **UI kit**: i componenti `src/components/ui/*` sono generati da
  shadcn/ui su **Base UI** (non Radix) — le API di composizione usano la
  prop `render` invece di `asChild`.
- **RLS + `RETURNING`**: le policy `SELECT` usate per il progetto evitano
  di dipendere da funzioni `STABLE` che interrogano la stessa tabella
  protetta o righe create da trigger `AFTER INSERT` nella stessa
  transazione — altrimenti `INSERT ... RETURNING` può fallire in modo
  intermittente. Vedi i commenti nelle migrazioni `0016`–`0019`.
