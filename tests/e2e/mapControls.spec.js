import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('map controls reflect and update data-vis-area', async ({ page }) => {
  await page.setContent(`
    <div
      class="tanvis"
      data-vis-type="map"
      data-vis-area="vc-60"
      data-vis-source="/example.csv"
      data-vis-ctl="true"
      data-vis-options='{"mapTypesKey":"Standard hectad"}'
    ></div>
  `);

  await page.evaluate(() => {
    window.__svgMapCalls = [];
    window.__setIdentifierCalls = [];
    window.__redrawCalls = 0;
    window.brcatlas = {
      svgMap: (opts) => {
        window.__svgMapCalls.push({
          transOptsKey: opts.transOptsKey,
          boundaryGjson: opts.boundaryGjson,
          gridGjson: opts.gridGjson,
          transOptsControl: opts.transOptsControl,
          selector: opts.selector
        });

        return {
          setIdentfier: (value) => window.__setIdentifierCalls.push(value),
          redrawMap: () => {
            window.__redrawCalls += 1;
          }
        };
      }
    };
  });

  await page.addScriptTag({ path: path.resolve(__dirname, '../../dist/tanvis.iife.js') });
  await page.evaluate(() => window.Tanvis.init());

  await expect(page.locator('.tanvis-controls')).toHaveCount(1);
  await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.tanvis-controls-toggle')).toContainText('Data options');
  await expect(page.getByLabel('vc60')).toBeChecked();
  await expect(page.locator('.tanvis-controls')).not.toContainText('Area');

  await page.locator('.tanvis-controls-toggle').click();
  await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.tanvis-controls-group')).toBeHidden();

  await page.locator('.tanvis-controls-toggle').click();
  await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.tanvis-controls-group')).toBeVisible();

  const initialCalls = await page.evaluate(() => window.__svgMapCalls);
  expect(initialCalls).toHaveLength(1);
  expect(initialCalls[0].transOptsKey).toBe('vc-60');
  expect(initialCalls[0].transOptsControl).toBe(false);

  await page.getByLabel('vc59').check();

  await expect(page.getByLabel('vc59')).toBeChecked();
  await expect(page.locator('.tanvis')).toHaveAttribute('data-vis-area', 'vc-59');

  const calls = await page.evaluate(() => ({
    svgMapCalls: window.__svgMapCalls,
    setIdentifierCalls: window.__setIdentifierCalls,
    redrawCalls: window.__redrawCalls
  }));

  expect(calls.svgMapCalls).toHaveLength(2);
  expect(calls.svgMapCalls[1].transOptsKey).toBe('vc-59');
  expect(calls.svgMapCalls[1].boundaryGjson).toBe('/data/vcs/simp-100/vc-59-100.geojson');
  expect(calls.setIdentifierCalls).toEqual(['/example.csv', '/example.csv']);
  expect(calls.redrawCalls).toBe(2);
});