import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { normalizeErrorMessage } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { renderLeafletAtlasMap } from './map/leafletBackend.js';
import { renderStaticAtlasMap } from './map/staticBackend.js';

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
  const mapType = String(config.mapType || 'static').toLowerCase();

  if (mapType === 'leaflet') {
    return renderLeafletAtlasMap(element, config, {
      idPrefix: 'tanvis-species-map',
      errorMessage: 'Failed to render species map'
    });
  }

  return renderStaticAtlasMap(element, config, {
    idPrefix: 'tanvis-species-map',
    errorMessage: 'Failed to render species map'
  });
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
