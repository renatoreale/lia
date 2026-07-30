/** Crude HTML-to-text conversion for emails that only have a body_html
 * (no body_text). Good enough for AI prompt input and text matching --
 * not meant to preserve formatting. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
