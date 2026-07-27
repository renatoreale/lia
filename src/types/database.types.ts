/**
 * Hand-authored Supabase database types matching supabase/migrations/*.
 *
 * Once the project is linked to a real Supabase instance, regenerate
 * this file from the live schema instead of maintaining it by hand:
 *
 *   npm run db:types
 *   (wraps: supabase gen types typescript --linked > src/types/database.types.ts)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "owner" | "administrator" | "collaborator" | "read_only";

export type DocumentCategory =
  | "anagrafica"
  | "regolamento"
  | "tabella_millesimale"
  | "verbale"
  | "delibera"
  | "bilancio"
  | "preventivo"
  | "consuntivo"
  | "contratto"
  | "assicurazione"
  | "pratica_legale"
  | "documentazione_varia";

export type DocumentStatus =
  | "uploaded"
  | "extracting"
  | "ocr_processing"
  | "chunking"
  | "embedding"
  | "indexed"
  | "failed";

export type EmailProvider = "gmail" | "outlook";
export type EmailDirection = "inbound" | "outbound";
export type EmailUrgency = "low" | "medium" | "high" | "critical";
export type EmailStatus = "to_review" | "urgent" | "pending" | "draft" | "sent" | "archived";
export type DraftStatus = "pending_review" | "approved" | "sent" | "discarded";
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type NotificationType =
  | "new_email"
  | "new_document"
  | "ai_request"
  | "missing_document"
  | "task_assigned"
  | "system";
export type IntegrationProvider = "gmail" | "outlook" | "openai";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "expired";
export type EmbeddingSourceType = "document_chunk" | "knowledge" | "faq" | "email";

type AuditColumns = {
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

/** Utility: build Insert/Update variants from a Row type. */
/** Columns whose Row type includes `null` are optional on insert (they default to NULL). */
type NullableKeys<Row> = { [K in keyof Row]: null extends Row[K] ? K : never }[keyof Row];
type InsertOf<Row, Optional extends keyof Row> = Omit<Row, Optional | NullableKeys<Row>> &
  Partial<Pick<Row, Optional | NullableKeys<Row>>>;
type UpdateOf<Row> = Partial<Row>;

export type ProfileRow = AuditColumns & {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  onboarded_at: string | null;
};

export type CompanyRow = AuditColumns & {
  id: string;
  name: string;
  vat_number: string | null;
  fiscal_code: string | null;
  billing_email: string | null;
  address: string | null;
  plan: string;
  owner_id: string;
};

