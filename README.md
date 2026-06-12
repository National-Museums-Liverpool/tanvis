# tanvis

Browser-first visualization library scaffold.

## Goals

- Plain JavaScript source code
- Rollup-built browser bundle
- Data-attribute driven container discovery
- Small adapter layer for third-party visualization libraries

## Scripts

- `npm run build` - build the browser bundle
- `npm run build:watch` - rebuild while developing
- `npm run test:unit` - run unit tests with Vitest
- `npm run test:e2e` - run browser tests with Playwright

## Public API

The IIFE build exposes a global `window.Tanvis` object.

### init()

Scans `document` for `.tanvis` elements and renders each one.

Returns: array of render results.

```js
window.Tanvis.init();
```

### version

Library version string.

```js
console.log(window.Tanvis.version);
```

## Browser Example

```html
<div class="tanvis" data-vis-type="table" data-vis-source="/data.json"></div>
<script src="dist/tanvis.iife.js"></script>
<script>
  window.Tanvis.init();
</script>
```

## Map Renderer (BRC Atlas)

Use `data-vis-type="map"` and provide a CSV source URL with `data-vis-source`.
Set `data-vis-ctl="true"` to show the map area control; if omitted, it defaults to `false`.
When enabled, Tanvis renders a control area below the map with radio options `vc58`, `vc59`, `vc60`, and `all`, which map to `data-vis-area` values `vc-58`, `vc-59`, `vc-60`, and `vc-58-59-60`.

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">

<div
  class="tanvis"
  data-vis-type="map"
  data-vis-source="/example-hectads-1.csv"
  data-vis-area="vc-58-59-60"
  data-vis-ctl="true"
  data-vis-options='{"mapTypesKey":"Standard hectad"}'
></div>
```

The map renderer calls `brcatlas.svgMap(...)` and then `setIdentfier(...)` and `redrawMap()` when available.

See `examples/map.html` for a ready-to-run page.
