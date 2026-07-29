import { clearElement } from '../utils/dom.js';
import { createControlsPanel } from '../controls/panel.js';
import { createAreaControls } from '../controls/areaControls.js';
import { createTaxonGroupControls } from '../controls/taxonGroupControls.js';
import { publishControlEvent } from '../controls/controlBus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { logApiRequest } from '../utils/apiRequest.js';

const SPECIES_SEARCH_DEBOUNCE_MS = 300;
const SPECIES_SEARCH_LIMIT = 10;

export function createControlBlockAdapter() {
  return {
    name: 'control-block',
    render(element, config) {
      const loadToken = (element.__tanvisControlBlockLoadToken || 0) + 1;
      element.__tanvisControlBlockLoadToken = loadToken;

      clearElement(element);

      const { panel, body } = createControlsPanel({
        label: 'Data options',
        ariaLabel: 'Toggle data controls'
      });
      panel.dataset.tanvisControls = 'data-options';
      element.appendChild(panel);

      createAreaControls({
        element,
        selectedValue: config.area,
        body,
        onAreaChange: (value) => {
          publishControlEvent(element.id, {
            type: 'area-change',
            area: value
          });
        }
      });

      createTaxonGroupControls({
        rootElement: element,
        apiBase: resolveApiBase(),
        body,
        loadToken
      });

      createSpeciesSelectorControl({
        rootElement: element,
        apiBase: resolveApiBase(),
        body,
        loadToken
      });

      publishControlEvent(element.id, {
        type: 'area-change',
        area: config.area
      });
    }
  };
}

function createSpeciesSelectorControl({ rootElement, apiBase, body, loadToken }) {
  if (!body) {
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'tanvis-controls-field tanvis-controls-gap-top';
  panel.dataset.tanvisControls = 'species-selector';

  const searchMode = rootElement?.dataset?.visTaxonGroupLabelMode === 'vernacular' ? 'vernacular' : 'scientific';
  const label = document.createElement('label');
  label.className = 'tanvis-controls-label';

  const input = document.createElement('input');
  input.className = 'tanvis-controls-text-input tanvis-species-search-input';
  input.type = 'text';
  input.placeholder = getSearchPlaceholder(searchMode);
  input.autocomplete = 'off';

  const results = document.createElement('div');
  results.className = 'tanvis-species-search-results';

  const status = createVisStatusReporter(panel);

  const searchState = {
    query: '',
    searchMode,
    activeRequestToken: 0
  };

  label.appendChild(input);
  panel.appendChild(label);
  panel.appendChild(results);
  body.appendChild(panel);

  let debounceTimer = null;

  input.addEventListener('input', () => {
    const nextQuery = input.value.trim();
    searchState.query = nextQuery;
    status.clear();

    if (!nextQuery) {
      clearResults();
      searchState.activeRequestToken += 1;
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      queueSearch(nextQuery);
    }, SPECIES_SEARCH_DEBOUNCE_MS);
  });

  const syncSearchModeFromRoot = () => {
    const nextMode = rootElement?.dataset?.visTaxonGroupLabelMode === 'vernacular' ? 'vernacular' : 'scientific';
    if (searchState.searchMode !== nextMode) {
      searchState.searchMode = nextMode;
      input.placeholder = getSearchPlaceholder(nextMode);
      if (searchState.query.trim()) {
        queueSearch(searchState.query);
      }
    }
  };

  if (rootElement) {
    rootElement.addEventListener('change', syncSearchModeFromRoot);
  }

  function queueSearch(query) {
    const currentRequestToken = ++searchState.activeRequestToken;
    const searchField = searchState.searchMode === 'vernacular' ? 'vernacular_name' : 'scientific_name';

    fetchSuggestedTaxa({
      apiBase,
      query,
      searchField
    }).then((taxa) => {
      if (searchState.activeRequestToken !== currentRequestToken) {
        return;
      }

      renderResults(taxa);
    }).catch((error) => {
      if (searchState.activeRequestToken !== currentRequestToken) {
        return;
      }

      status.showError(normalizeErrorMessage(error, 'Unable to search species'));
      clearResults();
    });
  }

  function renderResults(taxa) {
    clearResults();

    if (!Array.isArray(taxa) || taxa.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'tanvis-species-search-empty';
      emptyState.textContent = '';
      results.appendChild(emptyState);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'tanvis-species-search-list';

    taxa.slice(0, SPECIES_SEARCH_LIMIT).forEach((taxon) => {
      const item = document.createElement('li');
      item.className = 'tanvis-species-search-item';

      const option = document.createElement('div');
      option.className = 'tanvis-species-search-result';
      option.innerHTML = formatTaxonLabel(taxon);
      option.tabIndex = 0;
      option.role = 'button';
      option.addEventListener('click', () => {
        const speciesId = taxon.taxon_identifier || taxon.identifier || taxon.id || '';
        if (!speciesId) {
          return;
        }

        input.value = '';
        searchState.query = '';
        clearResults();
        searchState.activeRequestToken += 1;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        status.clear();

        const event = new CustomEvent('species-row-selected', {
          detail: { speciesId },
          bubbles: true,
          cancelable: true
        });

        rootElement?.dispatchEvent?.(event);
      });
      option.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          option.click();
        }
      });

      item.appendChild(option);
      list.appendChild(item);
    });

    results.appendChild(list);
  }

  function clearResults() {
    results.innerHTML = '';
  }

  function formatTaxonLabel(taxon) {
    const scientificName = taxon.scientific_name || taxon.scientificName || '';
    const vernacularName = taxon.vernacular_name || taxon.vernacularName || '';
    if (searchState.searchMode === 'vernacular' && vernacularName) {
      return `${vernacularName}${scientificName ? ` <em>(${escapeHtml(scientificName)})</em>` : ''}`;
    }

    if (scientificName) {
      return `<em>${escapeHtml(scientificName)}</em>`;
    }

    return escapeHtml(vernacularName || taxon.taxon_identifier || taxon.identifier || taxon.id || 'Unknown species');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getSearchPlaceholder(mode) {
    return mode === 'vernacular'
      ? 'Type vernacular name...'
      : 'Type scientific name...';
  }

  return panel;
}

async function fetchSuggestedTaxa({ apiBase, query, searchField }) {
  if (!query) {
    return [];
  }

  const resourceUrl = resolveResourceUrl(apiBase, 'taxa');
  const url = new URL(resourceUrl.toString());
  url.searchParams.set(`${searchField}[contains]`, query);
  url.searchParams.set('limit', String(SPECIES_SEARCH_LIMIT));

  const payload = await fetchJson(url.toString(), 'Failed to search taxa');
  return getListData(payload);
}

function resolveResourceUrl(apiBase, resourceName) {
  const baseUrl = new URL(apiBase, window.location.origin);
  const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${pathname}${resourceName}`;
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

function getListData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  return [];
}