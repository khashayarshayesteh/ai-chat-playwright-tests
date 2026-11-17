/**
 * "Validate what guests see against API responses."
 * We capture the real /api/chat response while using the UI and compare:
 *   - the UI shows exactly what the API returned (no rendering bugs)
 *   - the API's prices agree with the catalog API (no hallucinated prices)
 */
import { test, expect } from '../fixtures';
import { extractPrices } from '../helpers/evaluators';

test('UI shows the exact API reply and its prices exist in the catalog', async ({ chatPage, catalog, page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/chat') && r.request().method() === 'POST'),
    chatPage.send('What tickets do you sell?'),
  ]);
  expect(response.status()).toBe(200);
  const api = (await response.json()) as { reply: string; intent: string };

  await expect(chatPage.botMessages.last()).toHaveText(api.reply);

  const catalogPrices = catalog.tickets.map((t) => t.price);
  const shown = extractPrices(api.reply);
  expect(shown.length).toBeGreaterThan(0);
  for (const price of shown) expect(catalogPrices).toContain(price);
});

test('chat API rejects requests without a session', async ({ playwright, baseURL }) => {
  // Explicitly empty storage state: no session cookie from the logged-in project.
  const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const res = await anonymous.post('/api/chat', { data: { message: 'hi' } });
  expect(res.status()).toBe(401);
  await anonymous.dispose();
});
