import { expect, test } from '@playwright/test';

test('el explorador ofrece una búsqueda accesible', async ({ page }) => {
  await page.goto('/explorar');
  await expect(page.getByRole('search')).toBeVisible();
});
