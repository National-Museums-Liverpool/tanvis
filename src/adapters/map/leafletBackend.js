import { clearElement } from '../../utils/dom.js';
import { normalizeErrorMessage } from '../../utils/apiError.js';
import { createVisStatusReporter } from '../../utils/visStatus.js';
import {
  assignElementId,
  attachExpandResizeHandlers,
  clearControlSubscription,
  clearExpandResizeHandlers,
  calculateHeightFromBounds,
  getAreaBounds,
  getAreaCentroid,
  getAreaInitZoom,
  getBrcAtlasGlobal,
  getConfiguredWidth,
  getEffectiveArea,
  parseOptionalPositiveNumber,
  subscribeToAreaControl
} from './common.js';

export function renderLeafletAtlasMap(element, config, options = {}) {
  clearExpandResizeHandlers(element);
  clearControlSubscription(element);

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

    const effectiveArea = getEffectiveArea(config);
    const renderConfig = effectiveArea === config.area
      ? config
      : {
          ...config,
          area: effectiveArea
        };

    element.dataset.visArea = renderConfig.area;

    const map = brcAtlas.leafletMap(createLeafletMapOptions(element, renderConfig));

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

function createLeafletMapOptions(element, config) {
  const width = getConfiguredWidth(element, config);
  const explicitHeight = parseOptionalPositiveNumber(config.height);
  const selectedBounds = getAreaBounds(config.area);
  const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);
  const showBoundaries = config.boundaries === true;

  return {
    selector: `#${element.id}`,
    showVcs: showBoundaries,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
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

function panToAreaCentroid(areaKey, map) {
  const centroid = getAreaCentroid(areaKey);
  const zoom = getAreaInitZoom(areaKey);
  const leafletMap = map?.lmap;

  if (!centroid || !leafletMap || typeof leafletMap.setView !== 'function') {
    return;
  }

  leafletMap.setView([centroid.lat, centroid.lon], zoom);
}

