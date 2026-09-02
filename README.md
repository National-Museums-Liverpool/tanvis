# tanvis

Browser-first visualisation library scaffold.

## Examples
An index of example pages demonstrating the visualisations can be found at [examples/example-index.html](examples/example-index.html).

## Goals

- Plain JavaScript source code
- Rollup-built browser bundle
- Data-attribute driven container discovery
- Small adapter layer for third-party visualisation libraries

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
<div class="tanvis" data-vis-type="species-map" data-vis-source="/data.json"></div>
<script src="dist/tanvis.iife.js"></script>
<script>
  window.Tanvis.init();
</script>
```

This snippet demonstrates the wiring pattern (`.tanvis` + `data-*` attributes + `init()`); for working end-to-end examples, use `control-block`, `new-species-table`, `increasing-species-table`, `species-absent-table`, `species-map`, `grid-stats-map`, or `temporal-year-chart` (see `examples/new-species-table.html`, `examples/increasing-species-table.html`, `examples/species-absent-table.html`, `examples/species-map.html`, `examples/grid-stats-map.html`, and `examples/temporal-year-chart.html`).

To see a shared control block driving two map outputs together, open `examples/shared-control-maps.html`.

## Renderers

Tanvis currently registers these renderer types:

- `control-block`
- `new-species-table`
- `increasing-species-table`
- `species-absent-table`
- `species-map`
- `grid-stats-map`
- `temporal-year-chart`

### Species Map Renderer (BRC Atlas)

Use `data-vis-type="species-map"`.

Supported attributes:

- `data-vis-source`: optional source string passed to `setIdentfier(...)`
- `data-vis-area`: one of `vc-58`, `vc-59`, `vc-60`, `vc-all` (default: `vc-all`)
- `data-vis-control`: optional id of a `control-block` element used to drive area changes
- `data-vis-hectads`: `true`/`false` to include hectad grid (default: `true`)
- `data-vis-expand`: `true`/`false` (optional)
- `data-vis-width`: positive number in pixels (optional)

A separate `control-block` visualisation can render radio options (`vc58`, `vc59`, `vc60`, `all`) and any visualisation with `data-vis-control` set to that block id responds to selections.

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.js"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas/dist/brcatlas.umd.css">

<div
  id="vc-control"
  class="tanvis"
  data-vis-type="control-block"
  data-vis-area="vc-all"
></div>

<div
  class="tanvis"
  data-vis-type="species-map"
  data-vis-source="/example-hectads-1.csv"
  data-vis-area="vc-all"
  data-vis-control="vc-control"
  data-vis-hectads="true"
  data-vis-width="600"
></div>
```

The static map renderer calls `brcatlas.svgMap(...)` and then `setIdentfier(...)` and `redrawMap()` when available.

`control-block` elements must have an `id` attribute. Any visualisation with `data-vis-control="<id>"` subscribes to that block.

The control block currently renders VC selection controls plus a taxon-group dropdown populated from `taxon-groups`, with Scientific/Vernacular radio buttons that switch the dropdown labels between the `title` and `friendly` fields. The first dropdown option is `All groups`, and option values map to `external_key`.

When a visualisation is subscribed to a control block, the control block's current `data-vis-area` value takes precedence over the visualisation's own `data-vis-area` both on initial render and on later control changes.

### Species Map / Grid Stats Map Renderers

Use `data-vis-type="species-map"` or `data-vis-type="grid-stats-map"`.

Supported attributes:

- `data-vis-year`: required cutoff year; rows with `last_record_date` on or before this year are included
- `data-vis-map-type`: optional map backend selector; use `static` or `leaflet` (defaults to `static`)
- `data-vis-source`: optional API base URL; defaults to `/api/v1`
- `data-vis-control`: optional id of a `control-block`; when set, VC selections filter `taxon-stats` by `geographic_region_identifier[eq]`

Include Tabulator before Tanvis when using these renderers.

