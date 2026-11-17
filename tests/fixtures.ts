import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { ChatPage } from './pages/ChatPage';
import type { Catalog } from '../app/catalog';

export const DEMO_USER = { username: 'demo', password: 'demo123' };

/** Logged-in API client (used by the eval suite — faster than driving the UI). */
export async function loginApi(request: APIRequestContext) {
  const res = await request.post('/api/login', { data: DEMO_USER });
  expect(res.ok()).toBeTruthy();
}

type Fixtures = {
  chatPage: ChatPage;
  catalog: Catalog;
  askApi: (message: string) => Promise<string>;
};

export const test = base.extend<Fixtures>({
  chatPage: async ({ page }, use) => {
    const chat = new ChatPage(page);
    await chat.goto();
    await use(chat);
  },
  // Source of truth for validating what the bot says.
  catalog: async ({ request }, use) => {
    const res = await request.get('/api/catalog');
    await use((await res.json()) as Catalog);
  },
  askApi: async ({ request }, use) => {
    await loginApi(request);
    await use(async (message: string) => {
      const res = await request.post('/api/chat', { data: { message } });
      expect(res.status()).toBe(200);
      return ((await res.json()) as { reply: string }).reply;
    });
  },
});

export { expect };
