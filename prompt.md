Agisci come un Senior Software Architect, UX Designer, Backend Engineer e AI Engineer.

Devi progettare e sviluppare una SaaS moderna chiamata

"LIA - Legal Intelligent Assistant"

destinata agli amministratori di condominio.

L'obiettivo dell'applicazione è automatizzare la gestione delle email dei condomini utilizzando l'intelligenza artificiale e tutta la documentazione del condominio.

La piattaforma deve essere scalabile, multi-tenant e costruita utilizzando:

Frontend
- React
- Next.js
- Tailwind CSS
- shadcn/ui

Backend

- Supabase

Utilizzare:

- Authentication
- PostgreSQL
- Storage
- Edge Functions
- Realtime
- Row Level Security (RLS)

AI

- OpenAI GPT-5.5
- Embedding
- Retrieval Augmented Generation (RAG)

Vector Database

- pgvector su PostgreSQL

OCR

- OCR automatico dei PDF scansionati

Email

- Gmail API
- Microsoft Graph

L'applicazione deve essere progettata come un SaaS professionale.

---------------------------------------------------
ARCHITETTURA
---------------------------------------------------

Ogni amministratore possiede un account.

Ogni account può gestire molti condomini.

Ogni condominio contiene:

• informazioni generali

• indirizzo

• codice fiscale

• amministratore

• regolamento

• tabelle millesimali

• verbali

• delibere

• bilanci

• preventivi

• consuntivi

• contratti

• assicurazioni

• pratiche legali

• documentazione varia

• FAQ

• email ricevute

• email inviate

• memoria AI

---------------------------------------------------
DATABASE SUPABASE
---------------------------------------------------

Progettare un database normalizzato.

Creare almeno le seguenti tabelle.

users

profiles

companies

condominiums

owners

apartments

documents

document_chunks

embeddings

emails

email_threads

email_drafts

knowledge

faqs

tasks

notifications

audit_logs

settings

integrations

ai_feedback

Ogni tabella deve avere:

UUID

created_at

updated_at

created_by

soft delete

indici

foreign key

RLS

---------------------------------------------------
DOCUMENT MANAGEMENT
---------------------------------------------------

Ogni documento caricato deve essere:

salvato nello Storage Supabase

estratto

OCR se necessario

convertito in testo

suddiviso in chunk

indicizzato con embedding

salvato nella tabella document_chunks

Ogni chunk deve contenere:

document_id

pagina

testo

embedding

categoria

condominio

---------------------------------------------------
RAG
---------------------------------------------------

Quando arriva una domanda il sistema NON deve leggere tutti i PDF.

Il sistema deve:

creare embedding della domanda

ricercare i chunk più simili

recuperare solo quei chunk

costruire il prompt

generare la risposta

citare sempre i documenti utilizzati.

La risposta deve contenere:

livello di confidenza

documenti consultati

citazioni

articoli del regolamento

verbali utilizzati

delibere utilizzate

Se la confidenza è bassa:

non inventare

chiedere chiarimenti

---------------------------------------------------
EMAIL
---------------------------------------------------

L'app deve collegarsi a Gmail e Outlook.

Le email vengono sincronizzate automaticamente.

Per ogni email:

identificare il condominio

classificare l'argomento

valutare urgenza

estrarre eventuali allegati

associare al thread corretto

creare una risposta

NON inviare automaticamente.

Mostrare una dashboard con:

Da approvare

Urgenti

In attesa

Bozze

Inviate

---------------------------------------------------
AI LEARNING
---------------------------------------------------

Quando l'amministratore modifica una risposta:

salvare

versione AI

versione finale

differenze

motivazione

In futuro utilizzare queste informazioni per migliorare le risposte.

La memoria deve essere specifica per ogni condominio.

---------------------------------------------------
DASHBOARD
---------------------------------------------------

Creare una dashboard professionale.

Mostrare:

Email ricevute

Email evase

Tempo risparmiato

Richieste più frequenti

Condomini

Attività AI

Livello medio di confidenza

Grafici moderni.

---------------------------------------------------
RICERCA
---------------------------------------------------

Implementare una ricerca globale.

Esempi:

"verbali ascensore"

"bilancio 2024"

"delibera tetto"

"spese riscaldamento"

La ricerca deve utilizzare pgvector.

---------------------------------------------------
PERMESSI
---------------------------------------------------

Ruoli:

Owner

Administrator

Collaborator

Read Only

Applicare RLS in Supabase.

Ogni utente vede solo i propri condomini.

---------------------------------------------------
NOTIFICHE
---------------------------------------------------

Realtime tramite Supabase.

Nuove email

Nuovi documenti

Richieste AI

Documenti mancanti

---------------------------------------------------
SICUREZZA
---------------------------------------------------

Applicare:

Row Level Security

JWT

Storage Policy

Audit Log

Versioning documenti

Backup

---------------------------------------------------
UX
---------------------------------------------------

Tema moderno.

Responsive.

Sidebar sinistra.

Dashboard centrale.

Ricerca globale.

Dark mode.

Design simile a Linear, Notion e Vercel.

---------------------------------------------------
PAGINE
---------------------------------------------------

Login

Dashboard

Condomini

Dettaglio condominio

Documenti

Ricerca AI

Email

Bozze

Statistiche

Impostazioni

Utenti

Integrazioni

---------------------------------------------------
OBIETTIVO DELL'AI
---------------------------------------------------

L'assistente deve comportarsi come un amministratore di condominio esperto.

Non deve mai inventare informazioni.

Ogni risposta deve essere supportata dai documenti caricati.

Se non trova dati sufficienti deve dichiararlo esplicitamente.

---------------------------------------------------
OUTPUT RICHIESTO
---------------------------------------------------

Genera l'intero progetto includendo:

- Architettura completa
- Struttura delle cartelle
- Schema SQL di Supabase
- Migrazioni
- Politiche RLS
- Schema Storage
- Edge Functions
- API
- Componenti React
- Hook
- Servizi AI
- Workflow email
- Workflow RAG
- Dashboard
- UI professionale
- Seed database
- Piano di deploy
- Docker
- Configurazione ambiente
- README completo

Il codice deve essere pronto per la produzione, modulare, sicuro, scalabile e facilmente estendibile.

sviluppa il progetto in 4 fasi:
Fondamenta: architettura, database Supabase, autenticazione, RLS, Storage e dashboard iniziale.
Gestione documentale e RAG: upload documenti, OCR, chunking, pgvector e ricerca semantica.
Email AI: integrazione Gmail/Outlook, classificazione, generazione bozze e flusso di approvazione.
Funzionalità avanzate: apprendimento dalle correzioni, statistiche, notifiche realtime, ruoli avanzati e ottimizzazioni.