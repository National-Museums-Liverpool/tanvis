# tanvis

Browser-first visualisation library to display data and information from TanHub.

## Examples
An index of example pages demonstrating the visualisations can be found at [examples/examples-index.html](examples/examples-index.html).

## Architectural overview

- Plain JavaScript source code
- Rollup-built browser bundle
- Data-attribute driven container discovery
- Small adapter layer for third-party visualisation libraries

## Scripts

- `npm run build` - build the browser bundle
- `npm run build:wp` - build the WordPress bundle
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

### Configuration

Host pages can set configuration on `window.Tanvis.config`. Set `apiBase` to override the default API URL; `assetBase` optionally overrides the location used to load Tanvis data assets.

```js
window.Tanvis = window.Tanvis || {};
window.Tanvis.config = {
  apiBase: 'https://example.com/api/v1',
  assetBase: '/tanvis/'
};
```

Tanvis normally derives `assetBase` from the URL of its script. It’s configurable for hosts where those files are served from a different location. For example the WordPress plugin packages them under its own assets directory, so it sets `assetBase` to that directory's URL.

## Renderers

Tanvis registers the following renderer types. Add an element with class `tanvis` and `data-vis-type="<type>"` and call `Tanvis.init()`.

| Type | Purpose |
| --- | --- |
| `control-block` | A control block that allows users to set region (vice county), taxon group, language (vernacular or scientific) and species. Other visualisations can subscribe to this control and respond to user actions. |
| `species-identifier` | Hidden element that supplies a taxon id to other visualisations. This provides a place where the taxon id can be set once and all visualisations on a page that subscribe to it, will respond to the value set. |
| `species-map` | Distribution map for a single taxon. |
| `grid-stats-map` | Map of grid-square statistics (species, records or rarity). |
| `temporal-year-chart` | Bar or line chart showing records / squares per year for a taxon. |
| `new-species-table` | Species recorded for the first time within a date range. |
| `increasing-species-table` | Top species by frequency trend. |
| `species-absent-table` | Species not recorded since a given year. |
| `records-table` | Occurrence records for a taxon (and optionally a given tetrad). |
| `species-name-block` | Scientific and/or vernacular names of a taxon. |
| `species-remarks-block` | Displays the remarks for a taxon that are stored in TabHub. |
| `species-info-block` | Conservation status and record summary for a taxon. |
| `species-image` | Image (with caption, attribution, licence) for a taxon. |
| `general-info-block` | Fixed information text describing the data sources. |
| `help-block` | Generated documentation of every renderer's data attributes, with example HTML and shortcodes. |

The authoritative list of attributes, defaults and descriptions for each renderer is defined in `src/config/visAttributeSchema.js` and is displayed by the `help-block` renderer (see `examples/help.html` and `examples/interactive.html`).

### Common behaviour

- **API base**: all renderers use `window.Tanvis.config.apiBase` if set, otherwise `https://tanhub.northwestinvertebrates.org.uk/api/v1`.
- **Region**: `data-vis-region` is one of `vc-58`, `vc-59`, `vc-60`, `vc-all` (default `vc-all`).
- **Control block**: `data-vis-control="<id>"` subscribes a visualisation to a `control-block` element with that id. The control block's current selection takes precedence over the visualisation's own `data-vis-region`, `data-vis-groupid` and `data-vis-language`, both initially and on later changes. Controls communicate with `region-change`, `taxon-group-change` and `language-change` events.
- **Taxon source**: `data-vis-taxon-id-source="<id>"` subscribes a taxon-based visualisation to `taxon-identified` events (`detail.speciesId`) raised by another element - a `species-identifier`, a table (on row click) or a control block species search. `data-vis-taxonid` sets the initial taxon.
- **Sizing**: `data-vis-expand` (`true`/`false`), `data-vis-width` and `data-vis-height` (pixels) are available on maps, the chart and the image.
- **Invalid attributes**: values are validated against the schema and an error message is reported in the page for invalid or missing required attributes.

### Control Block (`control-block`)

Attributes: `data-vis-region`, `data-vis-groupid`, `data-vis-language` (`scientific`/`vernacular`), `data-vis-control-elements` (space-separated subset of `region groups language species`, default all four), `data-vis-show-data-opts-toggle` and `data-vis-show-data-opts-expanded` (both default `true`).

The block must have an `id`. It renders region radio buttons, a taxon-group dropdown (first option `All groups`; Scientific/Vernacular radio buttons switch the labels between the `title` and `friendly` fields) and a species search. The section can be collapsed with the data options toggle.

```html
<div id="vc-control" class="tanvis" data-vis-type="control-block"></div>
```

### Species Identifier (`species-identifier`)

Renders nothing. Raises a `taxon-identified` event on load using the `taxon-id` URL query parameter, or its `data-vis-taxonid` attribute if the parameter is absent. Other visualisations subscribe with `data-vis-taxon-id-source`.

```html
<div id="species" class="tanvis" data-vis-type="species-identifier" data-vis-taxonid="NBNORG0000008963"></div>
```

### Species Map (`species-map`)

