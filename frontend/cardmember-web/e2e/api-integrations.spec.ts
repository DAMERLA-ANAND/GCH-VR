import { test, expect } from '@playwright/test';

test.describe('API integration smoke tests', () => {
  test('calls the backend dispute endpoints from the UI', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/')) requests.push(req.url());
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Recent Transactions/i })).toBeVisible();
    await expect.poll(() => requests.some((url) => url.includes('/api/v1/disputes'))).toBe(true);
  });
});
