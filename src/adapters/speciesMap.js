import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { renderLeafletAtlasMap } from './map/leafletBackend.js';
import { renderStaticAtlasMap } from './map/staticBackend.js';
import { normalizeAreaContractValue } from '../controls/areaControls.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';
import {
  createMapTypeSwitchControl,
  ensureMapControlsContainer,
  normalizeMapTypeMode,
  resolveActiveMapType
} from './map/mapTypeSwitchControl.js';
import { D3_DEPENDENCY_MESSAGE, resolveColours } from '../utils/colourMapDots.js';
import { resolveApiBase } from '../config/apiBase.js';

const OCCURRENCES_RESOURCE = 'occurrences';
const OCCURRENCES_MAP_TYPE_KEY = 'occurrences';
const DEFAULT_PAGE_LIMIT = 10000;
let mapData = [];

function shouldLogSpeciesMapDebug() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.__tanvisSpeciesMapDebug === true) {
    return true;
  }

  const searchParams = new URLSearchParams(window.location?.search || '');
  return searchParams.get('tanvisDebug') === 'species-map';
}

function logSpeciesMapDebug(message, details = {}) {
  if (!shouldLogSpeciesMapDebug()) {
    return;
  }

  console.log('[species-map]', message, details);
}

export function createSpeciesMapAdapter() {
  return {
    name: 'species-map',
    render(element, config) {
      const effectiveArea = getEffectiveArea(config);
      const normalizedArea = normalizeAreaContractValue(effectiveArea);
      const renderConfig = {
        ...config,
        area: normalizedArea
      };
      const taxonIdSourceId = renderConfig.taxonIdSource || '';
      const shouldPreserveTaxonIdSourceSubscription = Boolean(
        element.__tanvisTaxonIdSourceCleanup &&
        element.__tanvisTaxonIdSourceId === taxonIdSourceId
      );
      const shouldPreserveControlSubscription = Boolean(
        element.__tanvisControlCleanup &&
        element.__tanvisControlId === renderConfig.control
      );
      if (!shouldPreserveTaxonIdSourceSubscription) {
        clearTaxonIdSourceSubscription(element);
      }
      if (!shouldPreserveControlSubscription) {
        clearControlSubscription(element);
      }

      const status = createVisStatusReporter(element);
      const existingMap = element.__tanvisSpeciesMapInstance;
      const shouldReuseExistingMap = Boolean(
        config.reuseExistingMap && existingMap && !config.forceCreateMap
      );
      status.showInfo('Loading...');

      const currentSpeciesFromElement = element.dataset.visTaxonid || '';
      const speciesCode = currentSpeciesFromElement || renderConfig.species || renderConfig.taxonId || '';
      const apiBase = resolveApiBase();
      const areaValue = normalizeAreaContractValue(renderConfig.area ?? '');

      logSpeciesMapDebug('render:start', {
        loadId: (element.__tanvisSpeciesMapLoadId || 0) + 1,
        area: areaValue,
        species: speciesCode,
        control: renderConfig.control || '',
        reuseExistingMap: shouldReuseExistingMap,
        forceCreateMap: Boolean(config.forceCreateMap)
      });

      if (!hasD3Dependency()) {
        status.showError(D3_DEPENDENCY_MESSAGE);
        return;
      }
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const loadId = (element.__tanvisSpeciesMapLoadId || 0) + 1;
      element.__tanvisSpeciesMapLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visTaxonid = speciesCode;

      if (renderConfig.control) {
        if (!shouldPreserveControlSubscription) {
          const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
            const currentArea = normalizeAreaContractValue(element.dataset.visArea);
            const currentTaxonGroup = element.dataset.visTaxonGroup || '';

            if (nextArea === currentArea && nextTaxonGroupExternalKey === currentTaxonGroup) {
              return;
            }

            element.dataset.visArea = nextArea;
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            logSpeciesMapDebug('control:area-change', {
              area: nextArea,
              taxonGroup: nextTaxonGroupExternalKey,
              control: renderConfig.control || ''
            });
            createSpeciesMapAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });

          element.__tanvisControlCleanup = () => {
            controlBusCleanup?.();
          };
          element.__tanvisControlId = renderConfig.control;
        }
      }

      if (renderConfig.taxonIdSource) {
        if (!shouldPreserveTaxonIdSourceSubscription) {
          element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(taxonIdSourceId, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            element.dataset.visTaxonid = speciesId;
            createSpeciesMapAdapter().render(element, {
              ...renderConfig,
              species: speciesId,
              reuseExistingMap: true
            });
          });
          element.__tanvisTaxonIdSourceId = taxonIdSourceId;
        }
      }

      let map = existingMap;
      let mapContainer = element.__tanvisSpeciesMapContainer || null;

      if (!mapContainer || !mapContainer.isConnected) {
        mapContainer = document.createElement('div');
        mapContainer.dataset.tanvisSpeciesMap = 'map';
        element.appendChild(mapContainer);
      }

      if (!shouldReuseExistingMap) {
        clearElement(mapContainer);
        map = null;
      }

      element.__tanvisSpeciesMapContainer = mapContainer;
      status.clear();

      try {
        if (!map || !shouldReuseExistingMap) {
          map = renderMapBackend(mapContainer, renderConfig, element);
          element.__tanvisSpeciesMapInstance = map;
        }

        logSpeciesMapDebug('render:map-ready', {
          loadId,
          area: renderConfig.area ?? '',
          species: speciesCode,
          reusedExistingMap: shouldReuseExistingMap,
          hasMapInstance: Boolean(map)
        });
      } catch (error) {
        if (element.__tanvisSpeciesMapLoadId !== loadId) {
          return;
        }

        clearElement(element);
        status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
        return;
      }

      logSpeciesMapDebug('fetch:start', {
        loadId,
        area: renderConfig.area ?? '',
        species: speciesCode
      });

      fetchSpeciesOccurrences({
        apiBase,
        speciesCode,
        area: renderConfig.area,
      })
        .then((rows) => {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            logSpeciesMapDebug('fetch:ignored-stale-response', {
              loadId,
              area: renderConfig.area ?? '',
              species: speciesCode
            });
            return;
          }

          const occurrenceRows = Array.isArray(rows) ? rows : [];

          logSpeciesMapDebug('fetch:resolved', {
            loadId,
            area: renderConfig.area ?? '',
            species: speciesCode,
            rowCount: occurrenceRows.length
          });

          logSpeciesMapDebug('adapter:apply-data', {
            loadId,
            area: renderConfig.area ?? '',
            species: speciesCode,
            mapInstanceId: map?.__tanvisMapInstanceId,
            mapArea: map?.__tanvisMapArea,
            elementId: element.id
          });

          applyOccurrenceDataToMap(map, occurrenceRows, {
            loadId,
            area: renderConfig.area ?? '',
            species: speciesCode,
            mapInstanceId: map?.__tanvisMapInstanceId,
            mapArea: map?.__tanvisMapArea,
            elementId: element.id
          });
        })
        .catch((error) => {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            return;
          }

          logSpeciesMapDebug('fetch:error', {
            loadId,
            area: renderConfig.area ?? '',
            species: speciesCode,
            error: normalizeErrorMessage(error, 'Failed to render species map')
          });
          console.error('[species-map] failed to fetch occurrences:', error);
          status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
        });
    }
  };
}

