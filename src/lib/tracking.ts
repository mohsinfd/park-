export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function buildTrackingUrl(baseUrl: string, p1: string, p2: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("p1", p1);
    url.searchParams.set("p2", p2);
    return url.toString();
  } catch {
    // fallback for malformed URLs
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`;
  }
}
