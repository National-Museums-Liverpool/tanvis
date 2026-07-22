import { clearElement } from '../../utils/dom.js';
import { normalizeErrorMessage } from '../../utils/apiError.js';
import { createVisStatusReporter } from '../../utils/visStatus.js';
import {
  assignElementId,
  clearControlSubscription,
  clearExpandResizeHandlers,
  getAreaBounds,
  calculateHeightFromBounds,
  getBrcAtlasGlobal,
  getEffectiveArea,
  parseOptionalPositiveNumber,
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

    const idPrefix = options.idPrefix || 'tanvis-map';
    assignElementId(element, idPrefix);

    const effectiveArea = getEffectiveArea(config);
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
