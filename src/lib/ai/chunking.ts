/**
 * Splits page text into overlapping chunks for embedding.
 *
 * Chunk size is expressed in characters rather than tokens (~4 chars
 * per token for Italian/English) to avoid a tokenizer dependency --
 * precise enough for chunk sizing, not used for billing.
 */

const CHUNK_SIZE_CHARS = 3200; // ~800 tokens
const CHUNK_OVERLAP_CHARS = 320; // ~80 tokens

export interface TextChunk {
  content: string;
  index: number;
}

export function chunkText(text: string, startIndex = 0): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= CHUNK_SIZE_CHARS) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = paragraph.length <= CHUNK_SIZE_CHARS ? paragraph : "";
    }

    // Paragraph itself is longer than one chunk: hard-split it.
    if (paragraph.length > CHUNK_SIZE_CHARS) {
      let offset = 0;
      while (offset < paragraph.length) {
        const end = Math.min(offset + CHUNK_SIZE_CHARS, paragraph.length);
        chunks.push(paragraph.slice(offset, end));
        offset = end - CHUNK_OVERLAP_CHARS;
        if (offset <= 0 || end === paragraph.length) break;
      }
      current = "";
    }
  }

  if (current) chunks.push(current);

  // Apply overlap between consecutive chunks for retrieval continuity.
  const overlapped = chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prevTail = chunks[i - 1].slice(-CHUNK_OVERLAP_CHARS);
    return `${prevTail}\n\n${chunk}`;
  });

  return overlapped
    .filter((content) => content.trim().length > 0)
    .map((content, i) => ({ content: content.trim(), index: startIndex + i }));
}
