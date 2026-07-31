import "server-only";

/**
 * Origin used to build Gmail/Outlook OAuth redirect_uri values. Vercel
 * assigns a fresh unique URL to every deployment (e.g.
 * lia-<hash>-liasoft.vercel.app) in addition to the stable aliases
 * (lia-beta-five.vercel.app) -- deriving redirect_uri from the request's
 * own origin means it silently breaks (Google/Microsoft redirect_uri
 * mismatch) whenever someone opens a specific deployment URL instead of
 * the stable one. APP_URL pins it to whatever's actually registered with
 * Google Cloud Console / Azure AD, regardless of which URL served the
 * request. Falls back to the request origin when unset (local dev).
 */
export function getOAuthAppOrigin(requestOrigin: string): string {
  return process.env.APP_URL || requestOrigin;
}
