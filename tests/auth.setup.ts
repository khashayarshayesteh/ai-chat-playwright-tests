import { test as setup, expect } from '@playwright/test';
import { DEMO_USER } from './fixtures';

export const AUTH_FILE = '.auth/guest.json';

// Log in once through the real UI, save the session, and reuse it in every E2E test.
setup('log in as demo guest', async ({ page }) => {
  await page.goto('/login.html');
  await page.getByTestId('username').fill(DEMO_USER.username);
  await page.getByTestId('password').fill(DEMO_USER.password);
  await page.getByTestId('login-button').click();
  await expect(page.getByTestId('chat-input')).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
