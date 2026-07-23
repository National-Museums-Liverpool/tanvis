import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { renderLeafletAtlasMap } from './map/leafletBackend.js';
import { renderStaticAtlasMap } from './map/staticBackend.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';
import {
  createMapTypeSwitchControl,
  ensureMapControlsContainer,
  normalizeMapTypeMode,
  resolveActiveMapType
} from './map/mapTypeSwitchControl.js';

const DEFAULT_API_BASE = '/api/v1';
const OCCURRENCES_RESOURCE = 'occurrences';
const DEFAULT_PAGE_LIMIT = 1000;

export function createSpeciesMapAdapter() {
  return {
    name: 'species-map',
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

      const speciesCode = renderConfig.species || '';
      const apiBase = renderConfig.source || DEFAULT_API_BASE;
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

        renderMapBackend(mapContainer, renderConfig);
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

function renderMapBackend(element, config) {
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
      renderMapBackend(element, config);
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
  if (area === 'vc-58-59-60' || area === 'vc-58-69-60') {
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
