# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mapControls.spec.js >> map controls reflect and update data-vis-area
- Location: tests\e2e\mapControls.spec.js:8:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.tanvis-controls')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('.tanvis-controls')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Test source

```ts
  1  | import path from 'node:path';
  2  | import { fileURLToPath } from 'node:url';
  3  | import { test, expect } from '@playwright/test';
  4  | 
  5  | const __filename = fileURLToPath(import.meta.url);
  6  | const __dirname = path.dirname(__filename);
  7  | 
  8  | test('map controls reflect and update data-vis-area', async ({ page }) => {
  9  |   await page.setContent(`
  10 |     <div
  11 |       class="tanvis"
  12 |       data-vis-type="static-map"
  13 |       data-vis-area="vc-60"
  14 |       data-vis-source="/example.csv"
  15 |       data-vis-ctl="true"
  16 |     ></div>
  17 |   `);
  18 | 
  19 |   await page.evaluate(() => {
  20 |     window.__svgMapCalls = [];
  21 |     window.__setIdentifierCalls = [];
  22 |     window.__redrawCalls = 0;
  23 |     window.brcatlas = {
  24 |       svgMap: (opts) => {
  25 |         window.__svgMapCalls.push({
  26 |           transOptsKey: opts.transOptsKey,
  27 |           boundaryGjson: opts.boundaryGjson,
  28 |           gridGjson: opts.gridGjson,
  29 |           transOptsControl: opts.transOptsControl,
  30 |           selector: opts.selector
  31 |         });
  32 | 
  33 |         return {
  34 |           setIdentfier: (value) => window.__setIdentifierCalls.push(value),
  35 |           redrawMap: () => {
  36 |             window.__redrawCalls += 1;
  37 |           }
  38 |         };
  39 |       }
  40 |     };
  41 |   });
  42 | 
  43 |   await page.addScriptTag({ path: path.resolve(__dirname, '../../dist/tanvis.iife.js') });
  44 |   await page.evaluate(() => window.Tanvis.init());
  45 | 
> 46 |   await expect(page.locator('.tanvis-controls')).toHaveCount(1);
     |                                                  ^ Error: expect(locator).toHaveCount(expected) failed
  47 |   await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
  48 |   await expect(page.locator('.tanvis-controls-toggle')).toContainText('Data options');
  49 |   await expect(page.getByLabel('vc60')).toBeChecked();
  50 |   await expect(page.locator('.tanvis-controls')).not.toContainText('Area');
  51 | 
  52 |   await page.locator('.tanvis-controls-toggle').click();
  53 |   await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'false');
  54 |   await expect(page.locator('.tanvis-controls-group')).toBeHidden();
  55 | 
  56 |   await page.locator('.tanvis-controls-toggle').click();
  57 |   await expect(page.locator('.tanvis-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
  58 |   await expect(page.locator('.tanvis-controls-group')).toBeVisible();
  59 | 
  60 |   const initialCalls = await page.evaluate(() => window.__svgMapCalls);
  61 |   expect(initialCalls).toHaveLength(1);
  62 |   expect(initialCalls[0].transOptsKey).toBe('vc-60');
  63 |   expect(initialCalls[0].transOptsControl).toBe(false);
  64 | 
  65 |   await page.getByLabel('vc59').check();
  66 | 
  67 |   await expect(page.getByLabel('vc59')).toBeChecked();
  68 |   await expect(page.locator('.tanvis')).toHaveAttribute('data-vis-area', 'vc-59');
  69 | 
  70 |   const calls = await page.evaluate(() => ({
  71 |     svgMapCalls: window.__svgMapCalls,
  72 |     setIdentifierCalls: window.__setIdentifierCalls,
  73 |     redrawCalls: window.__redrawCalls
  74 |   }));
  75 | 
  76 |   expect(calls.svgMapCalls).toHaveLength(2);
  77 |   expect(calls.svgMapCalls[1].transOptsKey).toBe('vc-59');
  78 |   expect(calls.svgMapCalls[1].boundaryGjson).toBe('/data/vcs/simp-100/vc-59-100.geojson');
  79 |   expect(calls.setIdentifierCalls).toEqual(['/example.csv', '/example.csv']);
  80 |   expect(calls.redrawCalls).toBe(2);
  81 | });
```