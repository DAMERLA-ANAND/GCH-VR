import { test, expect } from '@playwright/test';

test.describe('Merchant portal workflow', () => {
  test('loads dashboard, reviews a dispute, and sends a mediated request', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Disputes Dashboard/i })).toBeVisible();
    const reviewLink = page.getByRole('link', { name: /Review Claim/i }).first();
    const reviewHref = await reviewLink.getAttribute('href');
    await reviewLink.click();

    await expect(page.getByRole('heading', { name: /Dispute Review:/i })).toBeVisible();
    await page.getByLabel(/Note to Cardmember/i).fill('Please upload a photo showing the shipping label attached to the outer box.');
    await page.getByRole('button', { name: /Send Mediated Request/i }).click();

    await expect(page.getByText(/Mediated information request sent/i)).toBeVisible();

    await page.goto(`http://127.0.0.1:5173${reviewHref}`);
    await expect(page.getByRole('heading', { name: /Platform Mediated Evidence Requests/i })).toBeVisible();
    await page.getByRole('button', { name: /Respond to Request/i }).click();
    await page.getByPlaceholder(/Type your response to the merchant/i).fill('The package was not received at my address.');
    await page.getByRole('button', { name: /Submit Response/i }).click();
    await expect(page.getByText(/Mediated response submitted successfully/i)).toBeVisible();

    await page.goto(`http://127.0.0.1:5174${reviewHref}`);
    await expect(page.getByRole('heading', { name: /Cardmember Responses/i })).toBeVisible();
    await expect(page.getByText('The package was not received at my address.')).toBeVisible();
  });
});
