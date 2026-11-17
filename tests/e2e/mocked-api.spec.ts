/**
 * Request interception + mocks (page.route).
 * Mocking the agent makes UI tests deterministic and lets us force edge cases
 * (errors, slow responses) that are hard to trigger with a real LLM.
 */
import { test, expect } from '../fixtures';

test('renders a mocked agent reply exactly', async ({ chatPage, page }) => {
  await page.route('**/api/chat', (route) =>
    route.fulfill({ json: { reply: 'Mocked: the 3-Day Park Ticket is $329.', intent: 'tickets', mode: 'mock' } }));

  const answer = await chatPage.ask('anything');
  expect(answer).toBe('Mocked: the 3-Day Park Ticket is $329.');
});

test('shows a friendly error and recovers when the agent fails', async ({ chatPage, page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ status: 500, json: { error: 'boom' } }));

  await chatPage.send('How much is a 1-day ticket?');
  await expect(chatPage.error).toBeVisible();
  await expect(chatPage.input).toBeEnabled(); // guest can retry

  await page.unroute('**/api/chat'); // real agent is back
  const answer = await chatPage.ask('How much is a 1-day ticket?');
  expect(answer).toContain('$129');
  await expect(chatPage.error).toBeHidden();
});

test('shows a typing indicator and blocks double-send while the agent is slow', async ({ chatPage, page }) => {
  await page.route('**/api/chat', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ json: { reply: 'Slow but correct: open 8:00 AM to 10:00 PM.', intent: 'hours', mode: 'mock' } });
  });

  await chatPage.send('What are the park hours?');
  await expect(chatPage.typing).toBeVisible();
  await expect(chatPage.sendButton).toBeDisabled();
  await expect(chatPage.botMessages.last()).toHaveText(/8:00 AM to 10:00 PM/);
  await expect(chatPage.typing).toBeHidden();
});
