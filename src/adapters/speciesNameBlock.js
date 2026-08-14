import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveApiBase } from '../config/apiBase.js';

const TAXA_RESOURCE = 'taxa';
const DEFAULT_PLACEHOLDER_TEXT = 'Species name';

export function createSpeciesNameBlockAdapter() {
  return {
    name: 'species-name-block',
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
          createSpeciesNameBlockAdapter().render(element, {
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

      const loadId = (element.__tanvisSpeciesNameBlockLoadId || 0) + 1;
      element.__tanvisSpeciesNameBlockLoadId = loadId;
      element.dataset.visTaxonid = taxonIdentifier;

      fetchTaxon({
        apiBase: resolveApiBase(),
        taxonIdentifier
      })
        .then((taxon) => {
          if (element.__tanvisSpeciesNameBlockLoadId !== loadId) {
            return;
          }

          renderSpeciesNameBlockContent(content, taxon, config);
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisSpeciesNameBlockLoadId !== loadId) {
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
  if (element.__tanvisSpeciesNameBlockContent?.isConnected) {
    return element.__tanvisSpeciesNameBlockContent;
  }

  clearElement(element);

  const doc = element?.ownerDocument || document;
  const content = doc.createElement('span');
  content.dataset.tanvisSpeciesNameBlock = 'content';

  const placeholder = doc.createElement('span');
  placeholder.dataset.tanvisSpeciesNameBlock = 'placeholder';

  const primary = doc.createElement('span');
  primary.dataset.tanvisSpeciesNameBlock = 'primary';
  const primaryText = doc.createElement('span');
  const primaryScientific = doc.createElement('em');
  const primaryAuthority = doc.createTextNode('');
  primary.append(primaryText, primaryScientific, primaryAuthority);

  const secondaryWrapper = doc.createElement('span');
  secondaryWrapper.dataset.tanvisSpeciesNameBlock = 'secondary';
  const secondaryText = doc.createElement('span');
  const secondaryScientific = doc.createElement('em');
  const secondaryAuthority = doc.createTextNode('');
  const secondaryOpen = doc.createTextNode(' (');
  const secondaryClose = doc.createTextNode(')');
  secondaryWrapper.append(secondaryOpen, secondaryText, secondaryScientific, secondaryAuthority, secondaryClose);

  content.append(placeholder, primary, secondaryWrapper);
  element.appendChild(content);

  content.__tanvisSpeciesNameBlockNodes = {
    placeholder,
    primary,
    primaryText,
    primaryScientific,
    primaryAuthority,
    secondaryWrapper,
    secondaryOpen,
    secondaryText,
    secondaryScientific,
    secondaryAuthority,
    secondaryClose
  };

  element.__tanvisSpeciesNameBlockContent = content;
  return content;
}

function renderPlaceholder(content) {
  const nodes = content.__tanvisSpeciesNameBlockNodes;
  resetNameContent(nodes);
  nodes.placeholder.textContent = DEFAULT_PLACEHOLDER_TEXT;
  nodes.placeholder.hidden = false;
  nodes.primary.hidden = true;
  nodes.secondaryWrapper.hidden = true;
}

function renderSpeciesNameBlockContent(content, taxon, config) {
  const nodes = content.__tanvisSpeciesNameBlockNodes;
  resetNameContent(nodes);

  const hasPrimaryName = setNameContent(nodes.primaryText, nodes.primaryScientific, nodes.primaryAuthority, taxon, config?.primaryName, config?.authority === true);
  const secondaryNameType = normalizeValue(config?.secondaryName);

  nodes.placeholder.hidden = true;
  nodes.primary.hidden = !hasPrimaryName;

  let hasSecondaryName = false;
  if (secondaryNameType && secondaryNameType !== 'none') {
    hasSecondaryName = setNameContent(nodes.secondaryText, nodes.secondaryScientific, nodes.secondaryAuthority, taxon, secondaryNameType, config?.authority === true);

    if (hasSecondaryName && !hasPrimaryName) {
      nodes.secondaryOpen.textContent = '(';
    } else {
      nodes.secondaryOpen.textContent = ' (';
    }

    if (hasSecondaryName) {
      nodes.secondaryClose.textContent = ')';
    }
  }

  nodes.secondaryWrapper.hidden = !hasSecondaryName;

  if (!hasPrimaryName && !hasSecondaryName) {
    renderPlaceholder(content);
  }
}

function resetNameContent(nodes) {
  nodes.placeholder.textContent = '';
  nodes.primaryText.textContent = '';
  nodes.primaryScientific.textContent = '';
  nodes.primaryAuthority.textContent = '';
  nodes.secondaryText.textContent = '';
  nodes.secondaryScientific.textContent = '';
  nodes.secondaryAuthority.textContent = '';
  nodes.placeholder.hidden = true;
  nodes.secondaryOpen.textContent = '';
  nodes.secondaryClose.textContent = '';
}

function setNameContent(textElement, scientificElement, authorityTextNode, taxon, nameType, includeAuthority) {
  if (nameType === 'scientific') {
    const scientificName = normalizeValue(taxon?.scientific_name);
    if (!scientificName) {
      return false;
    }

    textElement.hidden = true;
    scientificElement.hidden = false;
    scientificElement.textContent = scientificName;

    if (includeAuthority) {
      const authorship = normalizeValue(taxon?.scientific_name_authorship);
      if (authorship) {
        authorityTextNode.textContent = ` ${authorship}`;
      }
    }

    return true;
  }

  if (nameType === 'vernacular') {
    const vernacularName = normalizeValue(taxon?.vernacular_name);
    if (!vernacularName) {
      return false;
    }

    scientificElement.hidden = true;
    textElement.hidden = false;
    textElement.textContent = vernacularName;
    return true;
  }

  return false;
}