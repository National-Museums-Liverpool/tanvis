import { clearElement } from '../../utils/dom.js';
import { normalizeErrorMessage } from '../../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../../utils/visStatus.js';
import { ensureSharedStyles } from '../../styles/sharedStyles.js';
import {
  assignElementId,
  clearControlSubscription,
  clearExpandResizeHandlers,
  getAreaBounds,
  calculateHeightFromBounds,
  getBrcAtlasGlobal,
  getEffectiveArea,
  parseOptionalPositiveNumber,
  resolveAreaSelectionKey,
  subscribeToAreaControl
} from './common.js';
import { transOptsSel } from '../transOptsSel.js';

export function renderStaticAtlasMap(element, config, options = {}) {
  clearExpandResizeHandlers(element);
  clearControlSubscription(element);

  const status = createVisStatusReporter(element);
  clearElement(element);
  status.showInfo('Loading...');

  try {
    const brcAtlas = getBrcAtlasGlobal();

    if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
      throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
    }

    const hasStylesheet = ensureStylesheetDependency(status, {
      libraryName: 'BRC Atlas',
      stylesheetHints: ['brcatlas.umd.css'],
      message: 'BRC Atlas stylesheet is missing. Include brcatlas.umd.css to ensure the static map is styled correctly.'
    });

    const idPrefix = options.idPrefix || 'tanvis-map';
    assignElementId(element, idPrefix);
    ensureMapTetradInfo(element);

    const effectiveArea = getEffectiveArea(config);
    const renderConfig = effectiveArea === config.area
      ? config
      : {
          ...config,
          area: effectiveArea
        };

    element.dataset.visArea = renderConfig.area;

    //console.log('config', createStaticMapOptions(element, renderConfig, options));
    console.log('rendering static map for area:', renderConfig.area);
    const map = brcAtlas.svgMap(createStaticMapOptions(element, renderConfig, options));
    const instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    map.__tanvisMapInstanceId = instanceId;
    map.__tanvisMapArea = renderConfig.area;
    map.__tanvisMapElementId = element.id;
    console.log('[species-map] created static map instance', {
      instanceId,
      area: renderConfig.area,
      elementId: element.id
    });
    // pause execution to allow the map to render before continuing (for testing purposes)

    //await new Promise(resolve => setTimeout(resolve, 1000));

    if (map && typeof map.redrawMap === 'function') {
      console.log('[species-map] redraw static map instance', {
        instanceId,
        area: renderConfig.area,
        elementId: element.id
      });
      map.redrawMap();
    }

    if (renderConfig.control && options.subscribeToAreaControl !== false) {
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

    if (hasStylesheet) {
      status.clear();
    }
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

  const areaSelectionKey = resolveAreaSelectionKey(config.area);

  return {
    selector: `#${element.id}`,
    captionId: 'map-tetrad-info',
    transOptsControl: false,
    transOptsSel,
    transOptsKey: areaSelectionKey,
    boundaryGjson: `data/vcs/simp-100/${areaSelectionKey}-100.geojson`,
    ...(height !== undefined ? { height } : {}),
    ...(shouldExpand ? { expand: true } : {}),
    ...(includeHectads
      ? { gridGjson: `data/vcs/hectad-grids/${areaSelectionKey}-hectads.geojson` }
      : { gridLineStyle: 'none' }),
    mapTypesSel: options.mapTypesSel,
    mapTypesKey: options.mapTypesKey,
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
