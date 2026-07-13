import { clearElement } from '../utils/dom.js';
import { transOptsSel } from './transOptsSel.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { normalizeErrorMessage } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

// Wrapper to adapt BRC Atlas Leaflet maps for use in Tanvis.
// This allows users to specify Leaflet/slippy maps as a visualization 
// type in their HTML, and have them rendered using the BRC Atlas library.

let mapIdCounter = 0;

export function createLeafletMapAdapter() {
  return {
    name: 'leaflet-map',
    render(element, config) {
      // Clean up any previously attached expand listeners before re-rendering this element.
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

        if (!element.id) {
          mapIdCounter += 1;
          element.id = `tanvis-leaflet-map-${mapIdCounter}`;
        }

        const effectiveArea = getEffectiveArea(config);
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
