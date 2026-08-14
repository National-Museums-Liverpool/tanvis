import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveApiBase } from '../config/apiBase.js';

const TAXA_RESOURCE = 'taxa';
const DEFAULT_PLACEHOLDER_TEXT = 'No species remarks available.';

export function createSpeciesRemarksBlockAdapter() {
  return {
    name: 'species-remarks-block',
    render(element, config) {
      const taxonIdSourceId = config.taxonIdSource || '';
      const shouldPreserveTaxonIdSourceSubscription = Boolean(
        element.__tanvisTaxonIdSourceCleanup
        && element.__tanvisTaxonIdSourceId === taxonIdSourceId
      );

      if (!shouldPreserveTaxonIdSourceSubscription) {
        clearTaxonIdSourceSubscription(element);
      }

      if (config.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
        element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(taxonIdSourceId, (speciesId) => {
          if (!speciesId || speciesId === element.dataset.visTaxonid) {
            return;
          }

          element.dataset.visTaxonid = speciesId;
          createSpeciesRemarksBlockAdapter().render(element, {
            ...config,
            taxonId: speciesId
          });
        });
        element.__tanvisTaxonIdSourceId = taxonIdSourceId;
      }

      const status = createVisStatusReporter(element);
      const taxonIdentifier = resolveTaxonIdentifier(element, config);
      const content = ensureContentStructure(element);

      if (!taxonIdentifier) {
        status.clear();
        renderPlaceholder(content);
        return;
      }

      const loadId = (element.__tanvisSpeciesRemarksBlockLoadId || 0) + 1;
      element.__tanvisSpeciesRemarksBlockLoadId = loadId;
      element.dataset.visTaxonid = taxonIdentifier;

      fetchTaxon({
        apiBase: resolveApiBase(),
        taxonIdentifier
      })
        .then((taxon) => {
          if (element.__tanvisSpeciesRemarksBlockLoadId !== loadId) {
            return;
          }

          renderSpeciesRemarksBlockContent(content, taxon);
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisSpeciesRemarksBlockLoadId !== loadId) {
            return;
          }

          status.showError(normalizeErrorMessage(error, 'Failed to load taxon details'));
        });
    }
  };
}

function resolveTaxonIdentifier(element, config) {
  const fromDataset = normalizeValue(element?.dataset?.visTaxonid);
  if (fromDataset) {
    return fromDataset;
  }

  return normalizeValue(config?.taxonId);
}

function normalizeValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function subscribeToTaxonIdSource(taxonIdSourceId, onSpeciesSelected) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
  if (!taxonIdSourceElement) {
    return undefined;
  }

  const onTaxonIdentified = (event) => {
    const speciesId = event?.detail?.speciesId;
    if (typeof speciesId !== 'string' || !speciesId.trim()) {
      return;
    }

    onSpeciesSelected(speciesId.trim());
  };

  taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
  return () => {
    taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
  };
}

function clearTaxonIdSourceSubscription(element) {
  const cleanup = element?.__tanvisTaxonIdSourceCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisTaxonIdSourceCleanup;
  delete element.__tanvisTaxonIdSourceId;
}

async function fetchTaxon({ apiBase, taxonIdentifier }) {
  const taxonUrl = resolveTaxonUrl(apiBase, taxonIdentifier);
  const payload = await fetchJson(taxonUrl.toString(), 'Failed to load taxon details');
  return getTaxonRecord(payload);
}

function resolveTaxonUrl(apiBase, taxonIdentifier) {
  const baseUrl = new URL(apiBase, window.location.origin);
  const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${pathname}${TAXA_RESOURCE}/${encodeURIComponent(taxonIdentifier)}`;
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

function getTaxonRecord(payload) {
  if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data[0] || {};
  }

  if (Array.isArray(payload)) {
    return payload[0] || {};
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  return {};
}

function ensureContentStructure(element) {
  if (element.__tanvisSpeciesRemarksBlockContent?.isConnected) {
    return element.__tanvisSpeciesRemarksBlockContent;
  }

  clearElement(element);

  const doc = element?.ownerDocument || document;
  const content = doc.createElement('span');
  content.dataset.tanvisSpeciesRemarksBlock = 'content';
  element.appendChild(content);

  element.__tanvisSpeciesRemarksBlockContent = content;
  return content;
}

function renderPlaceholder(content) {
  content.textContent = DEFAULT_PLACEHOLDER_TEXT;
}

function renderSpeciesRemarksBlockContent(content, taxon) {
  const remarks = normalizeValue(taxon?.taxon_remarks);

  if (!remarks) {
    renderPlaceholder(content);
    return;
  }

  content.textContent = remarks;
}