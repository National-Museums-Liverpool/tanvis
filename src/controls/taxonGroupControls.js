import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';
import { publishControlEvent } from './controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../../src/utils/apiRequest.js';
import { parseTaxonGroupDisplayNames } from '../utils/taxonGroupLabels.js';

const LABEL_MODE_OPTIONS = [
  { label: 'Scientific', value: 'scientific' },
  { label: 'Vernacular', value: 'vernacular' }
];

export function createTaxonGroupControls({ rootElement, apiBase, selectedValue = '', labelMode = 'scientific', loadToken, body, showSelector = true, showLabelMode = true }) {
  const initialGroupIdFromDataset = rootElement?.dataset?.visGroupid || '';
  const initialSelectedValue = selectedValue || initialGroupIdFromDataset || rootElement?.dataset?.visTaxonGroup || '';
  const initialLabelMode = rootElement?.dataset?.visTaxonGroupLabelMode || rootElement?.dataset?.visLanguage || labelMode || 'scientific';

  const targetBody = body || createControlsPanel({
    label: 'Taxon groups',
    ariaLabel: 'Toggle taxon group controls'
  }).body;

  if (body) {
    body.dataset.tanvisControls = 'taxon-groups';
  }

  const state = {
    groups: [],
    selectedValue: initialSelectedValue,
    labelMode: initialLabelMode
  };

  syncRootDataset();

  let selectField = null;
  let select = null;

  if (showSelector) {
    selectField = document.createElement('label');
    selectField.className = 'tanvis-controls-field tanvis-controls-gap-top';

    select = document.createElement('select');
    select.className = 'tanvis-controls-select';
    select.disabled = true;
    select.value = state.selectedValue;

    select.addEventListener('change', () => {
      state.selectedValue = select.value;
      syncRootDataset();
      publishTaxonGroupChange();
    });

    selectField.appendChild(select);
    targetBody.appendChild(selectField);
  }

  const status = createVisStatusReporter(targetBody);
  status.showInfo('Loading taxon groups...');

  if (showLabelMode) {
    const labelModeField = document.createElement('div');
    labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
    targetBody.appendChild(labelModeField);

    const radioGroup = createRadioGroup({
      name: `${rootElement?.id || 'tanvis'}-taxon-group-label-mode`,
      selectedValue: state.labelMode,
      items: LABEL_MODE_OPTIONS,
      onChange: (value) => {
        state.labelMode = value;
        syncRootDataset();
        renderOptions();
        publishLanguageChange();
      }
    });

    labelModeField.appendChild(radioGroup);
  }

  renderOptions();

  fetchTaxonGroups(apiBase)
    .then((groups) => {
      if (!isCurrentLoad()) {
        return;
      }

      state.groups = groups;
      status.clear();
      if (select) {
        select.disabled = false;
      }
      renderOptions();
    })
    .catch((error) => {
      if (!isCurrentLoad()) {
        return;
      }

      state.groups = [];
      state.selectedValue = '';
      status.showError(`${normalizeErrorMessage(error, 'Unable to load taxon groups')}. Showing All groups only.`);
      if (select) {
        select.disabled = false;
      }
      renderOptions();
    });

  return targetBody;

  function renderOptions() {
    if (!select) {
      syncRootDataset();
      return;
    }

    const currentSelectedValue = state.selectedValue;
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All groups';
    select.appendChild(allOption);

    for (const group of state.groups) {
      const option = document.createElement('option');
      option.value = group.external_key;
      const parsedNames = parseTaxonGroupDisplayNames(group);
      const displayName = state.labelMode === 'vernacular'
        ? (parsedNames.vernacularName || parsedNames.scientificName || group.external_key)
        : (parsedNames.scientificName || parsedNames.vernacularName || group.external_key);
      option.textContent = displayName;
      select.appendChild(option);
    }

    if (state.groups.length > 0 && !state.groups.some((group) => group.external_key === currentSelectedValue)) {
      state.selectedValue = '';
      select.value = '';
    } else {
      select.value = currentSelectedValue;
    }

    syncRootDataset();
  }

  function syncRootDataset() {
    if (!rootElement?.dataset) {
      return;
    }

    rootElement.dataset.visTaxonGroup = state.selectedValue;
    rootElement.dataset.visTaxonGroupLabelMode = state.labelMode;
    rootElement.dataset.visLanguage = state.labelMode;
    rootElement.dataset.visTaxonGroupNameMode = state.labelMode;
  }

  function publishTaxonGroupChange() {
    if (!rootElement?.id) {
      return;
    }

    publishControlEvent(rootElement.id, {
      type: 'taxon-group-change',
      taxonGroup: state.selectedValue
    });
  }

  function publishLanguageChange() {
    if (!rootElement?.id) {
      return;
    }

    publishControlEvent(rootElement.id, {
      type: 'language-change',
      labelMode: state.labelMode
    });
  }

  function isCurrentLoad() {
    if (!rootElement) {
      return true;
    }

    return rootElement.__tanvisControlBlockLoadToken === loadToken;
  }
}

async function fetchTaxonGroups(apiBase) {
  const resourceUrl = resolveResourceUrl(apiBase, 'taxon-groups');
  const payload = await fetchJson(resourceUrl.toString(), 'Failed to load taxon groups');
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