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
      control: dataset.visControl,
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

  function validateAttributes(config, element) {
    if (!config.type) {
      return ['Missing data-vis-type'];
    }

    if ((config.type === 'control-block' || config.type === 'control-bock') && !element?.id) {
      return ['Missing id attribute for control-block'];
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
    const errors = validateAttributes(config, element);

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

  const listenersByControlId = new Map();
  const latestEventByControlId = new Map();

  function subscribeToControl(controlId, handler) {
    if (!controlId || typeof handler !== 'function') {
      return () => {};
    }

    let listeners = listenersByControlId.get(controlId);
    if (!listeners) {
      listeners = new Set();
      listenersByControlId.set(controlId, listeners);
    }

    listeners.add(handler);

    return () => {
      const existing = listenersByControlId.get(controlId);
      if (!existing) {
        return;
      }

      existing.delete(handler);
      if (existing.size === 0) {
        listenersByControlId.delete(controlId);
      }
    };
  }

  function publishControlEvent(controlId, event) {
    if (!controlId) {
      return;
    }

    latestEventByControlId.set(controlId, event);

    const listeners = listenersByControlId.get(controlId);
    if (!listeners) {
      return;
    }

    // Publish to a snapshot so subscribe/unsubscribe during a handler does not
    // mutate the current dispatch cycle and cause re-entrant loops.
    const snapshot = Array.from(listeners);
    snapshot.forEach((handler) => handler(event));
  }

  function getLatestControlEvent(controlId) {
    if (!controlId) {
      return undefined;
    }

    return latestEventByControlId.get(controlId);
  }

  function getPayloadMessage(payload) {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim();
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    return '';
  }

  async function parseJsonSafe(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function createApiError({ response, payload, defaultMessage, cause } = {}) {
    const payloadMessage = getPayloadMessage(payload);
    const causeMessage = typeof cause?.message === 'string' ? cause.message.trim() : '';
    const fallbackMessage = defaultMessage || 'Request failed';
    const message = payloadMessage || causeMessage || fallbackMessage;

    const error = new Error(message);
    error.name = 'ApiError';
    error.isApiError = true;

    if (Number.isFinite(response?.status)) {
      error.status = response.status;
    }

    if (typeof cause !== 'undefined') {
      error.cause = cause;
    }

    return error;
  }

  function normalizeErrorMessage(error, fallbackMessage = 'An unexpected error occurred') {
    const message = typeof error?.message === 'string' && error.message.trim()
      ? error.message.trim()
      : fallbackMessage;

    if (error?.isApiError) {
      return `API error: ${message}`;
    }

    return message;
  }

  const VIS_STATUS_CLASS = 'tanvis-vis-status';
  const VIS_STATUS_STYLES_ID = 'tanvis-vis-status-styles';
  const VIS_STATUS_STYLES = `
.${VIS_STATUS_CLASS} {
  margin: 0.5rem 0 0;
  color: #4b5563;
  font: 500 0.85rem/1.3 system-ui, sans-serif;
}

.${VIS_STATUS_CLASS}.is-error {
  color: #9f1239;
}
`;

  function createVisStatusReporter(container) {
    ensureVisStatusStyles();

    return {
      showInfo(message) {
        showStatus(container, message, 'info');
      },
      showError(message) {
        showStatus(container, message, 'error');
      },
      clear() {
        clearStatus(container);
      }
    };
  }

  function showStatus(container, message, tone) {
    const status = ensureStatusElement(container);
    status.className = tone === 'error' ? `${VIS_STATUS_CLASS} is-error` : VIS_STATUS_CLASS;
    status.textContent = message || '';
  }

  function ensureStatusElement(container) {
    if (container.__tanvisVisStatusElement && container.__tanvisVisStatusElement.isConnected) {
      return container.__tanvisVisStatusElement;
    }

    const status = document.createElement('p');
    status.className = VIS_STATUS_CLASS;
    container.appendChild(status);
    container.__tanvisVisStatusElement = status;
    return status;
  }

  function clearStatus(container) {
    const status = container.__tanvisVisStatusElement;
    if (status?.parentNode) {
      status.parentNode.removeChild(status);
    }

    delete container.__tanvisVisStatusElement;
  }

  function ensureVisStatusStyles() {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(VIS_STATUS_STYLES_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = VIS_STATUS_STYLES_ID;
    style.textContent = VIS_STATUS_STYLES;
    document.head.appendChild(style);
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
        clearControlSubscription$3(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        try {
          const brcAtlas = getBrcAtlasGlobal$1();

          if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
            throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
          }

          if (!element.id) {
            mapIdCounter$1 += 1;
            element.id = `tanvis-map-${mapIdCounter$1}`;
          }

          const effectiveArea = getEffectiveArea$3(config);
          const renderConfig = effectiveArea === config.area
            ? config
            : {
                ...config,
                area: effectiveArea
              };

          element.dataset.visArea = renderConfig.area;

          console.log('Creating BRC Atlas map with config:', renderConfig);

          const map = brcAtlas.svgMap(createMapOptions$1(element, renderConfig));

          if (map && typeof map.setIdentfier === 'function' && renderConfig.source) {
            map.setIdentfier(renderConfig.source);
          }

          if (map && typeof map.redrawMap === 'function') {
            map.redrawMap();
          }

          if (renderConfig.control) {
            element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
              if (event?.type !== 'area-change' || !event.area) {
                return;
              }

              if (event.area === element.dataset.visArea) {
                return;
              }

              element.dataset.visArea = event.area;
              createBrcAtlasAdapter().render(element, {
                ...renderConfig,
                area: event.area
              });
            });
          }

          status.clear();
          return map;
        } catch (error) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render static map'));
          return null;
        }
      }
    };
  }

  function getEffectiveArea$3(config) {
    if (!config.control) {
      return config.area;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area) {
      return latestEvent.area;
    }

    if (typeof document === 'undefined') {
      return config.area;
    }

    const controlElement = document.getElementById(config.control);
    const controlArea = controlElement?.dataset?.visArea;
    return controlArea || config.area;
  }

  function clearControlSubscription$3(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
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
        // Clean up any previously attached expand listeners before re-rendering this element.
        clearExpandResizeHandlers(element);
        clearControlSubscription$2(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        try {
          const brcAtlas = getBrcAtlasGlobal();

          if (!brcAtlas || typeof brcAtlas.leafletMap !== 'function') {
            throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
          }

          if (!element.id) {
            mapIdCounter += 1;
            element.id = `tanvis-leaflet-map-${mapIdCounter}`;
          }

          const effectiveArea = getEffectiveArea$2(config);
          const renderConfig = effectiveArea === config.area
            ? config
            : {
                ...config,
                area: effectiveArea
              };

          element.dataset.visArea = renderConfig.area;

          console.log('Creating BRC Atlas Leaflet map with config:', renderConfig);

          const map = brcAtlas.leafletMap(createMapOptions(element, renderConfig));

          if (renderConfig.expand === true) {
            // Expand is handled locally for slippy maps: watch parent/container resize and sync map size.
            attachExpandResizeHandlers(element, renderConfig, map);
          }

          panToAreaCentroid(renderConfig.area, map);

          if (map && typeof map.setIdentfier === 'function' && renderConfig.source) {
            map.setIdentfier(renderConfig.source);
          }

          if (map && typeof map.redrawMap === 'function') {
            map.redrawMap();
          }

          if (renderConfig.control) {
            element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
              if (event?.type !== 'area-change' || !event.area) {
                return;
              }

              if (event.area === element.dataset.visArea) {
                return;
              }

              element.dataset.visArea = event.area;
              handleAreaSelection(event.area, element, renderConfig, map);
            });
          }

          status.clear();
          return map;
        } catch (error) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render slippy map'));
          return null;
        }
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

  function clearControlSubscription$2(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$2(config) {
    if (!config.control) {
      return config.area;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area) {
      return latestEvent.area;
    }

    if (typeof document === 'undefined') {
      return config.area;
    }

    const controlElement = document.getElementById(config.control);
    const controlArea = controlElement?.dataset?.visArea;
    return controlArea || config.area;
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

.tanvis-controls-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.tanvis-controls-field {
  display: block;
  margin: 0;
}

.tanvis-controls-field-inline {
  display: inline-flex;
  align-items: stretch;
}

.tanvis-controls-gap-top {
  margin-top: 0.5rem;
}

.tanvis-controls-select {
  min-width: 13rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-select:hover {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-select:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tanvis-controls-help {
  margin: 0.5rem 0 0;
  color: #4b5563;
  font: 500 0.85rem/1.3 system-ui, sans-serif;
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

  function createAreaControls({ element, selectedValue, onAreaChange, body }) {
    const targetBody = body || createControlsPanel({
      label: 'Data options',
      ariaLabel: 'Toggle map controls'
    }).body;

    if (body) {
      body.dataset.tanvisControls = 'area';
    }

    const groupName = element?.id ? `${element.id}-area` : 'tanvis-control-block-area';
    const group = createRadioGroup({
      name: groupName,
      selectedValue,
      items: areaOptions,
      onChange: (value) => {
        if (element?.dataset) {
          element.dataset.visArea = value;
        }

        if (typeof onAreaChange === 'function') {
          onAreaChange(value);
        }
      }
    });

    targetBody.appendChild(group);

    return targetBody;
  }

  const LABEL_MODE_OPTIONS = [
    { label: 'Scientific', value: 'scientific' },
    { label: 'Vernacular', value: 'vernacular' }
  ];

  function createTaxonGroupControls({ rootElement, apiBase, selectedValue = '', labelMode = 'scientific', loadToken, body }) {
    const targetBody = body || createControlsPanel({
      label: 'Taxon groups',
      ariaLabel: 'Toggle taxon group controls'
    }).body;

    if (body) {
      body.dataset.tanvisControls = 'taxon-groups';
    }

    const state = {
      groups: [],
      selectedValue,
      labelMode
    };

    syncRootDataset();

    const selectField = document.createElement('label');
    selectField.className = 'tanvis-controls-field tanvis-controls-gap-top';

    const select = document.createElement('select');
    select.className = 'tanvis-controls-select';
    select.disabled = true;
    select.value = state.selectedValue;

    select.addEventListener('change', () => {
      state.selectedValue = select.value;
      syncRootDataset();
    });

    selectField.appendChild(select);
    targetBody.appendChild(selectField);

    const labelModeField = document.createElement('div');
    labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
    targetBody.appendChild(labelModeField);
    const status = createVisStatusReporter(targetBody);
    status.showInfo('Loading taxon groups...');

    const radioGroup = createRadioGroup({
      name: `${rootElement?.id || 'tanvis'}-taxon-group-label-mode`,
      selectedValue: state.labelMode,
      items: LABEL_MODE_OPTIONS,
      onChange: (value) => {
        state.labelMode = value;
        syncRootDataset();
        renderOptions();
      }
    });

    labelModeField.appendChild(radioGroup);
    renderOptions();

    fetchTaxonGroups(apiBase)
      .then((groups) => {
        if (!isCurrentLoad()) {
          return;
        }

        state.groups = groups;
        status.clear();
        select.disabled = false;
        renderOptions();
      })
      .catch((error) => {
        if (!isCurrentLoad()) {
          return;
        }

        state.groups = [];
        state.selectedValue = '';
        status.showError(`${normalizeErrorMessage(error, 'Unable to load taxon groups')}. Showing All groups only.`);
        select.disabled = false;
        renderOptions();
      });

    return targetBody;

    function renderOptions() {
      const currentSelectedValue = state.selectedValue;
      select.innerHTML = '';

      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = 'All groups';
      select.appendChild(allOption);

      for (const group of state.groups) {
        const option = document.createElement('option');
        option.value = group.external_key;
        option.textContent = state.labelMode === 'vernacular' ? (group.friendly || group.title || group.external_key) : (group.title || group.friendly || group.external_key);
        select.appendChild(option);
      }

      if (!state.groups.some((group) => group.external_key === currentSelectedValue)) {
        state.selectedValue = '';
        select.value = '';
      } else {
        select.value = currentSelectedValue;
      }

      syncRootDataset();
    }

    function syncRootDataset() {
      if (!rootElement?.dataset) {
        return;
      }

      rootElement.dataset.visTaxonGroup = state.selectedValue;
      rootElement.dataset.visTaxonGroupLabelMode = state.labelMode;
      rootElement.dataset.visTaxonGroupNameMode = state.labelMode;
    }

    function isCurrentLoad() {
      if (!rootElement) {
        return true;
      }

      return rootElement.__tanvisControlBlockLoadToken === loadToken;
    }
  }

  async function fetchTaxonGroups(apiBase) {
    const resourceUrl = resolveResourceUrl$2(apiBase, 'taxon-groups');
    const payload = await fetchJson$2(resourceUrl.toString(), 'Failed to load taxon groups');
    return getListData$2(payload);
  }

  function resolveResourceUrl$2(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$2(url, defaultErrorMessage) {
    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$2(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  const DEFAULT_API_BASE$2 = '/api/v1';

  function createControlBlockAdapter() {
    return {
      name: 'control-block',
      render(element, config) {
        const loadToken = (element.__tanvisControlBlockLoadToken || 0) + 1;
        element.__tanvisControlBlockLoadToken = loadToken;

        clearElement(element);

        const { panel, body } = createControlsPanel({
          label: 'Data options',
          ariaLabel: 'Toggle data controls'
        });
        panel.dataset.tanvisControls = 'data-options';
        element.appendChild(panel);

        element.appendChild(createAreaControls({
          element,
          selectedValue: config.area,
          body,
          onAreaChange: (value) => {
            publishControlEvent(element.id, {
              type: 'area-change',
              area: value
            });
          }
        }));

        element.appendChild(createTaxonGroupControls({
          rootElement: element,
          apiBase: config.source || DEFAULT_API_BASE$2,
          body,
          loadToken
        }));

        publishControlEvent(element.id, {
          type: 'area-change',
          area: config.area
        });
      }
    };
  }

  const controlBlockAdapter = createControlBlockAdapter();

  function renderControlBlock(element, config) {
    controlBlockAdapter.render(element, config);
  }

  const DEFAULT_API_BASE$1 = '/api/v1';
  const TAXON_STATS_RESOURCE$1 = 'taxon-stats';
  const TAXA_RESOURCE = 'taxa';
  const DEFAULT_PAGE_LIMIT$1 = 1000;
  const TAXA_IN_FILTER_CHUNK_SIZE = 150;
  const columns$1 = [
    { title: 'Species ID', field: 'speciesId', sorter: 'string' },
    { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
    { title: 'Common name', field: 'commonName', sorter: 'string' },
    { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
    { title: 'VC number', field: 'vcNumber', sorter: 'number' }
  ];

  function createNewSpeciesTableAdapter() {
    return {
      name: 'new-species-table',
      render(element, config) {
        clearControlSubscription$1(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$1(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const startDate = renderConfig.startDate;
        const endDate = renderConfig.endDate || getCurrentIsoDate();
        const apiBase = renderConfig.source || DEFAULT_API_BASE$1;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier$1(renderConfig.area);
        const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
        element.__tanvisNewSpeciesLoadId = loadId;
        element.dataset.visArea = renderConfig.area;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (event?.type !== 'area-change' || !event.area) {
              return;
            }

            if (event.area === element.dataset.visArea) {
              return;
            }

            element.dataset.visArea = event.area;
            createNewSpeciesTableAdapter().render(element, {
              ...renderConfig,
              area: event.area
            });
          });
        }

        buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier })
          .then((records) => {
            if (element.__tanvisNewSpeciesLoadId !== loadId) {
              return;
            }

            const Tabulator = getTabulatorGlobal$1();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary$1(startDate, endDate, records.length));
            element.appendChild(createTableContainer$1(records, Tabulator));
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisNewSpeciesLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render new species table'));
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

  async function buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier }) {
    const taxonStatsRows = await fetchTaxonStatsInRange({
      apiBase,
      startDate,
      endDate,
      geographicRegionIdentifier
    });
    const taxaByIdentifier = await fetchTaxaByIdentifier$1({
      apiBase,
      taxonIdentifiers: taxonStatsRows.map((row) => row.taxon_identifier)
    });

    return taxonStatsRows.map((row) => {
      const taxon = taxaByIdentifier.get(row.taxon_identifier);

      return {
        speciesId: row.taxon_identifier,
        scientificName: taxon?.scientific_name || '',
        commonName: formatVernacularName$1(taxon),
        firstRecordDate: row.first_record_date,
        vcNumber: row.geographic_region_identifier
      };
    });
  }

  async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, geographicRegionIdentifier }) {
    const resourceUrl = resolveResourceUrl$1(apiBase, TAXON_STATS_RESOURCE$1);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('first_record_date[gte]', startDate);
      pageUrl.searchParams.set('first_record_date[lte]', endDate);
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$1));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$1(pageUrl.toString(), 'Failed to load taxon-stats');
      const pageRows = getListData$1(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$1) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$1;
    }

    return rows;
  }

  async function fetchTaxaByIdentifier$1({ apiBase, taxonIdentifiers }) {
    const uniqueIdentifiers = Array.from(new Set(taxonIdentifiers.filter(Boolean)));
    const taxaByIdentifier = new Map();

    if (uniqueIdentifiers.length === 0) {
      return taxaByIdentifier;
    }

    const resourceUrl = resolveResourceUrl$1(apiBase, TAXA_RESOURCE);
    const chunks = chunkArray$1(uniqueIdentifiers, TAXA_IN_FILTER_CHUNK_SIZE);
    const payloads = await Promise.all(chunks.map((chunk) => {
      const url = new URL(resourceUrl.toString());
      url.searchParams.set('taxon_identifier[in]', chunk.join(','));
      return fetchJson$1(url.toString(), 'Failed to load taxa');
    }));

    payloads.forEach((payload) => {
      getListData$1(payload).forEach((taxon) => {
        if (taxon?.taxon_identifier) {
          taxaByIdentifier.set(taxon.taxon_identifier, taxon);
        }
      });
    });

    return taxaByIdentifier;
  }

  function resolveResourceUrl$1(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$1(url, defaultErrorMessage) {
    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$1(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function formatVernacularName$1(taxon) {
    const plural = taxon?.vernacular_names;
    if (Array.isArray(plural)) {
      return plural.join(', ');
    }

    return taxon?.vernacular_name || '';
  }

  function chunkArray$1(items, size) {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  function areaToGeographicRegionIdentifier$1(area) {
    if (area === 'vc-58') {
      return 58;
    }

    if (area === 'vc-59') {
      return 59;
    }

    if (area === 'vc-60') {
      return 60;
    }

    return undefined;
  }

  function clearControlSubscription$1(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$1(config) {
    if (!config.control) {
      return config.area;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area) {
      return latestEvent.area;
    }

    if (typeof document === 'undefined') {
      return config.area;
    }

    const controlElement = document.getElementById(config.control);
    const controlArea = controlElement?.dataset?.visArea;
    return controlArea || config.area;
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

  const DEFAULT_API_BASE = '/api/v1';
  const TAXON_STATS_RESOURCE = 'taxon-stats';
  const TAXON_RESOURCE = 'taxon';
  const DEFAULT_PAGE_LIMIT = 1000;
  const TAXON_IN_FILTER_CHUNK_SIZE = 150;
  const DEFAULT_TOP_N = 50;
  const columns = [
    { title: 'Species ID', field: 'speciesId', sorter: 'string' },
    { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
    { title: 'Common name', field: 'commonName', sorter: 'string' },
    { title: 'Rarity category', field: 'rarityCategory', sorter: 'string' },
    { title: 'Total records', field: 'totalRecords', sorter: 'number' },
    { title: 'Occupied grid squares', field: 'occupiedGridSquares', sorter: 'number' },
    { title: 'Frequency trend', field: 'frequencyTrendScore', sorter: 'number' }
  ];

  function createIncreasingSpeciesTableAdapter() {
    return {
      name: 'increasing-species-table',
      render(element, config) {
        clearControlSubscription(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
        const apiBase = renderConfig.source || DEFAULT_API_BASE;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier(renderConfig.area);
        const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
        element.__tanvisIncreasingLoadId = loadId;
        element.dataset.visArea = renderConfig.area;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (event?.type !== 'area-change' || !event.area) {
              return;
            }

            if (event.area === element.dataset.visArea) {
              return;
            }

            element.dataset.visArea = event.area;
            createIncreasingSpeciesTableAdapter().render(element, {
              ...renderConfig,
              area: event.area
            });
          });
        }

        buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier })
          .then((records) => {
            if (element.__tanvisIncreasingLoadId !== loadId) {
              return;
            }

            const Tabulator = getTabulatorGlobal();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary(topN, records.length));
            element.appendChild(createTableContainer(records, Tabulator));
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisIncreasingLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render increasing species table'));
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

  async function buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier }) {
    const taxonStatsRows = await fetchTaxonStats({ apiBase, geographicRegionIdentifier });
    const rankedRows = taxonStatsRows
      .slice()
      .sort((a, b) => Number(b?.frequency_trend || 0) - Number(a?.frequency_trend || 0))
      .slice(0, topN);

    const taxaByIdentifier = await fetchTaxaByIdentifier({
      apiBase,
      taxonIdentifiers: rankedRows.map((row) => row.taxon_identifier)
    });

    return rankedRows.map((row) => {
      const taxon = taxaByIdentifier.get(row.taxon_identifier);

      return {
        speciesId: row.taxon_identifier,
        vcNumber: row.geographic_region_identifier,
        rarityCategory: taxon?.rarity_group_name || '',
        firstRecordDate: row.first_record_date,
        totalRecords: row.occurrences_count,
        occupiedGridSquares: row.grid_square_count,
        frequencyTrendScore: row.frequency_trend,
        scientificName: taxon?.scientific_name || '',
        commonName: formatVernacularName(taxon)
      };
    });
  }

  async function fetchTaxonStats({ apiBase, geographicRegionIdentifier }) {
    const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-stats');
      const pageRows = getListData(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT;
    }

    return rows;
  }

  async function fetchTaxaByIdentifier({ apiBase, taxonIdentifiers }) {
    const uniqueIdentifiers = Array.from(new Set(taxonIdentifiers.filter(Boolean)));
    const taxaByIdentifier = new Map();

    if (uniqueIdentifiers.length === 0) {
      return taxaByIdentifier;
    }

    const resourceUrl = resolveResourceUrl(apiBase, TAXON_RESOURCE);
    const chunks = chunkArray(uniqueIdentifiers, TAXON_IN_FILTER_CHUNK_SIZE);
    const payloads = await Promise.all(chunks.map((chunk) => {
      const url = new URL(resourceUrl.toString());
      url.searchParams.set('taxon_identifier[in]', chunk.join(','));
      return fetchJson(url.toString(), 'Failed to load taxon data');
    }));

    payloads.forEach((payload) => {
      getListData(payload).forEach((taxon) => {
        if (taxon?.taxon_identifier) {
          taxaByIdentifier.set(taxon.taxon_identifier, taxon);
        }
      });
    });

    return taxaByIdentifier;
  }

  function resolveResourceUrl(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson(url, defaultErrorMessage) {
    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function formatVernacularName(taxon) {
    const plural = taxon?.vernacular_names;
    if (Array.isArray(plural)) {
      return plural.join(', ');
    }

    return taxon?.vernacular_name || '';
  }

  function chunkArray(items, size) {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  function areaToGeographicRegionIdentifier(area) {
    if (area === 'vc-58') {
      return 58;
    }

    if (area === 'vc-59') {
      return 59;
    }

    if (area === 'vc-60') {
      return 60;
    }

    return undefined;
  }

  function clearControlSubscription(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea(config) {
    if (!config.control) {
      return config.area;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area) {
      return latestEvent.area;
    }

    if (typeof document === 'undefined') {
      return config.area;
    }

    const controlElement = document.getElementById(config.control);
    const controlArea = controlElement?.dataset?.visArea;
    return controlArea || config.area;
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
    registerRenderer('control-block', renderControlBlock);
    registerRenderer('control-bock', renderControlBlock);
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
