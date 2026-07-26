/**
 * Client-side version: checks for logo files by trying to fetch them.
 * Falls back to null (letter-badge in Header applies).
 *
 * Call once and cache the result — returns the first logo file found
 * at public/logo.{png,jpg,jpeg,webp}.
 */
export async function getLogoSrc(): Promise<string | null> {
  const exts = ['png', 'jpg', 'jpeg', 'webp'];
  const base = import.meta.env.BASE_URL ?? '/';
  for (const ext of exts) {
    try {
      const url = `${base}logo.${ext}`;
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Synchronous version that returns the static path.
 * Since the app ships logo.png in public/, this is the default.
 */
export function getLogoSrcSync(): string | null {
  // The app ships a logo.png in public/
  return `${import.meta.env.BASE_URL ?? '/'}logo.png`;
}
