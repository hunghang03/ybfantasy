import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const SAMPLE = path.resolve(__dirname, '../sample-data');

async function importFile(page: Page, kind: string, provider: string, file: string) {
  await page.goto('/data/');
  await page.getByTestId('import-kind').selectOption(kind);
  await page.getByTestId('import-provider').fill(provider);
  await page.getByTestId('import-file').setInputFiles(path.join(SAMPLE, file));
  await expect(page.getByTestId('import-summary')).toBeVisible();
  await page.getByTestId('commit-import').click();
  await expect(page.getByTestId('import-report')).toBeVisible();
}

async function firstRowIds(page: Page, n = 10): Promise<string[]> {
  return page.locator('[data-testid^=row-]').evaluateAll((rows, k) => rows.slice(0, k).map((r) => r.getAttribute('data-testid') ?? ''), n);
}

async function snapshot(page: Page) {
  return {
    header: await page.getByTestId('advisor-header').textContent(),
    pick: await page.getByTestId('current-pick').textContent(),
    next: await page.getByTestId('next-pick').textContent(),
    team: await page.getByTestId('my-team').textContent(),
    rows: await firstRowIds(page, 15),
    dashboard: await page.getByTestId('category-dashboard').textContent(),
  };
}

async function takeTopOthers(page: Page, n: number) {
  for (let i = 0; i < n; i++) await page.locator('[data-testid^=taken-]').first().click();
}

async function advanceToMyTurn(page: Page) {
  for (let i = 0; i < 40; i++) {
    if ((await page.getByText('ON THE CLOCK', { exact: true }).count()) > 0) return;
    await page.locator('[data-testid^=taken-]').first().click();
  }
  throw new Error('never on the clock');
}

async function draftFirstCenter(page: Page) {
  const row = page.locator('[data-testid^=row-]').filter({ has: page.locator('td:nth-child(4)', { hasText: 'C' }) }).first();
  const id = (await row.getAttribute('data-testid'))!.replace('row-', '');
  await page.getByTestId(`mine-${id}`).click();
}