function hasD3Dependency() {
  return typeof globalThis.d3 !== 'undefined' || typeof globalThis.window?.d3 !== 'undefined';
}

function renderMapBackend(element, config, hostElement) {
  const mapTypeMode = normalizeMapTypeMode(config.mapType);
  const shouldShowMapTypeSwitch = mapTypeMode === 'switch'
    || hostElement?.dataset?.tanvisSpeciesMapControlMode === 'switch'
    || element?.dataset?.tanvisSpeciesMapControlMode === 'switch';
  const activeMapType = resolveActiveMapType(element, mapTypeMode, 'tanvisSpeciesMapActiveMapType');
  const pointOpacity = activeMapType === 'leaflet' ? 0.7 : 1;
  const dotStyleOptions = getDotStyleOptions(config, hostElement);
  const mapTypesSel = {
    [OCCURRENCES_MAP_TYPE_KEY]: () => createOccurrenceData(pointOpacity, dotStyleOptions),
  };

  let map;

  if (activeMapType === 'leaflet') {
    map = renderLeafletAtlasMap(element, config, {
      idPrefix: 'tanvis-species-map',
      errorMessage: 'Failed to render species map',
      mapTypesSel,
      mapTypesKey: OCCURRENCES_MAP_TYPE_KEY
    });
  } else {
    map = renderStaticAtlasMap(element, config, {
      idPrefix: 'tanvis-species-map',
      errorMessage: 'Failed to render species map',
      mapTypesSel,
      mapTypesKey: OCCURRENCES_MAP_TYPE_KEY,
      subscribeToAreaControl: false
    });
  }

  if (shouldShowMapTypeSwitch) {
    element.dataset.tanvisSpeciesMapControlMode = 'switch';
    if (hostElement) {
      hostElement.dataset.tanvisSpeciesMapControlMode = 'switch';
    }
  } else {
    delete element.dataset.tanvisSpeciesMapControlMode;
    if (hostElement) {
      delete hostElement.dataset.tanvisSpeciesMapControlMode;
    }
  }

  renderMapControlGroup(element, {
    activeMapType,
    showMapTypeSwitch: shouldShowMapTypeSwitch,
    onMapTypeChange: (nextMapType) => {
      element.dataset.tanvisSpeciesMapActiveMapType = nextMapType;
      if (hostElement) {
        hostElement.dataset.tanvisSpeciesMapActiveMapType = nextMapType;
      }

      createSpeciesMapAdapter().render(hostElement, {
        ...config,
        area: hostElement?.dataset?.visArea || config.area,
        species: hostElement?.dataset?.visTaxonid || config.species || config.taxonId,
        mapType: 'switch',
        taxonIdSource: config.taxonIdSource,
        control: config.control,
        forceCreateMap: true
      });
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

function clearControlSubscription(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
  delete element.__tanvisControlId;
}

function clearTaxonIdSourceSubscription(element) {
  const cleanup = element?.__tanvisTaxonIdSourceCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisTaxonIdSourceCleanup;
  delete element.__tanvisTaxonIdSourceId;
}

function subscribeToTaxonIdSource(taxonIdSourceId, onSpeciesSelected) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
  if (!taxonIdSourceElement) {
    return undefined;
  }

  const onRowSelected = (event) => {
    const speciesId = event?.detail?.speciesId;
    if (typeof speciesId !== 'string' || !speciesId.trim()) {
      return;
    }

    onSpeciesSelected(speciesId.trim());
  };

  taxonIdSourceElement.addEventListener('taxon-identified', onRowSelected);
  return () => {
    taxonIdSourceElement.removeEventListener('taxon-identified', onRowSelected);
  };
}

function getDotStyleOptions(config = {}, hostElement) {
  if (!hostElement || typeof hostElement.dataset !== 'object') {
    return {
      dotColour: config.dotColour || '',
      transformation: config.transformation || '',
      shape: config.dotShape || 'circle'
    };
  }

  return {
    dotColour: config.dotColour ?? hostElement.dataset.visDotColour ?? '',
    transformation: config.transformation ?? hostElement.dataset.visTransformation ?? '',
    shape: config.dotShape ?? hostElement.dataset.visDotShape ?? 'circle'
  };
}

export function applyOccurrenceDataToMap(map, occurrenceRows = [], context = {}) {
  mapData = Array.isArray(occurrenceRows) ? occurrenceRows : [];

  logSpeciesMapDebug('map:apply-data', {
    ...context,
    rowCount: mapData.length
  });

  if (!map || typeof map.setMapType !== 'function' || typeof map.redrawMap !== 'function') {
    logSpeciesMapDebug('map:skipped', { ...context, rowCount: mapData.length });
    return;
  }

  logSpeciesMapDebug('map:redraw', {
    ...context,
    rowCount: mapData.length,
    mapInstanceId: map?.__tanvisMapInstanceId,
    mapArea: map?.__tanvisMapArea,
    elementId: map?.__tanvisMapElementId
  });
  map.setMapType(OCCURRENCES_MAP_TYPE_KEY);

  map.redrawMap();

  return map;
}

function getEffectiveArea(config) {
  if (!config.control) {
    return normalizeAreaContractValue(config.area);
  }

  if (typeof document === 'undefined') {
    return normalizeAreaContractValue(config.area);
  }

  const controlElement = document.getElementById(config.control);
  const controlAreaValue = controlElement?.dataset?.visArea;
  const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
  if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
    return normalizedControlAreaValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
    return normalizeAreaContractValue(latestEvent.area);
  }

  return normalizeAreaContractValue(config.area);
}

function getEffectiveTaxonGroup(config) {
  if (!config.control || typeof document === 'undefined') {
    return '';
  }

  const controlElement = document.getElementById(config.control);
  return controlElement?.dataset?.visTaxonGroup || '';
}

async function fetchSpeciesOccurrences({ apiBase, speciesCode, area }) {
  if (!speciesCode) {
    return [];
  }

  const resourceUrl = resolveResourceUrl(apiBase, OCCURRENCES_RESOURCE);
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('taxon_identifier[eq]', speciesCode);

    if (area) {
      pageUrl.searchParams.set('higher_geography_identifier[eq]', String(area));
    }

    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
    pageUrl.searchParams.set('offset', String(offset));

    const payload = await fetchJson(pageUrl.toString(), 'Failed to load occurrences');
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
  logApiRequest(url, { method: 'GET' });

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

export function createOccurrenceData(opacity = 1, options = {}) {
  return new Promise(function (resolve) {
    const { dotColour = '', transformation = '', shape = 'circle' } = options || {};

    if (!hasD3Dependency()) {
      throw new Error(D3_DEPENDENCY_MESSAGE);
    }

    // mapData contains occurrence data which obviously can include many
    // records for a single grid reference. So we need to convert this to
    // have one record per grid reference, with the number of occurrences 
    // for each grid reference. This is done by grouping the data by grid 
    // reference and counting the occurrences.
    let recs = [];
    mapData.forEach(r => {
      // Filter out records with no grid reference
      if (!r.grid_ref_2km) {
        return;
      } 

      // Filter out records with invalid tetrad grid reference
      if (!/^[A-HJ-Z]{2}\d{2}[A-NP-Z]$/.test(r.grid_ref_2km)) {
        return;
      }

      const existing = recs.find(item => item.gr === r.grid_ref_2km);
      if (existing) {
        existing.val += 1;
      } else {
        recs.push({ 
          gr: r.grid_ref_2km, 
          val: 1
        });
      }
    });

    // Enrich with colour and caption
    recs.forEach(r => {
      r.caption = `${r.gr}: ${r.val} records`;
    });

    const resolvedTransform = transformation || '';
    const resolvedColourScale = dotColour || 'black';
    recs = resolveColours(recs, resolvedTransform, resolvedColourScale);

    resolve({ records: recs, size: 1, precision: 2000, shape, opacity });
  });
}
