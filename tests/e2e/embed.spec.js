import { test, expect } from '@playwright/test';

test('placeholder embed page has a target container', async ({ page }) => {
  await page.setContent(`
    <div class="tanvis" data-vis-type="table" data-vis-source="/demo.json"></div>
  `);

  await expect(page.locator('.tanvis')).toHaveCount(1);
});
