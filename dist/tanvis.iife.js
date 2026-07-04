var Tanvis = (function (exports) {
  'use strict';

  function scan(root, selector = '.tanvis') {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(root.querySelectorAll(selector));
  }

  function parseOptions(element) {
    const dataset = element?.dataset || {};
    const expand = parseOptionalBoolean(dataset.visExpand);
    const width = parseOptionalPositiveNumber$2(dataset.visWidth);
    const height = parseOptionalPositiveNumber$2(dataset.visHeight);
    const topN = parseOptionalPositiveInteger(dataset.visTopN);

    return {
      type: dataset.visType || 'table',
      source: dataset.visSource,
      startDate: dataset.visStartDate,
      endDate: dataset.visEndDate,
      area: dataset.visArea || 'vc-58-59-60',
      ctl: parseBoolean(dataset.visCtl),
      boundaries: parseBoolean(dataset.visBoundaries),
      hectads: parseBooleanDefaultTrue(dataset.visHectads),
      ...(topN !== undefined ? { topN } : {}),
      ...(expand !== undefined ? { expand } : {}),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {})
    };
  }

  function parseBoolean(value) {
    return String(value).toLowerCase() === 'true';
  }

  function parseBooleanDefaultTrue(value) {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    return String(value).toLowerCase() === 'true';
  }

  function parseOptionalBoolean(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return String(value).toLowerCase() === 'true';
  }

  function parseOptionalPositiveNumber$2(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  }

  function parseOptionalPositiveInteger(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  function validateAttributes(config) {
    if (!config.type) {
      return ['Missing data-vis-type'];
    }

    if (config.type === 'new-species-table' && !config.startDate) {
      return ['Missing data-vis-start-date for new-species-table'];
    }

    return [];
  }

  const renderers = new Map();

  function registerRenderer(name, renderer) {
    renderers.set(name, renderer);
  }

  function getRenderer(name) {
    return renderers.get(name);
  }

  // The object 'dataset' is the standard browser API for HTML data-* attributes.
  // When code sets something like: element.dataset.tanvisRendered = 'true'
  // the browser reflects that as: data-tanvis-rendered="true" on the element in the DOM.

  function markRendered(element) {
    element.dataset.tanvisRendered = 'true';
  }

  function warn(message) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[tanvis] ${message}`);
    }
  }

  function render(element) {
    const config = parseOptions(element);
    const errors = validateAttributes(config);

    if (errors.length > 0) {
      warn(errors[0]);
      return { rendered: false, errors };
    }

    const renderer = getRenderer(config.type);

    if (!renderer) {
      warn(`No renderer registered for type "${config.type}"`);
      return { rendered: false, errors: [`No renderer registered for type "${config.type}"`] };
    }

    renderer(element, config);
    markRendered(element);

    return { rendered: true, errors: [] };
  }

  // Placeholder for Tabulator adapter.
  // This will allow users to specify Tabulator tables as a visualization 
  // type in their HTML, and have them rendered using the Tabulator library.  

  function createTabulatorAdapter() {
    return {
      name: 'tabulator',
      render() {
        throw new Error('Tabulator adapter not implemented yet');
      }
    };
  }

  const tableAdapter = createTabulatorAdapter();

  function renderTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    tableAdapter.render(element, config);
  }

  // Wrapper to adapt BRC Charts for use in Tanvis.
  // This allows users to specify BRC Charts as a visualization 
  // type in their HTML, and have them rendered using the BRC Charts library.

  function createBrcChartsAdapter() {
    return {
      name: 'brc-charts',
      render() {
        throw new Error('BRC charts adapter not implemented yet');
      }
    };
  }

  const chartAdapter = createBrcChartsAdapter();

  function renderChart(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    chartAdapter.render(element, config);
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  const SHARED_STYLES_ID = 'tanvis-shared-styles';
  const SHARED_STYLES = `
.tanvis-controls {
  width: 100%;
  margin-top: 0;
}

.tanvis-controls-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tanvis-controls-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border: 1px solid #9ca3af;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1 system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
}

.tanvis-controls-toggle-label {
  line-height: 1;
}

.tanvis-controls-toggle:hover {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-toggle:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-toggle[aria-expanded="true"] {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-group {
  display: block;
}

.tanvis-controls-group[hidden] {
  display: none;
}

.tanvis-controls-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.tanvis-controls-option {
  position: relative;
  display: inline-flex;
}

.tanvis-controls-option + .tanvis-controls-option {
  margin-left: -1px;
}

.tanvis-controls-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.tanvis-controls-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  text-transform: lowercase;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-input:hover + .tanvis-controls-text {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-input:focus-visible + .tanvis-controls-text {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-input:checked + .tanvis-controls-text {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-input:disabled + .tanvis-controls-text {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

  function ensureSharedStyles() {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(SHARED_STYLES_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = SHARED_STYLES_ID;
    style.textContent = SHARED_STYLES;
    document.head.appendChild(style);
  }

  function createControlsPanel(options = {}) {
    ensureSharedStyles();

    const label = options.label || 'Data options';
    const ariaLabel = options.ariaLabel || 'Toggle controls';
    const expanded = options.expanded !== false;

    const panel = document.createElement('div');
    panel.className = 'tanvis-controls';

    const header = document.createElement('div');
    header.className = 'tanvis-controls-header';
    panel.appendChild(header);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tanvis-controls-toggle';
    toggle.setAttribute('aria-label', ariaLabel);
    toggle.setAttribute('aria-expanded', String(expanded));
    header.appendChild(toggle);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'tanvis-controls-toggle-icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '⚙';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'tanvis-controls-toggle-label';
    toggleLabel.textContent = label;

    toggle.appendChild(toggleIcon);
    toggle.appendChild(toggleLabel);

    const body = document.createElement('div');
    body.className = 'tanvis-controls-group';
    body.hidden = !expanded;
    panel.appendChild(body);

    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;
      toggle.setAttribute('aria-expanded', String(nextExpanded));
      body.hidden = !nextExpanded;
    });

    return { panel, body, toggle };
  }

  function createRadioGroup(options) {
    const group = document.createElement('div');
    group.className = options.groupClassName || 'tanvis-controls-options';

    for (const option of options.items || []) {
      const label = document.createElement('label');
      label.className = options.optionClassName || 'tanvis-controls-option';

      const input = document.createElement('input');
      input.className = options.inputClassName || 'tanvis-controls-input';
      input.type = 'radio';
      input.name = options.name;
      input.value = option.value;
      input.checked = options.selectedValue === option.value;
      input.addEventListener('change', () => {
        if (!input.checked || typeof options.onChange !== 'function') {
          return;
        }

        options.onChange(option.value);
      });

      const text = document.createElement('span');
      text.className = options.textClassName || 'tanvis-controls-text';
      text.textContent = option.label;

      label.appendChild(input);
      label.appendChild(text);
      group.appendChild(label);
    }

    return group;
  }

  const areaOptions = [
    { label: 'vc58', value: 'vc-58' },
    { label: 'vc59', value: 'vc-59' },
    { label: 'vc60', value: 'vc-60' },
    { label: 'all', value: 'vc-58-59-60' }
  ];

  function createAreaControls({ element, selectedValue, onAreaChange }) {
    const { panel, body } = createControlsPanel({
      label: 'Data options',
      ariaLabel: 'Toggle map controls'
    });
    panel.dataset.tanvisControls = 'area';

    const groupName = `${element.id}-area`;
    const group = createRadioGroup({
      name: groupName,
      selectedValue,
      items: areaOptions,
      onChange: (value) => {
        element.dataset.visArea = value;
        if (typeof onAreaChange === 'function') {
          onAreaChange(value);
        }
      }
    });

    body.appendChild(group);

    return panel;
  }

  const transOptsSel = {
    // Different views for the three VCs in the Cheshire/Lancashire area
    // and a combined view for all of them together.
    'vc-58-59-60': {
      id: 'vc-58-59-60',
      caption: 'Cheshire Lancashire VCs',
      initZoom: 8,
      bounds: {
        xmin: 302500,
        ymin: 325000,
        xmax: 425000,
        ymax: 495000
      },
      centroid: {
        lat: 53.585317,
        lon: -2.549048
      }
    },
    'vc-58': {
      id: 'vc-58',
      caption: 'Cheshire (58)',
      initZoom: 9,
      bounds: {
        xmin: 305000,
        ymin: 325000,
        xmax: 425000,
        ymax: 415000
      },
      centroid: {
        lat: 53.225875,
        lon: -2.525714
      }
    },
    'vc-59': {
      id: 'vc-59',
      caption: 'South Lancashire (59)',
      initZoom: 9,
      bounds: {
        xmin: 315000,
        ymin: 375000,
        xmax: 405000,
        ymax: 455000
      },
      centroid: {
        lat: 53.629982,
        lon: -2.606334
      }
    },
    'vc-60': {
      id: 'vc-60',
      caption: 'West Lancashire (60)',
      initZoom: 9,
      bounds: {
        xmin: 315000,
        ymin: 415000,
        xmax: 385000,
        ymax: 495000
      },
      centroid: {
        lat: 53.988606,
        lon: -2.764047
      }
    }
  };

  // Wrapper to adapt BRC Atlas maps for use in Tanvis.
  // This allows users to specify BRC Atlas maps as a visualization 
  // type in their HTML, and have them rendered using the BRC Atlas library.

  let mapIdCounter$1 = 0;

  function createBrcAtlasAdapter() {
    return {
      name: 'static-map',
      render(element, config) {
        const brcAtlas = getBrcAtlasGlobal$1();

        if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
          throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
        }

        if (!element.id) {
          mapIdCounter$1 += 1;
          element.id = `tanvis-map-${mapIdCounter$1}`;
        }

        clearElement(element);

        console.log('Creating BRC Atlas map with config:', config);

        const map = brcAtlas.svgMap(createMapOptions$1(element, config));

        if (map && typeof map.setIdentfier === 'function' && config.source) {
          map.setIdentfier(config.source);
        }

        if (map && typeof map.redrawMap === 'function') {
          map.redrawMap();
        }

        if (config.ctl) {
          element.appendChild(createAreaControls({
            element,
            selectedValue: config.area,
            onAreaChange: (value) => {
              createBrcAtlasAdapter().render(element, {
                ...config,
                area: value
              });
            }
          }));
        }

        return map;
      }
    };
  }

  function createMapOptions$1(element, config) {
    const includeHectads = config.hectads !== false;
    const shouldExpand = config.expand === true;
    const width = parseOptionalPositiveNumber$1(config.width);
    const explicitHeight = parseOptionalPositiveNumber$1(config.height);
    const selectedBounds = transOptsSel[config.area]?.bounds;
    // For static maps, width is derived from transOpts. If data-vis-height is provided,
    // use it directly; otherwise fall back to calculating height from data-vis-width.
    const height = explicitHeight ?? calculateHeightFromBounds$1(width, selectedBounds);

    return {
      selector: `#${element.id}`,
      transOptsControl: config.ctl,
      transOptsSel,
      transOptsKey: config.area,
      transOptsControl: false, // We create our own custom control for area selection, so disable the built-in one.
      boundaryGjson: `/data/vcs/simp-100/${config.area}-100.geojson`, 
      // Static map width is determined by the selected transOpts bounds, so only height is passed through.
      ...(height !== undefined ? { height } : {}),
      ...(shouldExpand ? { expand: true } : {}),
      ...(includeHectads
        ? { gridGjson: `/data/vcs/hectad-grids/${config.area}-hectads.geojson` }
        : { gridLineStyle: 'none' })
    };
  }

  function parseOptionalPositiveNumber$1(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  }

  function calculateHeightFromBounds$1(width, bounds) {
    if (width === undefined || !bounds) {
      return undefined;
    }

    const boxWidth = bounds.xmax - bounds.xmin;
    const boxHeight = bounds.ymax - bounds.ymin;
    if (boxWidth <= 0 || boxHeight <= 0) {
      return undefined;
    }

    return Math.round(width * (boxHeight / boxWidth));
  }

  function getBrcAtlasGlobal$1() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brcatlas || null;
  }

  const atlasAdapter = createBrcAtlasAdapter();

  function renderStaticMap(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    atlasAdapter.render(element, config);
  }

  // Wrapper to adapt BRC Atlas Leaflet maps for use in Tanvis.
  // This allows users to specify Leaflet/slippy maps as a visualization 
  // type in their HTML, and have them rendered using the BRC Atlas library.

  let mapIdCounter = 0;

  function createLeafletMapAdapter() {
    return {
      name: 'leaflet-map',
      render(element, config) {
        const brcAtlas = getBrcAtlasGlobal();

        if (!brcAtlas || typeof brcAtlas.leafletMap !== 'function') {
          throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
        }

        if (!element.id) {
          mapIdCounter += 1;
          element.id = `tanvis-leaflet-map-${mapIdCounter}`;
        }

        // Clean up any previously attached expand listeners before re-rendering this element.
        clearExpandResizeHandlers(element);
        clearElement(element);

        console.log('Creating BRC Atlas Leaflet map with config:', config);

        const map = brcAtlas.leafletMap(createMapOptions(element, config));

        if (config.expand === true) {
          // Expand is handled locally for slippy maps: watch parent/container resize and sync map size.
          attachExpandResizeHandlers(element, config, map);
        }

        panToAreaCentroid(config.area, map);

        if (map && typeof map.setIdentfier === 'function' && config.source) {
          map.setIdentfier(config.source);
        }

        if (map && typeof map.redrawMap === 'function') {
          map.redrawMap();
        }

        if (config.ctl) {
          element.appendChild(createAreaControls({
            element,
            selectedValue: config.area,
            onAreaChange: (value) => {
              handleAreaSelection(value, element, config, map);
            }
          }));
        }

        return map;
      }
    };
  }

  function createMapOptions(element, config) {
    const width = getConfiguredWidth(element, config);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = transOptsSel[config.area]?.bounds;
    // For slippy maps, width and height can be specified independently.
    // If data-vis-height is not provided, derive height from data-vis-width and selected bounds.
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);
    const showBoundaries = config.boundaries === true;

    return {
      selector: `#${element.id}`,
      showVcs: showBoundaries,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    };
  }

  function getConfiguredWidth(element, config) {
    const configuredWidth = parseOptionalPositiveNumber(config.width);

    if (config.expand !== true) {
      return configuredWidth;
    }

    // When expand is enabled, prefer parent width and only fall back to configured width.
    return getParentWidth(element) ?? configuredWidth;
  }

  function getParentWidth(element) {
    return parseOptionalPositiveNumber(element?.parentElement?.clientWidth);
  }

  function parseOptionalPositiveNumber(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  }

  function calculateHeightFromBounds(width, bounds) {
    if (width === undefined || !bounds) {
      return undefined;
    }

    const boxWidth = bounds.xmax - bounds.xmin;
    const boxHeight = bounds.ymax - bounds.ymin;
    if (boxWidth <= 0 || boxHeight <= 0) {
      return undefined;
    }

    return Math.round(width * (boxHeight / boxWidth));
  }

  function attachExpandResizeHandlers(element, config, map) {
    const onResize = () => {
      resizeExpandedMap(element, config, map);
    };

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && element.parentElement) {
      // Track parent-size changes directly when ResizeObserver is available.
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(element.parentElement);
    }

    if (typeof window !== 'undefined') {
      // Also listen to window resize as a broad fallback signal.
      window.addEventListener('resize', onResize);
    }

    element.__tanvisExpandCleanup = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize);
      }
    };
  }

  function clearExpandResizeHandlers(element) {
    const cleanup = element?.__tanvisExpandCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisExpandCleanup;
  }

  function resizeExpandedMap(element, config, map) {
    if (!map || typeof map.setSize !== 'function') {
      return;
    }

    const width = getParentWidth(element);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = transOptsSel[config.area]?.bounds;
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

    if (width === undefined || height === undefined) {
      return;
    }

    // Resize BRC Atlas map and then force a Leaflet refresh cycle.
    map.setSize(width, height);

    if (typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }

  function handleAreaSelection(value, element, config, map) {
    if (value === 'vc-58') {
      onSelectVc58(element, config, map);
      return;
    }

    if (value === 'vc-59') {
      onSelectVc59(element, config, map);
      return;
    }

    if (value === 'vc-60') {
      onSelectVc60(element, config, map);
      return;
    }

    onSelectAll(element, config, map);
  }

  function onSelectVc58(_element, _config, map) {
    panToAreaCentroid('vc-58', map);
  }

  function onSelectVc59(_element, _config, map) {
    panToAreaCentroid('vc-59', map);
  }

  function onSelectVc60(_element, _config, map) {
    panToAreaCentroid('vc-60', map);
  }

  function onSelectAll(_element, _config, map) {
    panToAreaCentroid('vc-58-59-60', map);
  }

  function panToAreaCentroid(areaKey, map) {
    const areaConfig = transOptsSel[areaKey];
    const centroid = areaConfig?.centroid;
    const zoom = areaConfig?.initZoom ?? 10;
    const leafletMap = map?.lmap;

    if (!centroid || !leafletMap || typeof leafletMap.setView !== 'function') {
      return;
    }

    leafletMap.setView([centroid.lat, centroid.lon], zoom);
  }

  function getBrcAtlasGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brcatlas || null;
  }

  const leafletMapAdapter = createLeafletMapAdapter();

  function renderLeafletMap(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    leafletMapAdapter.render(element, config);
  }

  const DEFAULT_ENDPOINT$1 = '/api/new-species';
  const columns$1 = [
    { title: 'Species ID', field: 'speciesId', sorter: 'number' },
    { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
    { title: 'Common name', field: 'commonName', sorter: 'string' },
    { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
    { title: 'VC number', field: 'vcNumber', sorter: 'number' }
  ];

  function createNewSpeciesTableAdapter() {
    return {
      name: 'new-species-table',
      render(element, config) {
        clearElement(element);
        element.textContent = 'Loading...';

        const startDate = config.startDate;
        const endDate = config.endDate || getCurrentIsoDate();
        const endpoint = config.source || DEFAULT_ENDPOINT$1;
        const requestUrl = new URL(endpoint, window.location.origin);
        requestUrl.searchParams.set('startDate', startDate);
        requestUrl.searchParams.set('endDate', endDate);

        fetch(requestUrl.toString())
          .then(async (response) => {
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to load new species data');
            }

            const records = Array.isArray(payload) ? payload : payload.records || [];
            const Tabulator = getTabulatorGlobal$1();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary$1(startDate, endDate, records.length));
            element.appendChild(createTableContainer$1(records, Tabulator));
          })
          .catch((error) => {
            clearElement(element);
            element.textContent = error.message;
          });
      }
    };
  }

  function createSummary$1(startDate, endDate, count) {
    const summary = document.createElement('p');
    summary.textContent = `${count} new species between ${startDate} and ${endDate}`;
    return summary;
  }

  function createTableContainer$1(records, Tabulator) {
    const container = document.createElement('div');

    new Tabulator(container, {
      data: records,
      columns: columns$1,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      placeholder: 'No records found'
    });

    return container;
  }

  function getCurrentIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function getTabulatorGlobal$1() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  const newSpeciesTableAdapter = createNewSpeciesTableAdapter();

  function renderNewSpeciesTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    newSpeciesTableAdapter.render(element, config);
  }

  const DEFAULT_ENDPOINT = '/api/species-stats/increasing';
  const DEFAULT_TOP_N = 50;
  const columns = [
    { title: 'Species ID', field: 'speciesId', sorter: 'number' },
    { title: 'VC number', field: 'vcNumber', sorter: 'number' },
    { title: 'Rarity category', field: 'rarityCategory', sorter: 'string' },
    { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
    { title: 'Total records', field: 'totalRecords', sorter: 'number' },
    { title: 'Occupied grid squares', field: 'occupiedGridSquares', sorter: 'number' },
    { title: 'Frequency trend', field: 'frequencyTrendScore', sorter: 'number' }
  ];

  function createIncreasingSpeciesTableAdapter() {
    return {
      name: 'increasing-species-table',
      render(element, config) {
        clearElement(element);
        element.textContent = 'Loading...';

        const topN = parseTopN(config.topN) ?? DEFAULT_TOP_N;
        const endpoint = config.source || DEFAULT_ENDPOINT;
        const requestUrl = new URL(endpoint, window.location.origin);
        requestUrl.searchParams.set('topN', String(topN));

        fetch(requestUrl.toString())
          .then(async (response) => {
            const payload = await response.json();

            if (!response.ok) {
              throw new Error(payload?.error || 'Failed to load increasing species data');
            }

            const records = Array.isArray(payload) ? payload : payload.records || [];
            const Tabulator = getTabulatorGlobal();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary(topN, records.length));
            element.appendChild(createTableContainer(records, Tabulator));
          })
          .catch((error) => {
            clearElement(element);
            element.textContent = error.message;
          });
      }
    };
  }

  function createSummary(topN, count) {
    const summary = document.createElement('p');
    summary.textContent = `${count} species returned (top ${topN} by frequency trend)`;
    return summary;
  }

  function createTableContainer(records, Tabulator) {
    const container = document.createElement('div');

    new Tabulator(container, {
      data: records,
      columns,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      initialSort: [
        { column: 'frequencyTrendScore', dir: 'desc' }
      ],
      placeholder: 'No records found'
    });

    return container;
  }

  function parseTopN(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  function getTabulatorGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  const increasingSpeciesTableAdapter = createIncreasingSpeciesTableAdapter();

  function renderIncreasingSpeciesTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    increasingSpeciesTableAdapter.render(element, config);
  }

  // Makes initialization idempotent so calling init() repeatedly 
  // does not keep re-registering the same renderers.


  let defaultsRegistered = false;

  function registerDefaults() {
    if (defaultsRegistered) {
      return;
    }

    registerRenderer('table', renderTable);
    registerRenderer('chart', renderChart);
    registerRenderer('static-map', renderStaticMap);
    registerRenderer('slippy-map', renderLeafletMap);
    registerRenderer('new-species-table', renderNewSpeciesTable);
    registerRenderer('increasing-species-table', renderIncreasingSpeciesTable);
    defaultsRegistered = true;
  }

  function init() {
    registerDefaults();

    const elements = scan(document, '.tanvis');

    return elements.map((element) => render(element));
  }

  const version = '0.1.0';

  if (typeof window !== 'undefined') {
    window.Tanvis = window.Tanvis || {};
    window.Tanvis.init = init;
    window.Tanvis.version = version;
  }

  exports.init = init;
  exports.version = version;

  return exports;

})({});
//# sourceMappingURL=tanvis.iife.js.map
