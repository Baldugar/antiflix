export function trigrams(s: string): Set<string> {
  const normalized = s.toLowerCase().trim();
  const result = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    result.add(normalized.substring(i, i + 3));
  }
  return result;
}

export function similarity(a: string, b: string): number {
  const triA = trigrams(a);
  const triB = trigrams(b);
  if (triA.size === 0 || triB.size === 0) return 0;

  let intersection = 0;
  for (const t of triA) {
    if (triB.has(t)) intersection++;
  }

  return (2 * intersection) / (triA.size + triB.size);
}

export function findBestMatch(
  query: string,
  candidates: Array<{ id: number; title: string }>,
): { id: number; title: string; score: number } | null {
  let best: { id: number; title: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = similarity(query, candidate.title);
    if (score > 0.3 && (best === null || score > best.score)) {
      best = { id: candidate.id, title: candidate.title, score };
    }
  }

  return best;
}

export function parseNetflixCSV(csvText: string): string[] {
  const lines = csvText.split("\n");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const titleIndex = headers.indexOf("Title");
  if (titleIndex === -1) return [];

  const titles = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV field extraction handling quoted fields
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());

    const rawTitle = fields[titleIndex];
    if (!rawTitle) continue;

    // Strip episode info: everything after ": Season", ": Part", or last colon-separated segment
    let title = rawTitle;
    const seasonIdx = title.indexOf(": Season");
    const partIdx = title.indexOf(": Part");

    if (seasonIdx !== -1) {
      title = title.substring(0, seasonIdx);
    } else if (partIdx !== -1) {
      title = title.substring(0, partIdx);
    } else {
      // Remove last colon-separated segment if there are multiple
      const lastColon = title.lastIndexOf(": ");
      if (lastColon > 0) {
        title = title.substring(0, lastColon);
      }
    }

    title = title.trim();
    if (title) titles.add(title);
  }

  return Array.from(titles);
}
