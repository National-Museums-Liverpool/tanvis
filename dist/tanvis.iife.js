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
    const width = parseOptionalPositiveNumber$1(dataset.visWidth);
    const height = parseOptionalPositiveNumber$1(dataset.visHeight);
    const topN = parseOptionalPositiveInteger(dataset.visTopN);
    const year = parseOptionalPositiveInteger(dataset.visYear);
    const mapType = dataset.visMapType;
    const startYear = parseOptionalPositiveInteger(dataset.visStartYear);
    const endYear = parseOptionalPositiveInteger(dataset.visEndYear);
    const gridStatsType = dataset.visGridStatsType;

    return {
      type: dataset.visType || 'table',
      source: dataset.visSource,
      control: dataset.visControl,
      linkedTable: dataset.visLinkedTable,
      species: dataset.visSpecies,
      mapType,
      taxonId: dataset.visTaxonid,
      startDate: dataset.visStartDate,
      endDate: dataset.visEndDate,
      area: dataset.visArea || 'vc-58-59-60',
      ctl: parseBoolean(dataset.visCtl),
      boundaries: parseBoolean(dataset.visBoundaries),
      gridStatsType,
      hectads: parseBooleanDefaultTrue(dataset.visHectads),
      ...(topN !== undefined ? { topN } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(startYear !== undefined ? { startYear } : {}),
      ...(endYear !== undefined ? { endYear } : {}),
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

    if (config.type === 'control-block' && !element?.id) {
      return ['Missing id attribute for control-block'];
    }

    if (config.type === 'new-species-table' && !config.startDate) {
      return ['Missing data-vis-start-date for new-species-table'];
    }

    if (config.type === 'species-absent-since' && !Number.isFinite(config.year)) {
      return ['Missing data-vis-year for species-absent-since'];
    }

    // if (config.type === 'temporal-year-chart' && !config.taxonId) {
    //   return ['Missing data-vis-taxonid for temporal-year-chart'];
    // }

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

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
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

.tanvis-grid-stats-map-controls {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.tanvis-grid-stats-switch,
.tanvis-grid-stats-map-type-switch {
  margin-top: 0;
}

.tanvis-grid-stats-switch .tanvis-controls-text,
.tanvis-grid-stats-map-type-switch .tanvis-controls-text {
  text-transform: none;
  min-width: 5.25rem;
}

#map-tetrad-info {
  min-height: 1.2em;
  margin: 0 0 0.35rem;
}

#map-tetrad-info.tanvis-map-tetrad-info-empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
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

  const elementIdCounters = new Map();

  function assignElementId(element, prefix) {
    if (element?.id) {
      return element.id;
    }

    const current = elementIdCounters.get(prefix) || 0;
    const next = current + 1;
    elementIdCounters.set(prefix, next);
    element.id = `${prefix}-${next}`;
    return element.id;
  }

  function clearControlSubscription$5(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function clearExpandResizeHandlers(element) {
    const cleanup = element?.__tanvisExpandCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisExpandCleanup;
  }

  function getEffectiveArea$5(config) {
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

  function subscribeToAreaControl(controlId, handler) {
    return subscribeToControl(controlId, (event) => {
      if (!event || event.type !== 'area-change' || !event.area) {
        return;
      }

      handler(event.area, event);
    });
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

  function getConfiguredWidth(element, config) {
    const configuredWidth = parseOptionalPositiveNumber(config.width);

    if (config.expand !== true) {
      return configuredWidth;
    }

    return getParentWidth(element) ?? configuredWidth;
  }

  function getParentWidth(element) {
    return parseOptionalPositiveNumber(element?.parentElement?.clientWidth);
  }

  function attachExpandResizeHandlers(element, config, map, onResize) {
    const resizeAction = () => {
          resizeExpandedMap(element, config, map);
        };

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && element.parentElement) {
      resizeObserver = new ResizeObserver(resizeAction);
      resizeObserver.observe(element.parentElement);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', resizeAction);
    }

    element.__tanvisExpandCleanup = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeAction);
      }
    };
  }

  function resizeExpandedMap(element, config, map) {
    if (!map || typeof map.setSize !== 'function') {
      return;
    }

    const width = getParentWidth(element);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const bounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, bounds);

    if (width === undefined || height === undefined) {
      return;
    }

    map.setSize(width, height);

    if (typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }

  function getAreaBounds(area) {
    return transOptsSel[area]?.bounds;
  }

  function getAreaCentroid(area) {
    return transOptsSel[area]?.centroid;
  }

  function getAreaInitZoom(area) {
    return transOptsSel[area]?.initZoom ?? 10;
  }

  function getBrcAtlasGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brcatlas || null;
  }

  function renderStaticAtlasMap(element, config, options = {}) {
    clearExpandResizeHandlers(element);
    clearControlSubscription$5(element);

    const status = createVisStatusReporter(element);
    clearElement(element);
    status.showInfo('Loading...');

    try {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      const idPrefix = options.idPrefix || 'tanvis-map';
      assignElementId(element, idPrefix);
      ensureMapTetradInfo$1(element);

      const effectiveArea = getEffectiveArea$5(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      element.dataset.visArea = renderConfig.area;

      console.log('config', createStaticMapOptions(element, renderConfig, options));
      const map = brcAtlas.svgMap(createStaticMapOptions(element, renderConfig, options));

      if (map && typeof map.setIdentfier === 'function' && renderConfig.source) {
        map.setIdentfier(renderConfig.source);
      }

      if (map && typeof map.redrawMap === 'function') {
        console.log('redrawing map for area:', renderConfig.area);
        map.redrawMap();
      }

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToAreaControl(renderConfig.control, (area) => {
          if (area === element.dataset.visArea) {
            return;
          }

          element.dataset.visArea = area;
          renderStaticAtlasMap(element, {
            ...renderConfig,
            area
          }, options);
        });
      }

      status.clear();
      return map;
    } catch (error) {
      clearElement(element);
      status.showError(normalizeErrorMessage(error, options.errorMessage || 'Failed to render static map'));
      return null;
    }
  }

  function createStaticMapOptions(element, config, options) {
    const includeHectads = config.hectads !== false;
    const shouldExpand = config.expand === true;
    const width = parseOptionalPositiveNumber(config.width);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

    return {
      selector: `#${element.id}`,
      captionId: 'map-tetrad-info',
      transOptsControl: false,
      transOptsSel,
      transOptsKey: config.area,
      boundaryGjson: `/data/vcs/simp-100/${config.area}-100.geojson`,
      ...(height !== undefined ? { height } : {}),
      ...(shouldExpand ? { expand: true } : {}),
      ...(includeHectads
        ? { gridGjson: `/data/vcs/hectad-grids/${config.area}-hectads.geojson` }
        : { gridLineStyle: 'none' }),
      mapTypesSel: options.mapTypesSel,
      mapTypesKey: options.mapTypesKey,
    };
  }

  function ensureMapTetradInfo$1(element) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();

    const parent = element?.parentElement;
    if (!parent) {
      return;
    }

    let info = document.getElementById('map-tetrad-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'map-tetrad-info';
    }

    info.setAttribute('data-placeholder', 'Tetrad information');
    ensureMapTetradInfoPlaceholderBehavior$1(info);
    parent.insertBefore(info, element);
  }

  function ensureMapTetradInfoPlaceholderBehavior$1(info) {
    if (!info) {
      return;
    }

    if (!info.__tanvisMapTetradInfoObserver) {
      const observer = new MutationObserver(() => {
        syncMapTetradInfoEmptyState$1(info);
      });

      observer.observe(info, {
        childList: true,
        subtree: true,
        characterData: true
      });

      info.__tanvisMapTetradInfoObserver = observer;
    }

    syncMapTetradInfoEmptyState$1(info);
  }

  function syncMapTetradInfoEmptyState$1(info) {
    const isEmpty = !String(info.textContent || '').trim();
    info.classList.toggle('tanvis-map-tetrad-info-empty', isEmpty);
  }

  function renderStaticMap(element, config) {
    renderStaticAtlasMap(element, config, {
      idPrefix: 'tanvis-map',
      errorMessage: 'Failed to render static map'
    });
  }

  function renderLeafletAtlasMap(element, config, options = {}) {
    clearExpandResizeHandlers(element);
    clearControlSubscription$5(element);

    const status = createVisStatusReporter(element);
    clearElement(element);
    status.showInfo('Loading...');

    try {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.leafletMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      const idPrefix = options.idPrefix || 'tanvis-leaflet-map';
      assignElementId(element, idPrefix);
      ensureMapTetradInfo(element);

      const effectiveArea = getEffectiveArea$5(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      element.dataset.visArea = renderConfig.area;

      const map = brcAtlas.leafletMap(createLeafletMapOptions(element, renderConfig, options));

      if (renderConfig.expand === true) {
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
        element.__tanvisControlCleanup = subscribeToAreaControl(renderConfig.control, (area) => {
          if (area === element.dataset.visArea) {
            return;
          }

          element.dataset.visArea = area;
          panToAreaCentroid(area, map);
        });
      }

      status.clear();
      return map;
    } catch (error) {
      clearElement(element);
      status.showError(normalizeErrorMessage(error, options.errorMessage || 'Failed to render slippy map'));
      return null;
    }
  }

  function createLeafletMapOptions(element, config, options) {
    const width = getConfiguredWidth(element, config);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);
    const showBoundaries = config.boundaries === true;

    return {
      selector: `#${element.id}`,
      captionId: 'map-tetrad-info',
      showVcs: showBoundaries,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(options?.mapTypesSel ? { mapTypesSel: options.mapTypesSel } : {}),
      ...(options?.mapTypesKey ? { mapTypesKey: options.mapTypesKey } : {}),
      basemapConfigs: [
        {
          name: 'OpenStreetMap',
          type: 'tileLayer',
          selected: true,
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          opts: {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        {
          name: 'OpenTopoMap',
          type: 'tileLayer',
          selected: false,
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          opts: {
            maxZoom: 17,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          }
        }
      ]
    };
  }

  function ensureMapTetradInfo(element) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();

    const parent = element?.parentElement;
    if (!parent) {
      return;
    }

    let info = document.getElementById('map-tetrad-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'map-tetrad-info';
    }

    info.setAttribute('data-placeholder', 'Tetrad information');
    ensureMapTetradInfoPlaceholderBehavior(info);
    parent.insertBefore(info, element);
  }

  function ensureMapTetradInfoPlaceholderBehavior(info) {
    if (!info) {
      return;
    }

    if (!info.__tanvisMapTetradInfoObserver) {
      const observer = new MutationObserver(() => {
        syncMapTetradInfoEmptyState(info);
      });

      observer.observe(info, {
        childList: true,
        subtree: true,
        characterData: true
      });

      info.__tanvisMapTetradInfoObserver = observer;
    }

    syncMapTetradInfoEmptyState(info);
  }

  function syncMapTetradInfoEmptyState(info) {
    const isEmpty = !String(info.textContent || '').trim();
    info.classList.toggle('tanvis-map-tetrad-info-empty', isEmpty);
  }

  function panToAreaCentroid(areaKey, map) {
    const centroid = getAreaCentroid(areaKey);
    const zoom = getAreaInitZoom(areaKey);
    const leafletMap = map?.lmap;

    if (!centroid || !leafletMap || typeof leafletMap.setView !== 'function') {
      return;
    }

    leafletMap.setView([centroid.lat, centroid.lon], zoom);
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
      publishTaxonGroupChange();
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

    function publishTaxonGroupChange() {
      if (!rootElement?.id) {
        return;
      }

      publishControlEvent(rootElement.id, {
        type: 'taxon-group-change',
        taxonGroup: state.selectedValue
      });
    }

    function isCurrentLoad() {
      if (!rootElement) {
        return true;
      }

      return rootElement.__tanvisControlBlockLoadToken === loadToken;
    }
  }

  async function fetchTaxonGroups(apiBase) {
    const resourceUrl = resolveResourceUrl$6(apiBase, 'taxon-groups');
    const payload = await fetchJson$6(resourceUrl.toString(), 'Failed to load taxon groups');
    return getListData$6(payload);
  }

  function resolveResourceUrl$6(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$6(url, defaultErrorMessage) {
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

  function getListData$6(payload) {
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

  const DEFAULT_API_BASE$6 = '/api/v1';

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
          apiBase: config.source || DEFAULT_API_BASE$6,
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

  const DEFAULT_API_BASE$5 = '/api/v1';
  const TAXON_STATS_RESOURCE$2 = 'taxon-stats';
  const DEFAULT_PAGE_LIMIT$5 = 1000;
  const columns$2 = [
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
        clearControlSubscription$4(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$4(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const startDate = renderConfig.startDate;
        const endDate = renderConfig.endDate || getCurrentIsoDate();
        const apiBase = renderConfig.source || DEFAULT_API_BASE$5;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier$3(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$3(renderConfig);
        const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
        element.__tanvisNewSpeciesLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea$4(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$3(renderConfig);

            if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visArea = nextArea;
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createNewSpeciesTableAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey })
          .then((records) => {
            if (element.__tanvisNewSpeciesLoadId !== loadId) {
              return;
            }

            const Tabulator = getTabulatorGlobal$2();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary$3(startDate, endDate, records.length));
            element.appendChild(createTableContainer$2(records, Tabulator));
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

  function createSummary$3(startDate, endDate, count) {
    const summary = document.createElement('p');
    summary.textContent = `${count} new species between ${startDate} and ${endDate}`;
    return summary;
  }

  function createTableContainer$2(records, Tabulator) {
    const container = document.createElement('div');

    new Tabulator(container, {
      data: records,
      columns: columns$2,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      placeholder: 'No records found'
    });

    const table = new Tabulator(container, {
      data: records,
      columns: columns$2,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      placeholder: 'No records found'
    });

    table.on("rowClick", function(e, row) {
      // Triggered whenever a user clicks a row
      const rowData = row.getData();
      const speciesId = rowData.speciesId; 

      // Create a custom event containing the ID in the 'detail' property
      const rowSelectedEvent = new CustomEvent("species-row-selected", {
          detail: { speciesId: speciesId },
          bubbles: true, // Allows the event to bubble up the DOM tree
          cancelable: true
      });

      // Dispatch the event from the table element (or window / document)
      container.dispatchEvent(rowSelectedEvent);
    });

    return container;
  }

  function getCurrentIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  async function buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const taxonStatsRows = await fetchTaxonStatsInRange({
      apiBase,
      startDate,
      endDate,
      geographicRegionIdentifier,
      taxonGroupExternalKey
    });

    return taxonStatsRows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        scientificName: row.scientific_name || '',
        commonName: formatVernacularName$2(row),
        firstRecordDate: row.first_record_date,
        vcNumber: row.geographic_region_identifier
      };
    });
  }

  async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const resourceUrl = resolveResourceUrl$5(apiBase, TAXON_STATS_RESOURCE$2);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('first_record_date[gte]', startDate);
      pageUrl.searchParams.set('first_record_date[lte]', endDate);
      pageUrl.searchParams.set('include', 'taxon');
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      if (taxonGroupExternalKey) {
        pageUrl.searchParams.set('taxon_group_external_key[eq]', taxonGroupExternalKey);
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$5));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$5(pageUrl.toString(), 'Failed to load taxon-stats');
      const pageRows = getListData$5(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$5) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$5;
    }

    return rows;
  }
  function resolveResourceUrl$5(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$5(url, defaultErrorMessage) {
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

  function getListData$5(payload) {
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

  function formatVernacularName$2(taxon) {
    const plural = taxon?.vernacular_names;
    if (Array.isArray(plural)) {
      return plural.join(', ');
    }

    return taxon?.vernacular_name || '';
  }

  function areaToGeographicRegionIdentifier$3(area) {
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

  function clearControlSubscription$4(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$4(config) {
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

  function getEffectiveTaxonGroup$3(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroup || '';
  }

  function getTabulatorGlobal$2() {
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

  const DEFAULT_API_BASE$4 = '/api/v1';
  const TAXON_STATS_RESOURCE$1 = 'taxon-stats';
  const DEFAULT_PAGE_LIMIT$4 = 1000;
  const DEFAULT_TOP_N = 50;
  const columns$1 = [
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
        console.log('element', element);
        clearControlSubscription$3(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$3(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
        const apiBase = renderConfig.source || DEFAULT_API_BASE$4;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier$2(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$2(renderConfig);
        const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
        element.__tanvisIncreasingLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea$3(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$2(renderConfig);

            if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visArea = nextArea;
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createIncreasingSpeciesTableAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier, taxonGroupExternalKey })
          .then((records) => {
            if (element.__tanvisIncreasingLoadId !== loadId) {
              return;
            }

            const Tabulator = getTabulatorGlobal$1();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary$2(topN, records.length));
            element.appendChild(createTableContainer$1(records, Tabulator));
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

  function createSummary$2(topN, count) {
    const summary = document.createElement('p');
    summary.textContent = `${count} species returned (top ${topN} by frequency trend)`;
    return summary;
  }

  function createTableContainer$1(records, Tabulator) {
    const container = document.createElement('div');

    const table = new Tabulator(container, {
      data: records,
      columns: columns$1,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      initialSort: [
        { column: 'frequencyTrendScore', dir: 'desc' }
      ],
      placeholder: 'No records found',
    });

    table.on("rowClick", function(e, row) {
      // Triggered whenever a user clicks a row
      const rowData = row.getData();
      const speciesId = rowData.speciesId; 

      // Create a custom event containing the ID in the 'detail' property
      const rowSelectedEvent = new CustomEvent("species-row-selected", {
          detail: { speciesId: speciesId },
          bubbles: true, // Allows the event to bubble up the DOM tree
          cancelable: true
      });

      // Dispatch the event from the table element (or window / document)
      container.dispatchEvent(rowSelectedEvent);
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

  function getTabulatorGlobal$1() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  async function buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const taxonStatsRows = await fetchTaxonStats({ apiBase, geographicRegionIdentifier, taxonGroupExternalKey });
    const rankedRows = taxonStatsRows
      .slice()
      .sort((a, b) => Number(b?.frequency_trend || 0) - Number(a?.frequency_trend || 0))
      .slice(0, topN);

    return rankedRows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        vcNumber: row.geographic_region_identifier,
        rarityCategory: row.rarity_group_name || '',
        firstRecordDate: row.first_record_date,
        totalRecords: row.occurrences_count,
        occupiedGridSquares: row.grid_square_count,
        frequencyTrendScore: row.frequency_trend,
        scientificName: row.scientific_name || '',
        commonName: formatVernacularName$1(row)
      };
    });
  }

  async function fetchTaxonStats({ apiBase, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const resourceUrl = resolveResourceUrl$4(apiBase, TAXON_STATS_RESOURCE$1);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('include', 'taxon');
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      if (taxonGroupExternalKey) {
        pageUrl.searchParams.set('taxon_group_external_key[eq]', taxonGroupExternalKey);
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$4));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$4(pageUrl.toString(), 'Failed to load taxon-stats');
      const pageRows = getListData$4(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$4) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$4;
    }

    return rows;
  }
  function resolveResourceUrl$4(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$4(url, defaultErrorMessage) {
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

  function getListData$4(payload) {
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

  function areaToGeographicRegionIdentifier$2(area) {
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

  function clearControlSubscription$3(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
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

  function getEffectiveTaxonGroup$2(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroup || '';
  }

  const increasingSpeciesTableAdapter = createIncreasingSpeciesTableAdapter();

  function renderIncreasingSpeciesTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    increasingSpeciesTableAdapter.render(element, config);
  }

  const DEFAULT_API_BASE$3 = '/api/v1';
  const TAXON_STATS_RESOURCE = 'taxon-stats';
  const DEFAULT_PAGE_LIMIT$3 = 1000;
  const columns = [
    { title: 'Species ID', field: 'speciesId', sorter: 'string' },
    { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
    { title: 'Common name', field: 'commonName', sorter: 'string' },
    { title: 'Last record date', field: 'lastRecordDate', sorter: 'string' },
    { title: 'VC number', field: 'vcNumber', sorter: 'number' }
  ];

  function createSpeciesAbsentSinceAdapter() {
    return {
      name: 'species-absent-since',
      render(element, config) {
        clearControlSubscription$2(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$2(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const year = Number(renderConfig.year);
        const apiBase = renderConfig.source || DEFAULT_API_BASE$3;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier$1(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$1(renderConfig);
        const loadId = (element.__tanvisSpeciesAbsentLoadId || 0) + 1;
        element.__tanvisSpeciesAbsentLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea$2(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$1(renderConfig);

            if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visArea = nextArea;
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createSpeciesAbsentSinceAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        buildSpeciesAbsentSinceRecords({
          apiBase,
          year,
          geographicRegionIdentifier,
          taxonGroupExternalKey
        })
          .then((records) => {
            if (element.__tanvisSpeciesAbsentLoadId !== loadId) {
              return;
            }

            const Tabulator = getTabulatorGlobal();

            if (!Tabulator) {
              throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
            }

            clearElement(element);
            element.appendChild(createSummary$1(year, records.length));
            element.appendChild(createTableContainer(records, Tabulator));
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisSpeciesAbsentLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render species absent since table'));
          });
      }
    };
  }

  function createSummary$1(year, count) {
    const summary = document.createElement('p');
    summary.textContent = `${count} species with last record date on or before ${year}`;
    return summary;
  }

  function createTableContainer(records, Tabulator) {
    const container = document.createElement('div');

    const table = new Tabulator(container, {
      data: records,
      columns,
      layout: 'fitColumns',
      pagination: true,
      paginationSize: 10,
      placeholder: 'No records found'
    });

    table.on('rowClick', (event, row) => {
      const speciesId = row?.getData?.()?.speciesId;
      if (!speciesId) {
        return;
      }

      const rowSelectedEvent = new CustomEvent('species-row-selected', {
        detail: { speciesId },
        bubbles: true,
        cancelable: true
      });

      container.dispatchEvent(rowSelectedEvent);
    });

    return container;
  }

  async function buildSpeciesAbsentSinceRecords({ apiBase, year, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const cutoffDate = `${year}-12-31`;
    const taxonStatsRows = await fetchTaxonStatsAbsentSince({
      apiBase,
      cutoffDate,
      geographicRegionIdentifier,
      taxonGroupExternalKey
    });

    return taxonStatsRows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        scientificName: row.scientific_name || '',
        commonName: formatVernacularName(row),
        lastRecordDate: row.last_record_date,
        vcNumber: row.geographic_region_identifier
      };
    });
  }

  async function fetchTaxonStatsAbsentSince({ apiBase, cutoffDate, geographicRegionIdentifier, taxonGroupExternalKey }) {
    const resourceUrl = resolveResourceUrl$3(apiBase, TAXON_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('last_record_date[lte]', cutoffDate);
      pageUrl.searchParams.set('include', 'taxon');
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      if (taxonGroupExternalKey) {
        pageUrl.searchParams.set('taxon_group_external_key[eq]', taxonGroupExternalKey);
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$3));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$3(pageUrl.toString(), 'Failed to load taxon-stats');
      const pageRows = getListData$3(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$3) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$3;
    }

    return rows;
  }

  function resolveResourceUrl$3(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$3(url, defaultErrorMessage) {
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

  function getListData$3(payload) {
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

  function getEffectiveTaxonGroup$1(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroup || '';
  }

  function getTabulatorGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  const speciesAbsentSinceAdapter = createSpeciesAbsentSinceAdapter();

  function renderSpeciesAbsentSince(element, config) {
    speciesAbsentSinceAdapter.render(element, config);
  }

  function normalizeMapTypeMode(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'leaflet') {
      return 'leaflet';
    }

    if (normalized === 'switch') {
      return 'switch';
    }

    return 'static';
  }

  function normalizeBaseMapType(value) {
    return String(value || '').trim().toLowerCase() === 'leaflet' ? 'leaflet' : 'static';
  }

  function resolveActiveMapType(mapElement, mapTypeMode, datasetKey) {
    if (mapTypeMode !== 'switch') {
      return mapTypeMode;
    }

    const savedMapType = normalizeBaseMapType(mapElement?.dataset?.[datasetKey]);
    mapElement.dataset[datasetKey] = savedMapType;
    return savedMapType;
  }

  function ensureMapControlsContainer(hostElement, className = 'tanvis-grid-stats-map-controls') {
    for (const child of hostElement.children) {
      if (child.classList?.contains(className)) {
        return child;
      }
    }

    const controls = document.createElement('div');
    controls.className = className;
    hostElement.appendChild(controls);
    return controls;
  }

  function createMapTypeSwitchControl({
    mapElement,
    activeMapType,
    onChange,
    fallbackId = 'tanvis-map',
    controlClassName = 'tanvis-grid-stats-map-type-switch'
  }) {
    const group = createRadioGroup({
      name: getMapTypeSwitchName(mapElement, fallbackId),
      selectedValue: activeMapType,
      items: [
        { value: 'static', label: 'Static' },
        { value: 'leaflet', label: 'Leaflet' }
      ],
      onChange: (value) => {
        const nextMapType = normalizeBaseMapType(value);
        if (nextMapType === activeMapType) {
          return;
        }

        onChange(nextMapType);
      }
    });

    group.classList.add(controlClassName);
    return group;
  }

  function getMapTypeSwitchName(mapElement, fallbackId) {
    const base = mapElement.id || fallbackId;
    return `${base}-map-type-switch`;
  }

  const DEFAULT_API_BASE$2 = '/api/v1';
  const OCCURRENCES_RESOURCE = 'occurrences';
  const DEFAULT_PAGE_LIMIT$2 = 1000;

  function createSpeciesMapAdapter() {
    return {
      name: 'species-map',
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

        const speciesCode = renderConfig.species || '';
        const apiBase = renderConfig.source || DEFAULT_API_BASE$2;
        const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
        const loadId = (element.__tanvisSpeciesMapLoadId || 0) + 1;
        element.__tanvisSpeciesMapLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;

        console.log('[species-map] selected species code:', speciesCode);

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea$1(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);

            if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visArea = nextArea;
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createSpeciesMapAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        fetchSpeciesOccurrences({
          apiBase,
          speciesCode,
          area: renderConfig.area,
          includeAreaFilter: Boolean(config.control || config.area)
        })
          .then((rows) => {
            if (element.__tanvisSpeciesMapLoadId !== loadId) {
              return;
            }

            console.log('[species-map] occurrences:', rows);
          })
          .catch((error) => {
            if (element.__tanvisSpeciesMapLoadId !== loadId) {
              return;
            }

            console.error('[species-map] failed to fetch occurrences:', error);
          });

        try {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            return;
          }

          clearElement(element);
          const mapContainer = document.createElement('div');
          mapContainer.dataset.tanvisSpeciesMap = 'map';
          element.appendChild(mapContainer);
          status.clear();

          renderMapBackend$1(mapContainer, renderConfig);
        } catch (error) {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            return;
          }

          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
        }
      }
    };
  }

  function renderMapBackend$1(element, config) {
    const mapTypeMode = normalizeMapTypeMode(config.mapType);
    const activeMapType = resolveActiveMapType(element, mapTypeMode, 'tanvisSpeciesMapActiveMapType');

    let map;

    if (activeMapType === 'leaflet') {
      map = renderLeafletAtlasMap(element, config, {
        idPrefix: 'tanvis-species-map',
        errorMessage: 'Failed to render species map'
      });
    } else {
      map = renderStaticAtlasMap(element, config, {
        idPrefix: 'tanvis-species-map',
        errorMessage: 'Failed to render species map'
      });
    }

    renderMapTypeControlGroup(element, {
      activeMapType,
      showMapTypeSwitch: mapTypeMode === 'switch',
      onMapTypeChange: (nextMapType) => {
        element.dataset.tanvisSpeciesMapActiveMapType = nextMapType;
        renderMapBackend$1(element, config);
      }
    });

    return map;
  }

  function renderMapTypeControlGroup(mapElement, options) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();
    const hostElement = mapElement.parentElement;
    if (!hostElement) {
      return;
    }

    const controls = ensureMapControlsContainer(hostElement);
    clearElement(controls);

    if (!options.showMapTypeSwitch) {
      controls.remove();
      return;
    }

    controls.appendChild(createMapTypeSwitchControl({
      mapElement,
      activeMapType: options.activeMapType,
      onChange: options.onMapTypeChange,
      fallbackId: 'tanvis-species-map'
    }));
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

  function getEffectiveTaxonGroup(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroup || '';
  }

  async function fetchSpeciesOccurrences({ apiBase, speciesCode, area, includeAreaFilter }) {
    if (!speciesCode) {
      return [];
    }

    const resourceUrl = resolveResourceUrl$2(apiBase, OCCURRENCES_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('taxon_identifier[eq]', speciesCode);

      if (includeAreaFilter) {
        const higherGeographyIdentifiers = areaToHigherGeographyIdentifiers(area);
        if (higherGeographyIdentifiers.length > 0) {
          pageUrl.searchParams.set('higher_geography_identifier[in]', higherGeographyIdentifiers.join(','));
        }
      }

      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$2));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$2(pageUrl.toString(), 'Failed to load occurrences');
      const pageRows = getListData$2(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$2) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$2;
    }

    return rows;
  }

  function areaToHigherGeographyIdentifiers(area) {
    if (area === 'vc-58') {
      return [58];
    }

    if (area === 'vc-59') {
      return [59];
    }

    if (area === 'vc-60') {
      return [60];
    }

    // Combined VC selection means "all relevant areas", so no additional filter is required.
    if (area === 'vc-58-59-60' || area === 'vc-58-69-60') {
      return [];
    }

    return [];
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

  const speciesMapAdapter = createSpeciesMapAdapter();

  function renderSpeciesMap(element, config) {
    speciesMapAdapter.render(element, config);
  }

  const DEFAULT_API_BASE$1 = '/api/v1';
  const GRID_SQUARE_STATS_RESOURCE = 'grid-square-stats';
  const DEFAULT_PAGE_LIMIT$1 = 1000;
  const GRID_STATS_RECORDS_KEY = 'grid-stats-records';
  const GRID_STATS_SPECIES_KEY = 'grid-stats-species';

  let mapData = [];

  function createGridStatsMapAdapter() {
    return {
      name: 'grid-stats-map',
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

        const apiBase = renderConfig.source || DEFAULT_API_BASE$1;
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier(renderConfig.area);
        const loadId = (element.__tanvisGridStatsMapLoadId || 0) + 1;
        element.__tanvisGridStatsMapLoadId = loadId;
        element.dataset.visArea = renderConfig.area;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || event.type !== 'area-change') {
              return;
            }

            const nextArea = getEffectiveArea(renderConfig);

            if (nextArea === element.dataset.visArea) {
              return;
            }

            element.dataset.visArea = nextArea;
            createGridStatsMapAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        buildGridStatsMapRecords({ apiBase, geographicRegionIdentifier })
          .then((records) => {
            if (element.__tanvisGridStatsMapLoadId !== loadId) {
              return;
            }

            clearElement(element);
            const summary = createSummary(records.length, renderConfig.area);
            const mapContainer = document.createElement('div');

            element.appendChild(summary);
            element.appendChild(mapContainer);
            status.clear();

            mapData = records;
            console.log('[grid-stats-map] retrieved records:', mapData);

            renderMapBackend(mapContainer, renderConfig);
          })
          .catch((error) => {
            if (element.__tanvisGridStatsMapLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render grid stats map'));
          });
      }
    };
  }

  function createSummary(count, area) {
    const summary = document.createElement('p');
    summary.textContent = `${count} grid-square-stats records loaded${area ? ` for ${area}` : ''}. See the console for the raw payload.`;
    return summary;
  }

  function renderMapBackend(mapElement, config) {
    const mapTypeMode = normalizeMapTypeMode(config.mapType);
    const activeMapType = resolveActiveMapType(mapElement, mapTypeMode, 'tanvisGridStatsActiveMapType');
    const pointOpacity = activeMapType === 'leaflet' ? 0.7 : 1;
    const gridStatsType = normalizeGridStatsType(config.gridStatsType);
    const showGridStatsSwitch = gridStatsType === 'switch';
    const showMapTypeSwitch = mapTypeMode === 'switch';
    const selectedMapTypeKey = resolveSelectedMapTypeKey(mapElement, gridStatsType);
    const mapTypesSel = {
      [GRID_STATS_RECORDS_KEY]: () => createRecordNumberData(pointOpacity),
      [GRID_STATS_SPECIES_KEY]: () => createSpeciesNumberData(pointOpacity),
    };

    let map;

    if (activeMapType === 'leaflet') {
      map = renderLeafletAtlasMap(mapElement, config, {
        idPrefix: 'tanvis-grid-stats-map',
        errorMessage: 'Failed to render grid stats map',
        mapTypesSel,
        mapTypesKey: selectedMapTypeKey
      });
    } else {
      console.log('Rendering static grid stats map with records:', mapData);

      map = renderStaticAtlasMap(mapElement, config, {
        idPrefix: 'tanvis-grid-stats-map',
        errorMessage: 'Failed to render grid stats map',
        mapTypesSel,
        mapTypesKey: selectedMapTypeKey
      });
    }

    renderMapControlGroup(mapElement, {
      activeMapType,
      selectedMapTypeKey,
      showMapTypeSwitch,
      showGridStatsSwitch,
      onMapTypeChange: (nextMapType) => {
        mapElement.dataset.tanvisGridStatsActiveMapType = nextMapType;
        renderMapBackend(mapElement, config);
      },
      onGridStatsTypeChange: (nextMapTypeKey) => {
        mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = nextMapTypeKey;
        applyMapTypeSelection(map, nextMapTypeKey);
      }
    });

    return map;
  }

  function renderMapControlGroup(mapElement, options) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();
    const hostElement = mapElement.parentElement;
    if (!hostElement) {
      return;
    }

    const controls = ensureMapControlsContainer(hostElement);
    clearElement(controls);

    if (!options.showMapTypeSwitch && !options.showGridStatsSwitch) {
      controls.remove();
      return;
    }

    if (options.showMapTypeSwitch) {
      controls.appendChild(createMapTypeSwitchControl({
        mapElement,
        activeMapType: options.activeMapType,
        onChange: options.onMapTypeChange,
        fallbackId: 'tanvis-grid-stats-map'
      }));
    }

    if (options.showGridStatsSwitch) {
      controls.appendChild(createGridStatsTypeSwitchControl(mapElement, options.selectedMapTypeKey, options.onGridStatsTypeChange));
    }
  }

  function createGridStatsTypeSwitchControl(mapElement, selectedMapTypeKey, onChange) {
    const group = createRadioGroup({
      name: getGridStatsSwitchName(mapElement),
      selectedValue: selectedMapTypeKey === GRID_STATS_SPECIES_KEY ? 'species' : 'records',
      items: [
        { value: 'records', label: 'Records' },
        { value: 'species', label: 'Species' }
      ],
      onChange: (value) => {
        const mapTypeKey = value === 'species' ? GRID_STATS_SPECIES_KEY : GRID_STATS_RECORDS_KEY;
        onChange(mapTypeKey);
      }
    });

    group.classList.add('tanvis-grid-stats-switch');
    return group;
  }

  function applyMapTypeSelection(map, mapTypeKey) {
    if (!map || typeof map.setMapType !== 'function' || typeof map.redrawMap !== 'function') {
      return;
    }

    map.setMapType(mapTypeKey);
    map.redrawMap();
  }

  function getGridStatsSwitchName(mapElement) {
    const base = mapElement.id || 'tanvis-grid-stats-map';
    return `${base}-switch`;
  }

  function normalizeGridStatsType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'species') {
      return 'species';
    }

    if (normalized === 'records') {
      return 'records';
    }

    return 'switch';
  }

  function resolveSelectedMapTypeKey(mapElement, gridStatsType) {
    if (gridStatsType === 'species') {
      mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_SPECIES_KEY;
      return GRID_STATS_SPECIES_KEY;
    }

    if (gridStatsType === 'records') {
      mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_RECORDS_KEY;
      return GRID_STATS_RECORDS_KEY;
    }

    const saved = mapElement?.dataset?.tanvisGridStatsSelectedMapTypeKey;
    if (saved === GRID_STATS_SPECIES_KEY || saved === GRID_STATS_RECORDS_KEY) {
      return saved;
    }

    mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_RECORDS_KEY;
    return GRID_STATS_RECORDS_KEY;
  }

  async function buildGridStatsMapRecords({ apiBase, geographicRegionIdentifier }) {
    const gridSquareStatsRows = await fetchGridSquareStats({
      apiBase,
      geographicRegionIdentifier,
    });

    return gridSquareStatsRows;
  }

  async function fetchGridSquareStats({ apiBase, geographicRegionIdentifier }) {
    const resourceUrl = resolveResourceUrl$1(apiBase, GRID_SQUARE_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('include', 'geographic-region');
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$1));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$1(pageUrl.toString(), 'Failed to load grid-square-stats');
      const pageRows = getListData$1(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$1) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$1;
    }

    return rows;
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

  function clearControlSubscription(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function createRecordNumberData(opacity = 1) {
    return new Promise(function (resolve) {
      const minVal = mapData.reduce((min, r) => Math.min(min, r.occurrences_count || Infinity), Infinity);
      const maxVal = mapData.reduce((max, r) => Math.max(max, r.occurrences_count || -Infinity), -Infinity);
      const colorScale = d3.scaleSequential()
        .domain([minVal, maxVal])
        .interpolator(d3.interpolateViridis);

      const recs = mapData.map(function (r) {
        return {
          gr: r.square,
          id: r.square,
          colour: colorScale(r.occurrences_count || 0),
          caption: `${r.square}: ${r.occurrences_count || 0} records`
        };
      });
      resolve({ records: recs, size: 1, precision: 2000, shape: 'circle', opacity });
    });
  }

  function createSpeciesNumberData(opacity = 1) {
    return new Promise(function (resolve) {
      const minVal = mapData.reduce((min, r) => Math.min(min, r.species_count || Infinity), Infinity);
      const maxVal = mapData.reduce((max, r) => Math.max(max, r.species_count || -Infinity), -Infinity);
      const colorScale = d3.scaleSequential()
        .domain([minVal, maxVal])
        .interpolator(d3.interpolateCividis);

      const recs = mapData.map(function (r) {
        return {
          gr: r.square,
          id: r.square,
          colour: colorScale(r.species_count || 0),
          caption: `${r.square}: ${r.species_count || 0} species`
        };
      });
      resolve({ records: recs, size: 1, precision: 2000, shape: 'circle', opacity });
    });
  }

  const gridStatsMapAdapter = createGridStatsMapAdapter();

  function renderGridStatsMap(element, config) {
    gridStatsMapAdapter.render(element, config);
  }

  // Adapter for Tanvis temporal year charts backed by BRC Charts.
  // Keeps all dependency checks and data-loading in one place.

  const DEFAULT_API_BASE = '/api/v1';
  const TAXON_YEAR_STATS_RESOURCE = 'taxon-year-stats';
  const DEFAULT_PAGE_LIMIT = 1000;

  let temporalYearChartIdCounter = 0;

  function createTemporalYearChartAdapter() {
    return {
      name: 'temporal-year-chart',
      render(element, config) {
        clearLinkedTableSubscription(element);
        const renderConfig = { ...config };

        if (renderConfig.linkedTable) {
          element.__tanvisLinkedTableCleanup = subscribeToLinkedTable(renderConfig.linkedTable, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            createTemporalYearChartAdapter().render(element, {
              ...renderConfig,
              taxonId: speciesId
            });
          });
        }

        const loadId = (element.__tanvisTemporalYearLoadId || 0) + 1;
        element.__tanvisTemporalYearLoadId = loadId;
        element.dataset.visTaxonid = renderConfig.taxonId || '';
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        loadTemporalYearChart(element, renderConfig)
          .then(() => {
            if (element.__tanvisTemporalYearLoadId !== loadId) {
              return;
            }

            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisTemporalYearLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render temporal year chart'));
          });
      }
    };
  }

  function subscribeToLinkedTable(linkedTableId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const linkedTableElement = document.getElementById(linkedTableId);
    if (!linkedTableElement) {
      return undefined;
    }

    const onRowSelected = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    linkedTableElement.addEventListener('species-row-selected', onRowSelected);
    return () => {
      linkedTableElement.removeEventListener('species-row-selected', onRowSelected);
    };
  }

  function clearLinkedTableSubscription(element) {
    const cleanup = element?.__tanvisLinkedTableCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisLinkedTableCleanup;
  }

  async function loadTemporalYearChart(element, config) {

    // If not taxonId is provided, we cannot load any data, 
    // so we just return early without rendering anything.
    if (!config.taxonId) return;

    const brcCharts = getBrcChartsGlobal();

    if (!brcCharts) {
      throw new Error('BRC Charts is not available. Include brccharts.umd.js before Tanvis.');
    }

    if (!getD3Global()) {
      throw new Error('D3 is not available. Include d3 before brccharts.umd.js and Tanvis.');
    }

    if (typeof brcCharts.temporal !== 'function') {
      throw new Error('BRC Charts temporal chart is not available. Include a compatible brccharts.umd.js bundle.');
    }

    const chartRecords = await fetchTaxonYearStats({
      apiBase: config.source || DEFAULT_API_BASE,
      taxonIdentifier: config.taxonId,
      startYear: config.startYear,
      endYear: config.endYear
    });

    const chartContainer = createTemporalYearChartContainer(element);
    const chartOptions = createTemporalYearChartOptions({
      config,
      chartContainer,
      chartRecords
    });

    clearElement(element);
    element.appendChild(chartContainer);
    console.log('Rendering temporal year chart with options:', chartOptions);
    brcCharts.temporal(chartOptions);
  }

  async function fetchTaxonYearStats({ apiBase, taxonIdentifier, startYear, endYear }) {
    const resourceUrl = resolveResourceUrl(apiBase, TAXON_YEAR_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    if (!taxonIdentifier) {
      return rows;
    }

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);

      if (Number.isFinite(startYear)) {
        pageUrl.searchParams.set('year[gte]', String(startYear));
      }

      if (Number.isFinite(endYear)) {
        pageUrl.searchParams.set('year[lte]', String(endYear));
      }

      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-year-stats');
      const pageRows = getListData(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT;
    }

    return rows;
  }

  function createTemporalYearChartContainer(element) {
    const container = document.createElement('div');
    container.dataset.tanvisTemporalYearChart = 'chart';

    if (!element.id) {
      temporalYearChartIdCounter += 1;
      element.id = `tanvis-temporal-year-chart-${temporalYearChartIdCounter}`;
    }

    container.id = `${element.id}__chart`;
    return container;
  }

  function createTemporalYearChartOptions({ config, chartContainer, chartRecords }) {
    return {
      selector: `#${chartContainer.id}`,
      data: chartRecords.map((row) => ({
        period: Number(row.year),
        occurrences_count: Number(row.occurrences_count || 0),
        grid_square_count: Number(row.grid_square_count || 0)
      })),
      metrics: [
        { prop: 'occurrences_count', label: 'Occurrences', colour: '#c2410c' },
        { prop: 'grid_square_count', label: 'Grid squares', colour: '#1d4ed8' }
      ],
      periodType: 'year',
      chartStyle: 'line',
      lineInterpolator: 'curveMonotoneX',
      showLegend: true,
      interactivity: 'mousemove',
      minY: 0,
      ...(Number.isFinite(config.startYear) ? { minPeriod: config.startYear } : {}),
      ...(Number.isFinite(config.endYear) ? { maxPeriod: config.endYear } : {}),
      ...(config.expand !== undefined ? { expand: config.expand } : {}),
      ...(config.width !== undefined ? { width: config.width } : {}),
      ...(config.height !== undefined ? { height: config.height } : {})
    };
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

  function getBrcChartsGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brccharts || null;
  }

  function getD3Global() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.d3 || null;
  }

  const temporalYearChartAdapter = createTemporalYearChartAdapter();

  function renderTemporalYearChart(element, config) {
    temporalYearChartAdapter.render(element, config);
  }

  // Makes initialization idempotent so calling init() repeatedly 
  // does not keep re-registering the same renderers.


  let defaultsRegistered = false;

  function registerDefaults() {
    if (defaultsRegistered) {
      return;
    }

    registerRenderer('static-map', renderStaticMap);
    registerRenderer('control-block', renderControlBlock);
    registerRenderer('new-species-table', renderNewSpeciesTable);
    registerRenderer('increasing-species-table', renderIncreasingSpeciesTable);
    registerRenderer('species-absent-since', renderSpeciesAbsentSince);
    registerRenderer('species-map', renderSpeciesMap);
    registerRenderer('grid-stats-map', renderGridStatsMap);
    registerRenderer('temporal-year-chart', renderTemporalYearChart);
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
