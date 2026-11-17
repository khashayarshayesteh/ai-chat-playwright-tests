/**
 * Evaluators for NON-DETERMINISTIC answers.
 * We never compare exact strings. Instead we check:
 *   1. Rules        – required facts, forbidden content, length, valid prices
 *   2. Semantics    – is the meaning close to a reference answer?
 *   3. LLM-as-judge – optional: a model grades the answer against a rubric
 */
import type { Catalog } from '../../app/catalog';

export interface CheckResult { name: string; passed: boolean; detail?: string }

const normalize = (s: string) => s.toLowerCase().replace(/[–—]/g, '-');

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Every inner group needs at least one match: [["129"], ["1-day","one day"]] */
export function mentionsAll(text: string, groups: string[][]): CheckResult {
  const t = normalize(text);
  const missing = groups.filter((g) => !g.some((term) => t.includes(normalize(term))));
  return { name: 'mentions required facts', passed: missing.length === 0, detail: missing.length ? `missing: ${JSON.stringify(missing)}` : undefined };
}

export function mentionsNone(text: string, forbidden: string[]): CheckResult {
  const t = normalize(text);
  const found = forbidden.filter((f) => t.includes(normalize(f)));
  return { name: 'no forbidden content', passed: found.length === 0, detail: found.length ? `found: ${found.join(', ')}` : undefined };
}

export function maxWords(text: string, limit: number): CheckResult {
  const n = wordCount(text);
  return { name: `at most ${limit} words`, passed: n <= limit, detail: `${n} words` };
}

export const extractPrices = (text: string) =>
  [...text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)].map((m) => Number(m[1].replace(/,/g, '')));

/** Every dollar amount the bot says must exist in the catalog (no invented prices). */
export function pricesMatchCatalog(text: string, catalog: Catalog): CheckResult {
  const valid = new Set([...catalog.tickets.map((t) => t.price), ...catalog.hotels.map((h) => h.pricePerNight)]);
  const invalid = extractPrices(text).filter((p) => !valid.has(p));
  return { name: 'prices match catalog', passed: invalid.length === 0, detail: invalid.length ? `invented: ${invalid.join(', ')}` : undefined };
}

// ---------- Semantic similarity (offline approximation) ----------
const STOP = new Set('a an the is are be to of for and or in on at it you your we our with that this can get per each'.split(' '));
const tokens = (s: string) =>
  normalize(s).replace(/[^a-z0-9$ ]/g, ' ').split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, ''));

/**
 * Cosine similarity of word counts (0..1). A lightweight stand-in for embedding
 * similarity — in a real project swap this for an embeddings API.
 */
export function semanticSimilarity(a: string, b: string): number {
  const count = (ws: string[]) => ws.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<string, number>());
  const A = count(tokens(a)), B = count(tokens(b));
  let dot = 0;
  A.forEach((v, k) => { dot += v * (B.get(k) ?? 0); });
  const mag = (M: Map<string, number>) => Math.sqrt([...M.values()].reduce((s, v) => s + v * v, 0));
  return mag(A) && mag(B) ? dot / (mag(A) * mag(B)) : 0;
}

export function similarTo(text: string, reference: string, threshold: number): CheckResult {
  const score = semanticSimilarity(text, reference);
  return { name: `semantic similarity >= ${threshold}`, passed: score >= threshold, detail: `score ${score.toFixed(2)}` };
}

// ---------- LLM-as-judge (optional, needs ANTHROPIC_API_KEY + ANTHROPIC_MODEL) ----------
export const judgeAvailable = () => !!process.env.ANTHROPIC_API_KEY && !!process.env.ANTHROPIC_MODEL;

export async function llmJudge(question: string, answer: string, rubric: string): Promise<{ score: number; reason: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You grade a resort chatbot's answer.\nQuestion: ${question}\nAnswer: ${answer}\nRubric: ${rubric}\n` +
          `Reply with ONLY JSON: {"score": <1-5>, "reason": "<one sentence>"}`,
      }],
    }),
  });
  const data = (await res.json()) as { content: { text?: string }[] };
  const raw = data.content?.[0]?.text ?? '{}';
  const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return { score: Number(parsed.score), reason: String(parsed.reason) };
}
