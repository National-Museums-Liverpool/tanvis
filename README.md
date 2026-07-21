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
For working end-to-end examples, use `static-map`, `slippy-map`, `new-species-table`, `increasing-species-table`, or `temporal-year-chart` (see `examples/static-map.html`, `examples/slippy-map.html`, `examples/new-species-table.html`, `examples/increasing-species-table.html`, and `examples/temporal-year-chart.html`).

To see a shared control block driving two map outputs together, open `examples/shared-control-maps.html`.

## Renderers

Tanvis currently registers these renderer types:

- `table`
- `chart`
- `static-map`
- `slippy-map`
- `new-species-table`
- `increasing-species-table`
- `temporal-year-chart`

`table` and `chart` are scaffolded but their adapters are not implemented yet.

### Static Map Renderer (BRC Atlas)

Use `data-vis-type="static-map"`.

Supported attributes:

- `data-vis-source`: optional source string passed to `setIdentfier(...)`
- `data-vis-area`: one of `vc-58`, `vc-59`, `vc-60`, `vc-58-59-60` (default: `vc-58-59-60`)
- `data-vis-control`: optional id of a `control-block` element used to drive area changes
- `data-vis-hectads`: `true`/`false` to include hectad grid (default: `true`)
- `data-vis-expand`: `true`/`false` (optional)
- `data-vis-width`: positive number in pixels (optional)

A separate `control-block` visualization can render radio options (`vc58`, `vc59`, `vc60`, `all`) and any visualization with `data-vis-control` set to that block id responds to selections.

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">

<div
  id="vc-control"
  class="tanvis"
  data-vis-type="control-block"
  data-vis-area="vc-58-59-60"
></div>

<div
  class="tanvis"
  data-vis-type="static-map"
  data-vis-source="/example-hectads-1.csv"
  data-vis-area="vc-58-59-60"
  data-vis-control="vc-control"
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
- `data-vis-control`: optional id of a `control-block` element used to drive area changes
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
  id="vc-control"
  class="tanvis"
  data-vis-type="control-block"
  data-vis-area="vc-58"
></div>

<div
  class="tanvis"
  data-vis-type="slippy-map"
  data-vis-area="vc-58"
  data-vis-width="600"
  data-vis-control="vc-control"
  data-vis-boundaries="true"
></div>
```

`control-block` elements must have an `id` attribute. Any visualization with `data-vis-control="<id>"` subscribes to that block.

The control block currently renders VC selection controls plus a taxon-group dropdown populated from `taxon-groups`, with Scientific/Vernacular radio buttons that switch the dropdown labels between the `title` and `friendly` fields. The first dropdown option is `All groups`, and option values map to `external_key`.

When a visualization is subscribed to a control block, the control block's current `data-vis-area` value takes precedence over the visualization's own `data-vis-area` both on initial render and on later control changes.

The slippy map renderer calls `brcatlas.leafletMap(...)` and then `setIdentfier(...)` and `redrawMap()` when available.

### New Species Table Renderer

Use `data-vis-type="new-species-table"`.

Supported attributes:

- `data-vis-start-date`: required start date in `YYYY-MM-DD` format
- `data-vis-end-date`: optional end date in `YYYY-MM-DD` format; defaults to the current date when omitted
- `data-vis-source`: optional API base URL; defaults to `/api/v1`

Include Tabulator before Tanvis when using this renderer.

```html
<link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" />
<script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

<div
  class="tanvis"
  data-vis-type="new-species-table"
  data-vis-start-date="2025-01-01"
  data-vis-end-date="2025-12-31"
></div>
```

Tanvis queries `taxon-stats` with `first_record_date[gte]`, `first_record_date[lte]`, and `include=taxon`, then renders the returned records as an HTML table.

### Increasing Species Table Renderer

Use `data-vis-type="increasing-species-table"`.

Supported attributes:

- `data-vis-top-n`: optional positive integer; defaults to `50` when omitted
- `data-vis-source`: optional API base URL; defaults to `/api/v1`
- `data-vis-control`: optional id of a `control-block`; when set, VC selections filter `taxon-stats` by `geographic_region_identifier[eq]`

Include Tabulator before Tanvis when using this renderer.

```html
<link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" />
<script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

<div
  class="tanvis"
  data-vis-type="increasing-species-table"
  data-vis-top-n="25"
></div>
```

Tanvis queries `taxon-stats` with `include=taxon`, reads the joined taxonomic fields from each row, ranks rows by the `frequency_trend` field, applies `data-vis-top-n`, and renders the result in descending `frequencyTrendScore` order.

When a subscribed control block selects `vc-58`, `vc-59`, or `vc-60`, Tanvis adds `geographic_region_identifier[eq]=58|59|60` to the `taxon-stats` request. When `all` is selected, that filter is omitted.

### Temporal Year Chart Renderer

Use `data-vis-type="temporal-year-chart"`.

Supported attributes:

- `data-vis-taxonid`: required taxon identifier string
- `data-vis-start-year`: optional positive integer year
- `data-vis-end-year`: optional positive integer year
- `data-vis-source`: optional API base URL; defaults to `/api/v1`

Include D3 and BRC Charts before Tanvis when using this renderer.

```html
<script src="https://d3js.org/d3.v5.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-charts/dist/brccharts.umd.js"></script>

<div
  class="tanvis"
  data-vis-type="temporal-year-chart"
  data-vis-taxonid="NHMSYS0001234567"
  data-vis-start-year="1970"
  data-vis-end-year="2024"
></div>
```

Tanvis queries `taxon-year-stats` for the selected `taxon_identifier`, reshapes the returned rows for `brccharts.temporal`, and renders a two-line yearly chart for `occurrences_count` and `grid_square_count`.

See `examples/static-map.html`, `examples/slippy-map.html`, `examples/shared-control-maps.html`, `examples/new-species-table.html`, `examples/increasing-species-table.html`, and `examples/temporal-year-chart.html` for ready-to-run pages.
