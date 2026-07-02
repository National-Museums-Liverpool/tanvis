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

This snippet demonstrates the wiring pattern (`.tanvis` + `data-*` attributes + `init()`); the `table` renderer is currently scaffold-only.
For working end-to-end examples, use `static-map` or `slippy-map` (see `examples/static-map.html` and `examples/slippy-map.html`).

## Renderers

Tanvis currently registers these renderer types:

- `table`
- `chart`
- `static-map`
- `slippy-map`

`table` and `chart` are scaffolded but their adapters are not implemented yet.

### Static Map Renderer (BRC Atlas)

Use `data-vis-type="static-map"`.

Supported attributes:

- `data-vis-source`: optional source string passed to `setIdentfier(...)`
- `data-vis-area`: one of `vc-58`, `vc-59`, `vc-60`, `vc-58-59-60` (default: `vc-58-59-60`)
- `data-vis-ctl`: `true`/`false` to show area controls (default: `false`)
- `data-vis-hectads`: `true`/`false` to include hectad grid (default: `true`)
- `data-vis-expand`: `true`/`false` (optional)
- `data-vis-width`: positive number in pixels (optional)

When `data-vis-ctl="true"`, Tanvis renders radio options `vc58`, `vc59`, `vc60`, and `all` that set `data-vis-area` to `vc-58`, `vc-59`, `vc-60`, and `vc-58-59-60`.

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">

<div
  class="tanvis"
  data-vis-type="static-map"
  data-vis-source="/example-hectads-1.csv"
  data-vis-area="vc-58-59-60"
  data-vis-ctl="true"
  data-vis-hectads="true"
  data-vis-width="600"
></div>
```

The static map renderer calls `brcatlas.svgMap(...)` and then `setIdentfier(...)` and `redrawMap()` when available.

### Slippy Map Renderer (Leaflet via BRC Atlas)

Use `data-vis-type="slippy-map"`.

Supported attributes:

- `data-vis-source`: optional source string passed to `setIdentfier(...)`
- `data-vis-area`: used to calculate aspect ratio when `data-vis-width` is set (default: `vc-58-59-60`)
- `data-vis-ctl`: `true`/`false` to show area controls (default: `false`)
- `data-vis-boundaries`: `true`/`false` to show vice county boundaries (default: `false`)
- `data-vis-expand`: `true`/`false` (optional)
- `data-vis-width`: positive number in pixels (optional)

```html
<script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">

<div
  class="tanvis"
  data-vis-type="slippy-map"
  data-vis-area="vc-58"
  data-vis-width="600"
  data-vis-ctl="true"
  data-vis-boundaries="true"
></div>
```

When `data-vis-ctl="true"`, Tanvis shows the same radio controls (`vc58`, `vc59`, `vc60`, `all`) as static-map. The per-option handlers are currently placeholders.

The slippy map renderer calls `brcatlas.leafletMap(...)` and then `setIdentfier(...)` and `redrawMap()` when available.

See `examples/static-map.html` and `examples/slippy-map.html` for ready-to-run pages.
