# LIA — Legal Intelligent Assistant

SaaS multi-tenant per amministratori di condominio: automatizza la gestione
delle email e della documentazione condominiale con AI (RAG su documenti,
classificazione email, bozze di risposta), sempre con supervisione umana.

Stack: **Next.js (App Router) · Tailwind CSS · shadcn/ui · Supabase (Postgres,
Auth, Storage, Realtime, Edge Functions) · pgvector · OpenAI**.

## Stato del progetto

Il progetto è sviluppato in 4 fasi. Questa release copre la **Fase 1 —
Fondamenta**.

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Architettura, database Supabase, autenticazione, RLS, Storage, dashboard iniziale | ✅ Completata |
| 2 | Upload documenti, OCR, chunking, pgvector, ricerca semantica (RAG) | ⏳ Non ancora avviata |
| 3 | Integrazione Gmail/Outlook, classificazione email, bozze AI, flusso di approvazione | ⏳ Non ancora avviata |
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
                         bozze, statistiche, utenti, integrazioni, impostazioni
    api/                route handler (es. inviti utenti)
    auth/callback/      scambio codice OAuth/conferma email
  components/
    ui/                 componenti shadcn/ui (Base UI)
    layout/              sidebar, topbar, ricerca globale, notifiche
    condomini/, utenti/, dashboard/, shared/
  lib/
    supabase/            client browser / server / admin / middleware
    ai/                  servizi AI (Fase 2+)
    validators/          schemi zod
  services/               data access layer lato server
  types/database.types.ts tipi TypeScript dello schema Supabase
  hooks/, config/

supabase/
  migrations/            schema SQL, RLS, storage, funzioni RAG, seed (numerate)
  functions/              Edge Functions (scaffolding per la Fase 2/3)
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
     `OPENAI_API_KEY`) come Environment Variables del progetto;
   - build command e output sono rilevati automaticamente (Next.js).
   - in alternativa, l'immagine Docker è pronta per qualunque piattaforma
     container (Cloud Run, ECS, Fly.io, ...).
3. **Storage**: i bucket (`documents`, `email-attachments`, `avatars`) e le
   relative policy sono creati dalla migrazione `0011_storage.sql`.
4. **Edge Functions** (Fase 2/3): `supabase functions deploy <nome>` per
   OCR, generazione embedding, classificazione email, sync Gmail/Outlook.
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

## Note tecniche

- **UI kit**: i componenti `src/components/ui/*` sono generati da
  shadcn/ui su **Base UI** (non Radix) — le API di composizione usano la
  prop `render` invece di `asChild`.
- **RLS + `RETURNING`**: le policy `SELECT` usate per il progetto evitano
  di dipendere da funzioni `STABLE` che interrogano la stessa tabella
  protetta o righe create da trigger `AFTER INSERT` nella stessa
  transazione — altrimenti `INSERT ... RETURNING` può fallire in modo
  intermittente. Vedi i commenti nelle migrazioni `0016`–`0019`.
