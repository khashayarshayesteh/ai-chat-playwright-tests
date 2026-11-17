import { expect, type Locator, type Page } from '@playwright/test';

/** Page Object for the chat screen. Tests talk to this, never to raw selectors. */
export class ChatPage {
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly botMessages: Locator;
  readonly typing: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.input = page.getByTestId('chat-input');
    this.sendButton = page.getByTestId('send-button');
    this.botMessages = page.getByTestId('bot-message');
    this.typing = page.getByTestId('typing');
    this.error = page.getByTestId('chat-error');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.input).toBeVisible();
  }

  async send(question: string) {
    await this.input.fill(question);
    await this.sendButton.click();
  }

  /** Sends a question and returns the assistant's new reply text. */
  async ask(question: string): Promise<string> {
    const before = await this.botMessages.count();
    await this.send(question);
    await expect(this.botMessages).toHaveCount(before + 1);
    return (await this.botMessages.nth(before).innerText()).trim();
  }
}
