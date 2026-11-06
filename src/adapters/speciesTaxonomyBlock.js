import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveApiBase } from '../config/apiBase.js';

const TAXA_RESOURCE = 'taxa';
const DEFAULT_PLACEHOLDER_TEXT = 'No taxon selected';

export function createSpeciesTaxonomyBlockAdapter() {
  return {
    name: 'species-taxonomy-block',
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
          createSpeciesTaxonomyBlockAdapter().render(element, {
            ...config,
            taxonId: speciesId
          });
        });
        element.__tanvisTaxonIdSourceId = taxonIdSourceId;
      }

      const status = createVisStatusReporter(element);
      const taxonIdentifier = resolveTaxonIdentifier(element, config);
      const content = ensureContentStructure(element);
      const loadId = (element.__tanvisSpeciesTaxonomyBlockLoadId || 0) + 1;
      element.__tanvisSpeciesTaxonomyBlockLoadId = loadId;

      if (!taxonIdentifier) {
        status.clear();
        content.textContent = DEFAULT_PLACEHOLDER_TEXT;
        return;
      }

      element.dataset.visTaxonid = taxonIdentifier;

      fetchTaxonomy({
        apiBase: resolveApiBase(),
        taxonIdentifier,
        preferCommon: config.preferCommon === true
      })
        .then((taxonomy) => {
          if (element.__tanvisSpeciesTaxonomyBlockLoadId !== loadId) {
            return;
          }

          content.textContent = taxonomy || 'No taxonomy available.';
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisSpeciesTaxonomyBlockLoadId !== loadId) {
            return;
          }

          status.showError(normalizeErrorMessage(error, 'Failed to load taxon taxonomy'));
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
  return typeof value === 'string' ? value.trim() : '';
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
    if (typeof speciesId === 'string' && speciesId.trim()) {
      onSpeciesSelected(speciesId.trim());
    }
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

async function fetchTaxonomy({ apiBase, taxonIdentifier, preferCommon }) {
  const visited = new Set();
  const names = [];
  let currentIdentifier = taxonIdentifier;

  while (currentIdentifier && !visited.has(currentIdentifier)) {
    visited.add(currentIdentifier);
    const taxon = await fetchTaxon({ apiBase, taxonIdentifier: currentIdentifier });
    const scientificName = normalizeValue(taxon?.scientific_name);
    const vernacularName = normalizeValue(taxon?.vernacular_name);
    const name = preferCommon
      ? vernacularName || scientificName
      : scientificName || vernacularName;
    if (name) {
      names.push(name);
    }
    currentIdentifier = normalizeValue(taxon?.parent_taxon__taxon_identifier);
  }

  return names.reverse().join('>');
}

async function fetchTaxon({ apiBase, taxonIdentifier }) {
  const taxonUrl = resolveTaxonUrl(apiBase, taxonIdentifier);
  taxonUrl.searchParams.set('include', 'parent-taxon');
  const payload = await fetchJson(taxonUrl.toString(), 'Failed to load taxon taxonomy');
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

  return payload && typeof payload === 'object' ? payload : {};
}

function ensureContentStructure(element) {
  if (element.__tanvisSpeciesTaxonomyBlockContent?.isConnected) {
    return element.__tanvisSpeciesTaxonomyBlockContent;
  }

  clearElement(element);

  const doc = element?.ownerDocument || document;
  const content = doc.createElement('span');
  content.dataset.tanvisSpeciesTaxonomyBlock = 'content';
  element.appendChild(content);

  element.__tanvisSpeciesTaxonomyBlockContent = content;
  return content;
}