Attributes: `data-vis-taxonid`, `data-vis-taxon-id-source`, `data-vis-control`, `data-vis-region`, `data-vis-map-type`, `data-vis-hectads`, `data-vis-boundaries`, `data-vis-download-button`, `data-vis-dot-shape`, `data-vis-dot-colour`, `data-vis-transformation`, `data-vis-expand`, `data-vis-width`, `data-vis-height`.

- `data-vis-map-type`: `static` (classic atlas map, default), `leaflet` (interactive) or `switch` (user can switch between the two).
- `data-vis-hectads`: hectad grid lines (static maps only). 
- `data-vis-boundaries`: VC boundaries (Leaflet maps only; always shown on the static map).
- `data-vis-download-button`: `true` shows a download button on static maps (default `false`).
- `data-vis-dot-shape`: `circle` or `square`. 
- `data-vis-dot-colour`: any CSS colour, or `viridis` / `cividis` to colour dots by record count. 
- `data-vis-transformation`: applies a transformation to the metric used to colour the dots. This is useful to mitigate the skewing effect of outliers (e.g. extreme high record or species counts for a single tetrad): `none`, `deciles`, `sqrt`, `cbrt`, `log10` or `log`.

Occurrences are fetched from the TanHub `occurrences` API for the taxon and region. Clicking a tetrad raises a `tetrad-clicked` event (used by `records-table`). Requires D3 and BRC Atlas (plus Leaflet for Leaflet maps) before Tanvis.

```html
<div
  class="tanvis"
  data-vis-type="species-map"
  data-vis-taxonid="NBNORG0000008963"
  data-vis-map-type="switch"
  data-vis-download-button="true"
  data-vis-dot-colour="viridis"
  data-vis-transformation="deciles"
></div>
```

### Grid Stats Map (`grid-stats-map`)

Uses the same map, control, dot and sizing attributes as the species map (including `data-vis-download-button`), plus `data-vis-grid-stats-type`: `species` (default), `records`, `rarity` or `switch` (user can switch statistic). It has no taxon attributes and raises no events. Data is fetched from `grid-square-stats` for the region.

```html
<div 
  class="tanvis"
  data-vis-type="grid-stats-map" 
  data-vis-grid-stats-type="switch"
  data-vis-dot-colour="viridis"
  data-vis-transformation="deciles"
></div>
```

### Temporal Year Chart (`temporal-year-chart`)

Attributes: `data-vis-taxonid`, `data-vis-taxon-id-source`, `data-vis-control`, `data-vis-region`, `data-vis-temporal-stats-type` (`records`, `squares` or `switch`), `data-vis-chart-type` (`line` or `bar`), `data-vis-records-colour`, `data-vis-squares-colour`, `data-vis-start-year` (default `year-11`), `data-vis-end-year` (default `year-1`), `data-vis-expand`, `data-vis-width`, `data-vis-height`.

Years may be given as `yyyy` or relative `year-n`. Data is fetched from `taxon-year-stats` and drawn with `brccharts.temporal`; the chart updates in place when the taxon or region changes. Requires D3 and BRC Charts before Tanvis.

```html
<div
  class="tanvis"
  data-vis-type="temporal-year-chart"
  data-vis-taxonid="NBNORG0000008963"
  data-vis-chart-type="bar"
  data-vis-temporal-stats-type="switch"
  data-vis-start-year="2000"
  data-vis-end-year="year-1"
  data-vis-region="vc-all"
  data-vis-control="my-control-block"
  data-vis-expand="false"
  data-vis-width="800"
  data-vis-height="600"
></div>
```

### Species tables

The three species tables use Tabulator with remote pagination (include Tabulator and its CSS before Tanvis). They query the TanHub `taxon-stats` API filtered to species rank, by region and, if set, taxon group, and show a summary caption above the table. They respond to `region-change`, `taxon-group-change` and `language-change` events from a linked control block, and raise `taxon-identified` events with `detail.speciesId` when a row is clicked.

Shared attributes: `data-vis-region`, `data-vis-groupid`, `data-vis-language`, `data-vis-control`, `data-vis-page-size` (default `15`), `data-vis-sort` (`default`, `records`, `tetrads` or `group`) and `data-vis-link`.

`data-vis-link` adds link columns using `<column-title>^^<link-text>^^<link-url>`; the URL must contain `<tvk>`, which is replaced by the taxon id. Separate multiple links with `^^^`.

#### New Species Table (`new-species-table`)

Additional attributes: `data-vis-start-date` and `data-vis-end-date` to specify the date range within which to list new species. Dates may be explicity specified as `yyyy-mm-dd` or relative as `month-n` or `year-n`. Lists species whose first record (`first_record_date`) falls in the date range, sorted by first record date, descending, by default.

```html
<div 
  class="tanvis" 
  data-vis-type="new-species-table" 
  data-vis-start-date="2025-01-01" 
  data-vis-end-date="2025-12-31"
></div>
```

#### Increasing Species Table (`increasing-species-table`)

Additional attribute: `data-vis-top-n` (default `50`). Lists the top N species ranked by `frequency_trend`, sorted by trend descending by default.

