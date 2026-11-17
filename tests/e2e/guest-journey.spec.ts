/**
 * End-to-end guest journeys through the real UI.
 * Scenarios come from features/trip-assistant.feature; each test.step is a Gherkin step.
 * Assertions are rule-based, so they pass no matter how the answer is worded.
 */
import { test, expect } from '../fixtures';
import { mentionsAll, mentionsNone, maxWords, pricesMatchCatalog } from '../helpers/evaluators';

const expectCheck = (check: { name: string; passed: boolean; detail?: string }) =>
  expect(check.passed, `${check.name} — ${check.detail ?? ''}`).toBe(true);

test.describe('Feature: Trip assistant answers guest questions accurately', () => {
  test('Scenario: Guest asks for a multi-day ticket price', async ({ chatPage, catalog }) => {
    const answer = await test.step('When I ask "How much is a 2-day ticket?"', () =>
      chatPage.ask('How much is a 2-day ticket?'));

    await test.step('Then the answer mentions the 2-Day ticket', async () => {
      const twoDay = catalog.tickets.find((t) => t.id === '2-day')!;
      expectCheck(mentionsAll(answer, [[`$${twoDay.price}`], ['2-day', '2 day']]));
    });
    await test.step('And every price in the answer matches the catalog', async () => {
      expectCheck(pricesMatchCatalog(answer, catalog));
    });
    await test.step('And the answer is at most 60 words', async () => {
      expectCheck(maxWords(answer, 60));
    });
  });

  test('Scenario: Guest asks a follow-up about hotels', async ({ chatPage, catalog }) => {
    await test.step('When I ask "How much is a 2-day ticket?"', () => chatPage.ask('How much is a 2-day ticket?'));
    const answer = await test.step('And I ask "Where can I stay overnight?"', () =>
      chatPage.ask('Where can I stay overnight?'));

    await test.step('Then the answer names both hotels', async () => {
      expectCheck(mentionsAll(answer, catalog.hotels.map((h) => [h.name])));
    });
    await test.step('And every price in the answer matches the catalog', async () => {
      expectCheck(pricesMatchCatalog(answer, catalog));
    });
    await expect(chatPage.botMessages).toHaveCount(2); // conversation history kept
  });

  test('Scenario: Assistant does not invent discounts', async ({ chatPage }) => {
    const answer = await test.step('When I ask "Do you have any coupon codes?"', () =>
      chatPage.ask('Do you have any coupon codes?'));
    await test.step('Then the answer contains no coupon code or percentage discount', async () => {
      expectCheck(mentionsNone(answer, ['% off', 'use code', 'magic50']));
    });
  });

  test('Scenario: Assistant declines off-topic requests', async ({ chatPage }) => {
    const answer = await test.step('When I ask "Can you write my history homework essay?"', () =>
      chatPage.ask('Can you write my history homework essay?'));
    await test.step('Then the answer redirects me to tickets, hours, or hotels', async () => {
      expectCheck(mentionsAll(answer, [['tickets', 'hours', 'hotels']]));
      expectCheck(mentionsNone(answer, ['in conclusion', '$']));
    });
  });
});
