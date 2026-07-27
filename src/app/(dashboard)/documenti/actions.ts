"use server";

import { revalidatePath } from "next/cache";

import { processDocument } from "@/lib/ai/document-processing";
import { uploadDocumentSchema } from "@/lib/validators/document";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Devi effettuare l'accesso.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Seleziona un file.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Per ora è supportato solo il caricamento di file PDF.");
  }

  const parsed = uploadDocumentSchema.parse({
    condominiumId: formData.get("condominiumId"),
    title: formData.get("title"),
    category: formData.get("category"),
    description: formData.get("description") ?? "",
  });

  const documentId = crypto.randomUUID();
  const safeFilename = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${parsed.condominiumId}/${documentId}/${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    throw new Error(`Caricamento fallito: ${uploadError.message}`);
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      condominium_id: parsed.condominiumId,
      category: parsed.category,
      title: parsed.title,
      description: parsed.description || null,
      storage_bucket: "documents",
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      status: "uploaded",
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (insertError || !document) {
    await supabase.storage.from("documents").remove([storagePath]);
    throw new Error(`Impossibile registrare il documento: ${insertError?.message}`);
  }

  revalidatePath(`/condomini/${parsed.condominiumId}`);
  revalidatePath("/documenti");

  try {
    const result = await processDocument(documentId);
    revalidatePath(`/condomini/${parsed.condominiumId}`);
    revalidatePath("/documenti");
    return { document, ...result, ok: true as const };
  } catch (error) {
    revalidatePath(`/condomini/${parsed.condominiumId}`);
    revalidatePath("/documenti");
    return {
      document,
      ok: false as const,
      error: error instanceof Error ? error.message : "Elaborazione fallita.",
    };
  }
}

export async function deleteDocument(documentId: string, condominiumId: string) {
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path")
    .eq("id", documentId)
    .single();

  const deletedAt = new Date().toISOString();

  const { error } = await supabase.from("documents").update({ deleted_at: deletedAt }).eq("id", documentId);
  if (error) throw new Error(error.message);

  // document_chunks/embeddings have no client-facing write policy (they're
  // only ever written by the ingestion pipeline) -- the RLS-gated update
  // above already proved the caller may write this document, so it's safe
  // to use the admin client for this cascade cleanup.
  const admin = createAdminClient();
  await admin.from("document_chunks").update({ deleted_at: deletedAt }).eq("document_id", documentId);
  await admin
    .from("embeddings")
    .update({ deleted_at: deletedAt })
    .eq("source_type", "document_chunk")
    .contains("metadata", { document_id: documentId });

  if (document) {
    await supabase.storage.from(document.storage_bucket).remove([document.storage_path]);
  }

  revalidatePath(`/condomini/${condominiumId}`);
  revalidatePath("/documenti");
}
