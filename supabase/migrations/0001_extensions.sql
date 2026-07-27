-- =====================================================================
-- 0001_extensions.sql
-- LIA - Legal Intelligent Assistant
-- Enables required Postgres extensions.
-- =====================================================================

-- UUID generation
create extension if not exists "pgcrypto" with schema extensions;

-- Vector similarity search (RAG / semantic search)
create extension if not exists "vector" with schema extensions;

-- Trigram search, used as a fallback for fuzzy text search in the global search bar
create extension if not exists "pg_trgm" with schema extensions;

-- Scheduled jobs (email sync polling, cleanup of soft-deleted rows, etc.)
create extension if not exists "pg_cron" with schema extensions;
