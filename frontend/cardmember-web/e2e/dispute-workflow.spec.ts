import { test, expect } from '@playwright/test';

test.describe('Cardmember dispute workflow', () => {
  test('files a dispute, uploads evidence, and views dispute detail', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Recent Transactions/i })).toBeVisible();
    await page.locator('a[href*="tok_demo_unauthorized"]').click();

    await expect(page.getByRole('heading', { name: /File a Charge Dispute/i })).toBeVisible();
    await page.getByLabel(/Description of Dispute/i).fill('The package never arrived and the merchant did not provide tracking.');
    await page.locator('select').selectOption('PHOTO');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'delivery-notice.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('No delivery was received.'),
    });
    await page.getByRole('button', { name: /Submit Dispute/i }).click();

    await expect(page.getByRole('heading', { name: /Dispute #/i })).toBeVisible();
    await expect(page.locator('h1').locator('..').getByText('FILED')).toBeVisible();

    const disputeId = page.url().split('/').pop();
    await page.goto('http://127.0.0.1:5174/');
    await expect(page.getByRole('heading', { name: /Disputes Dashboard/i })).toBeVisible();
    await page.locator(`a[href="/dispute/${disputeId}"]`).first().click();
    await expect(page.getByRole('heading', { name: /Evidence Submitted by Cardmember/i })).toBeVisible();
    await expect(page.getByText('PHOTO', { exact: true })).toBeVisible();
  });
});
