const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/uploads/")) return `${apiUrl}${url}`;
  return url;
}