```html
<div 
  class="tanvis" 
  data-vis-type="increasing-species-table" 
  data-vis-top-n="25"
></div>
```

#### Species Absent Since Table (`species-absent-table`)

Additional attribute: `data-vis-year` (default `2000`; `yyyy` or `year-n`). Lists species whose last record (`last_record_date`) falls on or before the end of that year; sorted by last record date, descending, by default.

```html
<div
  class="tanvis"  
  data-vis-type="species-absent-table"  
  data-vis-year="2000"
></div>
```

### Records Table (`records-table`)

Attributes: `data-vis-taxonid`, `data-vis-taxon-id-source`, `data-vis-control`, `data-vis-region`, `data-vis-page-size`. Uses Tabulator to list `occurrences` for the taxon and region. When `data-vis-taxon-id-source` points at a species map, clicking a tetrad on the map (`tetrad-clicked`) filters the table to that tetrad.

```html
<div 
  class="tanvis" 
  data-vis-type="records-table" 
  data-vis-taxonid="NBNORG0000008963"
  data-vis-taxon-id-source="species-map-1" 
  data-vis-control="vc-control"
  data-vis-region="vc-58"
></div>
```

### Species blocks

All of these can take `data-vis-taxonid` or `data-vis-taxon-id-source`.

#### Species Name Block (`species-name-block`)

Additional attributes: `data-vis-primary-name` (`scientific`/`vernacular`, default `scientific`), `data-vis-secondary-name` (`scientific`/`vernacular`/`none`, default `vernacular`, shown in parentheses) and `data-vis-authority` (default `true`; only applies when the scientific name is shown).

```html
<div
  class="tanvis"
  data-vis-type="species-name-block"
  data-vis-taxonid="NBNORG0000008963"
  data-vis-taxon-id-source="species"
  data-vis-primary-name="scientific"
  data-vis-secondary-name="vernacular"
  data-vis-authority="true"
></div>
```

#### Species Remarks Block (`species-remarks-block`)

No additional attributes. Shows the taxon's remarks, or "No species remarks available."

```html
<div
  class="tanvis"
  data-vis-type="species-remarks-block"
  data-vis-taxonid="NBNORG0000008994"
  data-vis-taxon-id-source="species"
></div>
```

#### Species Info Block (`species-info-block`)

Additional attributes: `data-vis-control` and `data-vis-region`. Shows conservation status, number of records, number of grid squares and average records per year (for the last 10 years) for the region.

```html
<div
  class="tanvis"
  data-vis-type="species-info-block"
  data-vis-taxonid="NBNORG0000008994"
  data-vis-taxon-id-source="species"
  data-vis-control="vc-control"
  data-vis-region="vc-all"
></div>
```

#### Species Image (`species-image`)

Shows an image from the taxon's `taxa` media. Additional attributes: `data-vis-image-variant` (`none`, `large`, `thumbnail`), `data-vis-uuid` (a specific image, ignoring sort order and primary flag), `data-vis-show-image-caption`, `data-vis-show-image-attribution`, `data-vis-show-image-license` (all default `true`), `data-vis-expand`, `data-vis-width` and `data-vis-height`.

```html
<div
  class="tanvis"
  data-vis-type="species-image"
  data-vis-taxonid="NBNORG0000008994"
  data-vis-image-variant="large"
  data-vis-show-image-caption="true"
  data-vis-show-image-attribution="true"
  data-vis-show-image-license="true"
  data-vis-width="400"
></div>
```

### Information blocks

- `general-info-block`: fixed text describing the data sources.
- `help-block`: lists every renderer with its description, example HTML and WordPress shortcode; the Example buttons dispatch `tanvis-example` and `tanvis-shortcode-example` events.

### Examples
See the pages in `examples/` (indexed by `examples/examples-index.html`) for ready-to-run examples, e.g. `species-map.html`, `grid-stats-map.html`, `new-species-table.html`, `increasing-species-table.html`, `species-absent-table.html`, `records-table.html`, `temporal-year-chart.html`, `species-image.html`, `species-info.html`, `species-account.html`, `table-linked-chart.html`, `table-linked-species-map.html` and `help.html`.

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
## Notes for developers
### Versioning
To see the current versions of the Node package, JS library and WordPress plugin, use this at the command prompt:
```
npm run ver
```

To set the current versions of the Node package and the JS library (and keep them in line), use this at the command prompt:
```
npm run ver -- <version-number>
```

To set the current version of the WordPress plugin, use this at the command prompt:
```
npm run ver:wp -- <version-number>
```

Since the WordPress plugin packages the JS library, if you rebuild the latter with a new version, you should rebuild and reversion the WordPress plugin too.
### Building
To build the JS library, use this at the command prompt:
```
npm run build
```

To build the WordPress plugin, use this at the command prompt:
```
npm run build:wp
```
This also creates or replaces `wordpress/tanvis.zip` with plugin files at the ZIP root and standard forward-slash paths. WordPress uses the archive name (`tanvis`) for the installed plugin folder.
