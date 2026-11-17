/**
 * Optional: a real LLM agent (Anthropic Messages API) grounded in the same catalog.
 * Enabled with AGENT_MODE=llm, ANTHROPIC_API_KEY and ANTHROPIC_MODEL.
 * The tests don't change at all — that's the point of rule/semantic evaluation.
 */
import { catalog } from '../catalog';

const SYSTEM_PROMPT = `You are the guest assistant for ${catalog.resortName}.
Answer in at most 80 words. Only use facts from this JSON catalog:
${JSON.stringify(catalog)}
Rules: never invent prices, discounts, or coupon codes. If asked about anything unrelated to
tickets, park hours, hotels, kids policy, or trip planning, politely say you can only help with those.`;

export async function llmAgent(message: string): Promise<{ reply: string; intent: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new Error('Set ANTHROPIC_API_KEY and ANTHROPIC_MODEL for AGENT_MODE=llm');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 300, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: message }] }),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const reply = data.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  return { reply, intent: 'llm' };
}
