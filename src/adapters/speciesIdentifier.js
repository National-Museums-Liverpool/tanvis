import { clearElement } from '../utils/dom.js';

export function createSpeciesIdentifierAdapter() {
  return {
    name: 'species-identifier',
    render(element, config) {
      clearElement(element);

      const loadToken = (element.__tanvisSpeciesIdentifierLoadToken || 0) + 1;
      element.__tanvisSpeciesIdentifierLoadToken = loadToken;

      const cleanup = element.__tanvisSpeciesIdentifierLoadCleanup;
      if (typeof cleanup === 'function') {
        cleanup();
      }
      delete element.__tanvisSpeciesIdentifierLoadCleanup;

      const speciesId = resolveSelectedSpeciesId(config);
      if (!speciesId) {
        return;
      }

      const emitSelection = () => {
        if (element.__tanvisSpeciesIdentifierLoadToken !== loadToken) {
          return;
        }

        const event = new CustomEvent('taxon-identified', {
          detail: { speciesId },
          bubbles: true,
          cancelable: true
        });

        element.dispatchEvent(event);
      };

      if (document.readyState === 'complete') {
        setTimeout(emitSelection, 0);
        return;
      }

      const onWindowLoad = () => {
        emitSelection();
      };

      window.addEventListener('load', onWindowLoad, { once: true });
      element.__tanvisSpeciesIdentifierLoadCleanup = () => {
        window.removeEventListener('load', onWindowLoad);
      };
    }
  };
}

function resolveSelectedSpeciesId(config) {
  const queryTaxonId = getTaxonIdFromQuery();
  if (queryTaxonId !== undefined) {
    return normalizeSpeciesId(queryTaxonId);
  }

  return normalizeSpeciesId(config?.taxonId);
}

function getTaxonIdFromQuery() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search || '');
  if (!params.has('taxon-id')) {
    return undefined;
  }

  return params.get('taxon-id');
}

function normalizeSpeciesId(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}