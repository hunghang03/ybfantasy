import { expect, test } from '@playwright/test';

test('draft keeps working offline after the app and data have loaded', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('create-league').click();
  await page.goto('/data/');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('batch-history')).toContainText('PLAYOFF');
  await page.goto('/draft/');
  await expect(page.getByTestId('strategy-advisor')).toBeVisible();
  // Let the service worker install and cache the shell.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.getByTestId('strategy-advisor')).toBeVisible();

  await context.setOffline(true);
  await page.locator('[data-testid^=taken-]').first().click();
  await expect(page.getByTestId('current-pick')).toHaveText('2');
  await page.reload();
  await expect(page.getByTestId('strategy-advisor')).toBeVisible();
  await expect(page.getByTestId('current-pick')).toHaveText('2');
  await page.locator('[data-testid^=mine-]').first().click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved locally');
  await context.setOffline(false);
});