test('full live-draft workflow (§51)', async ({ page }) => {
  // 1. Create a 14-team league at pick 11.
  await page.goto('/');
  await page.getByTestId('create-league').click();
  await page.goto('/setup/');
  await page.getByTestId('league-name').fill('League A');
  await page.getByTestId('team-count').fill('14');
  await page.getByTestId('draft-position').fill('11');
  await page.getByTestId('save-league').click();
  await expect(page.getByTestId('user-picks')).toContainText('11');
  await expect(page.getByTestId('user-picks')).toContainText('18');
  await expect(page.getByTestId('user-picks')).toContainText('179');

  // 2–3. Import Yahoo market data and projection data through the import wizard.
  await importFile(page, 'YAHOO_MARKET', 'yahoo', 'yahoo-market.sample.csv');
  await importFile(page, 'PROJECTION', 'hashtag', 'projections-hashtag.sample.csv');
  await expect(page.getByTestId('batch-history')).toContainText('YAHOO_MARKET');
  await expect(page.getByTestId('batch-history')).toContainText('PROJECTION');

  // 4. Start the draft.
  await page.goto('/draft/');
  await expect(page.getByTestId('strategy-advisor')).toBeVisible();
  await expect(page.getByTestId('current-pick')).toHaveText('1');
  await expect(page.getByTestId('next-pick')).toHaveText('11');

  // 5. Ten players drafted by others.
  await takeTopOthers(page, 10);
  await expect(page.getByTestId('current-pick')).toHaveText('11');
  await expect(page.getByTestId('advisor-header')).toContainText('ON THE CLOCK');
  const before = await snapshot(page);

  // 6. Draft a player.
  await page.locator('[data-testid^=mine-]').first().click();
  const after = await snapshot(page);
  // 7. Category dashboard updates.
  expect(after.dashboard).not.toEqual(before.dashboard);
  // 8. Available players rerank.
  expect(after.rows).not.toEqual(before.rows);
  // 9. Strategy Advisor changes.
  expect(after.header).not.toEqual(before.header);
  // 10. Next pick calculation.
  await expect(page.getByTestId('current-pick')).toHaveText('12');
  await expect(page.getByTestId('next-pick')).toHaveText('18');
  await expect(page.getByTestId('following-pick')).toHaveText('39');
  await expect(page.getByTestId('my-team')).toContainText('11');

  // 11. Draft several players (centers) → punt detection evolves.
  await page.goto('/review/');
  const piBefore = await page.getByTestId('profile-debug').textContent();
  await page.goto('/draft/');
  for (let i = 0; i < 4; i++) {
    await advanceToMyTurn(page);
    await draftFirstCenter(page);
  }
  await page.goto('/review/');
  const piAfter = await page.getByTestId('profile-debug').textContent();
  expect(piAfter).not.toEqual(piBefore);
  const astRow = page.getByTestId('profile-debug').locator('tr', { hasText: 'AST' });
  const cells = await astRow.locator('td').allTextContents();
  const piAuto = Number(cells[16]);
  expect(piAuto).toBeGreaterThan(0);

  // 12. Undo restores the exact prior state.
  await page.goto('/draft/');
  const beforeUndoPick = await snapshot(page);
  await takeTopOthers(page, 1);
  expect((await snapshot(page)).pick).not.toEqual(beforeUndoPick.pick);
  await page.getByTestId('undo').click();
  expect(await snapshot(page)).toEqual(beforeUndoPick);
  // keyboard undo too
  await takeTopOthers(page, 1);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('u');
  expect(await snapshot(page)).toEqual(beforeUndoPick);

  // 13. Reload → draft state persists.
  await page.reload();
  await expect(page.getByTestId('strategy-advisor')).toBeVisible();
  expect(await snapshot(page)).toEqual(beforeUndoPick);

  // 14. Second league stays isolated.
  await page.goto('/');
  await page.getByTestId('create-league').click();
  await page.goto('/setup/');
  await page.getByTestId('league-name').fill('League B');
  await page.getByTestId('draft-position').fill('4');
  await page.getByTestId('save-league').click();
  await page.goto('/draft/');
  await expect(page.getByTestId('current-pick')).toHaveText('1');
  await expect(page.getByTestId('next-pick')).toHaveText('4');
  await takeTopOthers(page, 2);
  const options = await page.getByTestId('league-switcher').locator('option').allTextContents();
  const aLabel = options.find((o) => o.startsWith('League A'))!;
  await page.getByTestId('league-switcher').selectOption({ label: aLabel });
  await expect(page.getByTestId('current-pick')).toHaveText(beforeUndoPick.pick!);
  expect(await snapshot(page)).toEqual(beforeUndoPick);

  // 15. Changing draft position regenerates snake picks.
  const bLabel = (await page.getByTestId('league-switcher').locator('option').allTextContents()).find((o) => o.startsWith('League B'))!;
  await page.getByTestId('league-switcher').selectOption({ label: bLabel });
  await page.goto('/setup/');
  await page.getByTestId('draft-position').fill('14');
  await page.getByTestId('save-league').click();
  const picks = await page.getByTestId('user-picks').locator('span').allTextContents();
  expect(picks.slice(0, 5)).toEqual(['14', '15', '42', '43', '70']);
  await page.goto('/draft/');
  await expect(page.getByTestId('next-pick')).toHaveText('14');
});

test('manual resync after missed picks', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('create-league').click();
  await page.goto('/setup/');
  await page.getByTestId('draft-position').fill('11');
  await page.getByTestId('save-league').click();
  await page.goto('/data/');
  await page.getByTestId('load-sample').click();
  await expect(page.getByTestId('batch-history')).toContainText('PLAYOFF');
  await page.goto('/draft/');
  await takeTopOthers(page, 8); // two picks missed locally (Yahoo is on pick 11)
  await expect(page.getByTestId('current-pick')).toHaveText('9');
  await page.getByTestId('resync-input').fill('11');
  await page.getByTestId('resync-button').click();
  await expect(page.getByTestId('current-pick')).toHaveText('11');
  await expect(page.getByTestId('next-pick')).toHaveText('11');
  await expect(page.getByTestId('following-pick')).toHaveText('18');
  await expect(page.getByTestId('unrecorded-banner')).toContainText('2 pick');
  await page.getByTestId('catch-up').check();
  await takeTopOthers(page, 2);
  await expect(page.getByTestId('current-pick')).toHaveText('11');
  await expect(page.getByTestId('unrecorded-banner')).toHaveCount(0);
  await page.getByTestId('undo').click();
  await expect(page.getByTestId('unrecorded-banner')).toContainText('1 pick');
});