export type CompanyMemberRow = AuditColumns & {
  id: string;
  company_id: string;
  user_id: string;
  role: AppRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type CondominiumRow = AuditColumns & {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  fiscal_code: string | null;
  administrator_name: string | null;
  administrator_email: string | null;
  administrator_phone: string | null;
  units_count: number | null;
  cadastral_data: Json;
  notes: string | null;
  is_active: boolean;
};

export type CondominiumMemberRow = AuditColumns & {
  id: string;
  condominium_id: string;
  user_id: string;
  role: AppRole;
};

export type OwnerRow = AuditColumns & {
  id: string;
  condominium_id: string;
  first_name: string;
  last_name: string;
  fiscal_code: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type ApartmentRow = AuditColumns & {
  id: string;
  condominium_id: string;
  owner_id: string | null;
  interno: string | null;
  floor: string | null;
  category: string | null;
  square_meters: number | null;
  millesimi: number | null;
  cadastral_reference: string | null;
  notes: string | null;
};

export type DocumentRow = AuditColumns & {
  id: string;
  condominium_id: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  page_count: number | null;
  requires_ocr: boolean;
  status: DocumentStatus;
  processing_error: string | null;
  document_date: string | null;
  version: number;
  replaces_document_id: string | null;
  uploaded_by: string | null;
};

export type DocumentChunkRow = AuditColumns & {
  id: string;
  document_id: string;
  condominium_id: string;
  category: DocumentCategory;
  page_number: number | null;
  chunk_index: number;
  content: string;
  token_count: number | null;
  embedding: number[] | null;
};

export type EmbeddingRow = AuditColumns & {
  id: string;
  source_type: EmbeddingSourceType;
  source_id: string;
  condominium_id: string | null;
  content: string;
  embedding: number[];
  metadata: Json;
};

export type EmailThreadRow = AuditColumns & {
  id: string;
  condominium_id: string | null;
  provider: EmailProvider;
  external_thread_id: string;
  integration_id: string | null;
  subject: string | null;
  participants: Json;
  message_count: number;
  last_message_at: string | null;
  is_unclassified: boolean;
};

export type EmailRow = AuditColumns & {
  id: string;
  thread_id: string | null;
  condominium_id: string | null;
  provider: EmailProvider;
  external_message_id: string;
  direction: EmailDirection;
  from_address: string;
  to_addresses: Json;
  cc_addresses: Json;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  category: string | null;
  urgency: EmailUrgency;
  status: EmailStatus;
  ai_summary: string | null;
  ai_confidence: number | null;
  has_attachments: boolean;
  received_at: string | null;
  sent_at: string | null;
};

export type EmailAttachmentRow = AuditColumns & {
  id: string;
  email_id: string;
  document_id: string | null;
  filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
};

export type EmailDraftRow = AuditColumns & {
  id: string;
  email_id: string | null;
  thread_id: string | null;
  condominium_id: string | null;
  ai_content: string;
  final_content: string | null;
  status: DraftStatus;
  ai_confidence: number | null;
  citations: Json;
  model: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
};

export type KnowledgeRow = AuditColumns & {
  id: string;
  condominium_id: string;
  title: string;
  content: string;
  category: DocumentCategory | null;
  source_document_id: string | null;
  source_email_id: string | null;
  tags: string[];
  confidence: number;
};

export type FaqRow = AuditColumns & {
  id: string;
  condominium_id: string | null;
  company_id: string | null;
  question: string;
  answer: string;
  category: string | null;
  usage_count: number;
  is_published: boolean;
};

export type AiFeedbackRow = AuditColumns & {
  id: string;
  condominium_id: string | null;
  email_draft_id: string | null;
  source_type: string;
  ai_content: string;
  final_content: string;
  diff: Json | null;
  reason: string | null;
  rating: number | null;
  applied_to_knowledge: boolean;
};

export type TaskRow = AuditColumns & {
  id: string;
  condominium_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  related_email_id: string | null;
  related_document_id: string | null;
  completed_at: string | null;
};

export type NotificationRow = AuditColumns & {
  id: string;
  user_id: string;
  company_id: string | null;
  condominium_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
};

export type AuditLogRow = AuditColumns & {
  id: string;
  company_id: string | null;
  condominium_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
};

export type SettingRow = AuditColumns & {
  id: string;
  company_id: string;
  condominium_id: string | null;
  key: string;
  value: Json;
};

export type IntegrationRow = AuditColumns & {
  id: string;
  company_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  external_account_email: string | null;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  scopes: string[];
  last_synced_at: string | null;
  last_error: string | null;
  metadata: Json;
};

type Table<Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: InsertOf<Row, Optional>;
  Update: UpdateOf<Row>;
  Relationships: [];
};

type AuditOptional = keyof AuditColumns | "id";

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, AuditOptional>;
      companies: Table<CompanyRow, AuditOptional | "plan">;
      company_members: Table<CompanyMemberRow, AuditOptional | "invited_at" | "accepted_at">;
      condominiums: Table<CondominiumRow, AuditOptional | "cadastral_data" | "is_active">;
      condominium_members: Table<CondominiumMemberRow, AuditOptional>;
      owners: Table<OwnerRow, AuditOptional>;
      apartments: Table<ApartmentRow, AuditOptional>;
      documents: Table<DocumentRow, AuditOptional | "status" | "version" | "requires_ocr">;
      document_chunks: Table<DocumentChunkRow, AuditOptional>;
      embeddings: Table<EmbeddingRow, AuditOptional>;
      email_threads: Table<EmailThreadRow, AuditOptional | "participants" | "message_count" | "is_unclassified">;
      emails: Table<EmailRow, AuditOptional | "to_addresses" | "cc_addresses" | "urgency" | "status" | "has_attachments">;
      email_attachments: Table<EmailAttachmentRow, AuditOptional>;
      email_drafts: Table<EmailDraftRow, AuditOptional | "status" | "citations">;
      knowledge: Table<KnowledgeRow, AuditOptional | "tags" | "confidence">;
      faqs: Table<FaqRow, AuditOptional | "usage_count" | "is_published">;
      ai_feedback: Table<AiFeedbackRow, AuditOptional | "applied_to_knowledge">;
      tasks: Table<TaskRow, AuditOptional | "status" | "priority">;
      notifications: Table<NotificationRow, AuditOptional>;
      audit_logs: Table<AuditLogRow, AuditOptional>;
      settings: Table<SettingRow, AuditOptional | "value">;
      integrations: Table<IntegrationRow, AuditOptional | "status" | "scopes" | "metadata">;
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Functions: {
      is_company_admin: {
        Args: { p_company_id: string };
        Returns: boolean;
      };
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          p_condominium_id: string;
          match_count?: number;
          match_threshold?: number;
          p_category?: DocumentCategory | null;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          document_title: string;
          category: DocumentCategory;
          page_number: number | null;
          content: string;
          similarity: number;
        }[];
      };
      match_embeddings: {
        Args: {
          query_embedding: number[];
          p_condominium_id?: string | null;
          match_count?: number;
          match_threshold?: number;
          p_source_types?: EmbeddingSourceType[] | null;
        };
        Returns: {
          source_type: EmbeddingSourceType;
          source_id: string;
          condominium_id: string | null;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
    };
  };
}
