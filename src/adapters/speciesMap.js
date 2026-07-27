import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { renderLeafletAtlasMap } from './map/leafletBackend.js';
import { renderStaticAtlasMap } from './map/staticBackend.js';
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
const DEFAULT_PAGE_LIMIT = 1000;
let mapData = [];

export function createSpeciesMapAdapter() {
  return {
    name: 'species-map',
    render(element, config) {
      const effectiveArea = getEffectiveArea(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };
      const linkedTableId = renderConfig.linkedTable || '';
      const shouldPreserveLinkedTableSubscription = Boolean(
        element.__tanvisLinkedTableCleanup &&
        element.__tanvisLinkedTableId === linkedTableId
      );
      const shouldPreserveControlSubscription = Boolean(
        element.__tanvisControlCleanup &&
        element.__tanvisControlId === renderConfig.control
      );
      if (!shouldPreserveLinkedTableSubscription) {
        clearLinkedTableSubscription(element);
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

      const speciesCode = renderConfig.species || '';
      const apiBase = resolveApiBase(renderConfig.source);

      if (!hasD3Dependency()) {
        status.showError(D3_DEPENDENCY_MESSAGE);
        return;
      }
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const loadId = (element.__tanvisSpeciesMapLoadId || 0) + 1;
      element.__tanvisSpeciesMapLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visSpecies = speciesCode;

      if (renderConfig.control) {
        if (!shouldPreserveControlSubscription) {
          const controlElement = document.getElementById(renderConfig.control);
          const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
              return;
            }

            const nextArea = getEffectiveArea(renderConfig);
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

          const onSpeciesSelection = (event) => {
            const speciesId = event?.detail?.speciesId;
            if (typeof speciesId !== 'string' || !speciesId.trim()) {
              return;
            }

            if (speciesId.trim() === element.dataset.visSpecies) {
              return;
            }

            element.dataset.visSpecies = speciesId.trim();
            createSpeciesMapAdapter().render(element, {
              ...renderConfig,
              species: speciesId.trim(),
              reuseExistingMap: true
            });
          };

          if (controlElement) {
            controlElement.addEventListener('species-row-selected', onSpeciesSelection);
          }

          element.__tanvisControlCleanup = () => {
            controlBusCleanup?.();
            if (controlElement) {
              controlElement.removeEventListener('species-row-selected', onSpeciesSelection);
            }
          };
          element.__tanvisControlId = renderConfig.control;
        }
      }

      if (renderConfig.linkedTable) {
        if (!shouldPreserveLinkedTableSubscription) {
          element.__tanvisLinkedTableCleanup = subscribeToLinkedTable(linkedTableId, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visSpecies) {
              return;
            }

            element.dataset.visSpecies = speciesId;
            createSpeciesMapAdapter().render(element, {
              ...renderConfig,
              species: speciesId,
              reuseExistingMap: true
            });
          });
          element.__tanvisLinkedTableId = linkedTableId;
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
      } catch (error) {
        if (element.__tanvisSpeciesMapLoadId !== loadId) {
          return;
        }

        clearElement(element);
        status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
        return;
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

          const occurrenceRows = Array.isArray(rows) ? rows : [];

          applyOccurrenceDataToMap(map, occurrenceRows);
        })
        .catch((error) => {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            return;
          }

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
  const dotStyleOptions = getDotStyleOptions(hostElement);
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
      mapTypesKey: OCCURRENCES_MAP_TYPE_KEY
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
        species: hostElement?.dataset?.visSpecies || config.species,
        mapType: 'switch',
        linkedTable: config.linkedTable,
        control: config.control,
        source: config.source,
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

function clearLinkedTableSubscription(element) {
  const cleanup = element?.__tanvisLinkedTableCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisLinkedTableCleanup;
  delete element.__tanvisLinkedTableId;
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

function getDotStyleOptions(hostElement) {
  if (!hostElement || typeof hostElement.dataset !== 'object') {
    return {};
  }

  return {
    dotColour: hostElement.dataset.visDotColour || '',
    transformation: hostElement.dataset.visTransformation || '',
    shape: hostElement.dataset.visDotShape || 'circle'
  };
}

export function applyOccurrenceDataToMap(map, occurrenceRows = []) {
  mapData = Array.isArray(occurrenceRows) ? occurrenceRows : [];

  if (!map || typeof map.setMapType !== 'function' || typeof map.redrawMap !== 'function') {
    return;
  }

  map.setMapType(OCCURRENCES_MAP_TYPE_KEY);
  map.redrawMap();

  return map;
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

  const resourceUrl = resolveResourceUrl(apiBase, OCCURRENCES_RESOURCE);
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
  if (area === 'vc-all' || area === 'vc-58-69-60') {
    return [];
  }

  return [];
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
      if (!r.grid_ref_2km) {
        // Filter out records with no grid reference
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
