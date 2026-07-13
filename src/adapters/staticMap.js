import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { normalizeErrorMessage } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { transOptsSel } from './transOptsSel.js';

// Wrapper to adapt BRC Atlas maps for use in Tanvis.
// This allows users to specify BRC Atlas maps as a visualization 
// type in their HTML, and have them rendered using the BRC Atlas library.

let mapIdCounter = 0;

export function createBrcAtlasAdapter() {
  return {
    name: 'static-map',
    render(element, config) {
      clearControlSubscription(element);
      const status = createVisStatusReporter(element);
      clearElement(element);
      status.showInfo('Loading...');

      try {
        const brcAtlas = getBrcAtlasGlobal();

        if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
          throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
        }

        if (!element.id) {
          mapIdCounter += 1;
          element.id = `tanvis-map-${mapIdCounter}`;
        }

        const effectiveArea = getEffectiveArea(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        element.dataset.visArea = renderConfig.area;

        console.log('Creating BRC Atlas map with config:', renderConfig);

        const map = brcAtlas.svgMap(createMapOptions(element, renderConfig));

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

function createMapOptions(element, config) {
  const includeHectads = config.hectads !== false;
  const shouldExpand = config.expand === true;
  const width = parseOptionalPositiveNumber(config.width);
  const explicitHeight = parseOptionalPositiveNumber(config.height);
  const selectedBounds = transOptsSel[config.area]?.bounds;
  // For static maps, width is derived from transOpts. If data-vis-height is provided,
  // use it directly; otherwise fall back to calculating height from data-vis-width.
  const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

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

function getBrcAtlasGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brcatlas || null;
}