```html
<link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" />
<script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

<div
  class="tanvis"
  data-vis-type="species-map"
  data-vis-year="2024"
  data-vis-map-type="leaflet"
></div>
```

Tanvis queries `taxon-stats` with `last_record_date[lte]` and `include=taxon`, renders the returned records in a table, and draws the map using the backend selected by `data-vis-map-type`.

Rows emit `taxon-identified` events with `detail.speciesId` when clicked.

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

### Species Absent Since Table Renderer

Use `data-vis-type="species-absent-table"`.

Supported attributes:

- `data-vis-year`: required cutoff year. Species with `last_record_date` in or before this year are returned.
- `data-vis-source`: optional API base URL; defaults to `/api/v1`
- `data-vis-control`: optional id of a `control-block`; when set, VC selections filter `taxon-stats` by `geographic_region_identifier[eq]`

Include Tabulator before Tanvis when using this renderer.

```html
<link rel="stylesheet" href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css" />
<script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

<div
  class="tanvis"
  data-vis-type="species-absent-table"
  data-vis-year="2024"
></div>
```

Tanvis queries `taxon-stats` with `last_record_date[lte]=YYYY-12-31` and `include=taxon`, then renders the returned records as an HTML table.

Rows emit a `taxon-identified` event with `detail.speciesId` when clicked.

### Temporal Year Chart Renderer

Use `data-vis-type="temporal-year-chart"`.

Supported attributes:

- `data-vis-taxonid`: required taxon identifier string
- `data-vis-start-year`: optional positive integer year
- `data-vis-end-year`: optional positive integer year
- `data-vis-source`: optional API base URL; defaults to `/api/v1`
- `data-vis-linked-table`: optional id of a linked table element that emits `taxon-identified` events with `detail.speciesId`

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

When `data-vis-linked-table` is set, Tanvis listens for `taxon-identified` events on that element and rerenders the chart using the emitted `detail.speciesId`.

See `examples/static-map.html`, `examples/shared-control-maps.html`, `examples/new-species-table.html`, `examples/increasing-species-table.html`, `examples/species-absent-table.html`, `examples/species-map.html`, `examples/grid-stats-map.html`, and `examples/temporal-year-chart.html` for ready-to-run pages.

## Styling options
### Styling under the control of data attributes
Many of the visualisations have elements whose style is under the control of the third pary libraries used, e.g. tabulator and brcAtlas. Some of these styles are under the control of tanvis data attributes including:
- The shape of map dots for the species-map and grid-stats-map visualisations.
- The colour of map dots for the species-map and grid-stats-map visualisations.
- The graphic style of the temporal-year-chart visualisation (either bar or line).
- The colour of the lines or bars.
For all of these options, see the relevant documentation for the visualisation type.
### CSS styling
Textual elements in many visualisations can be overridden using CSS as described below.

The captions which appear above tables (visualistion types increasing-species-table, new-species-table and species-absent-table) can be tagetted with the following CSS selector:
```css
.tanvis .tanvis-table-header-text {
  /* Your styles here */
}
```

All the text in the species-name-block visualisation can be targetted with the following CSS selector:
```css
.tanvis span[data-tanvis-species-name-block="content"] {
  /* Your styles here */
}
```

The primary name in the species-name-block visualisation (either scientific or vernacular depending on your data attribute choices) can be targetting with the following CSS selector:
```css
.tanvis span[data-tanvis-species-name-block="primary"] {
  /* Your styles here */
}
```
The secondary name in the species-name-block visualisation (either scientific or vernacular depending on your data attribute choices) can be targetting with the following CSS selector:
```css
.tanvis span[data-tanvis-species-name-block="secondary"] {
  /* Your styles here */
}
```

The text in the species-remarks-block visualisation can be targetted with the following CSS selector:
```css
.tanvis span[data-tanvis-species-remarks-block="content"] {
  /* Your styles here */
}
```

The table containing the text in the species-info-table can be targetted with the following CSS selector:
```css
.tanvis table[data-tanvis-species-info-block="content"] {
  /* Your styles here */
}
```


