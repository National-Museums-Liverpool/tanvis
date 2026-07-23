import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { renderLeafletAtlasMap } from './map/leafletBackend.js';
import { renderStaticAtlasMap } from './map/staticBackend.js';
import { createRadioGroup } from '../controls/radioGroup.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';
import {
  createMapTypeSwitchControl,
  ensureMapControlsContainer,
  normalizeMapTypeMode,
  resolveActiveMapType
} from './map/mapTypeSwitchControl.js';

const DEFAULT_API_BASE = '/api/v1';
const GRID_SQUARE_STATS_RESOURCE = 'grid-square-stats';
const DEFAULT_PAGE_LIMIT = 1000;
const GRID_STATS_RECORDS_KEY = 'grid-stats-records';
const GRID_STATS_SPECIES_KEY = 'grid-stats-species';

let mapData = [];

export function createGridStatsMapAdapter() {
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

      const apiBase = renderConfig.source || DEFAULT_API_BASE;
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
    map,
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
  const resourceUrl = resolveResourceUrl(apiBase, GRID_SQUARE_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('include', 'geographic-region');
    if (Number.isFinite(geographicRegionIdentifier)) {
      pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
    }
    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
    pageUrl.searchParams.set('offset', String(offset));

    const payload = await fetchJson(pageUrl.toString(), 'Failed to load grid-square-stats');
    const pageRows = getListData(payload);
    rows.push(...pageRows);

    if (pageRows.length < DEFAULT_PAGE_LIMIT) {
      break;
    }

    offset += DEFAULT_PAGE_LIMIT;
  }

  return rows;
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
