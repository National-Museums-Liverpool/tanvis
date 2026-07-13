import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';
import { publishControlEvent } from './controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

const LABEL_MODE_OPTIONS = [
  { label: 'Scientific', value: 'scientific' },
  { label: 'Vernacular', value: 'vernacular' }
];

export function createTaxonGroupControls({ rootElement, apiBase, selectedValue = '', labelMode = 'scientific', loadToken, body }) {
  const targetBody = body || createControlsPanel({
    label: 'Taxon groups',
    ariaLabel: 'Toggle taxon group controls'
  }).body;

  if (body) {
    body.dataset.tanvisControls = 'taxon-groups';
  }

  const state = {
    groups: [],
    selectedValue,
    labelMode
  };

  syncRootDataset();

  const selectField = document.createElement('label');
  selectField.className = 'tanvis-controls-field tanvis-controls-gap-top';

  const select = document.createElement('select');
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

  const labelModeField = document.createElement('div');
  labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
  targetBody.appendChild(labelModeField);
  const status = createVisStatusReporter(targetBody);
  status.showInfo('Loading taxon groups...');

  const radioGroup = createRadioGroup({
    name: `${rootElement?.id || 'tanvis'}-taxon-group-label-mode`,
    selectedValue: state.labelMode,
    items: LABEL_MODE_OPTIONS,
    onChange: (value) => {
      state.labelMode = value;
      syncRootDataset();
      renderOptions();
    }
  });

  labelModeField.appendChild(radioGroup);
  renderOptions();

  fetchTaxonGroups(apiBase)
    .then((groups) => {
      if (!isCurrentLoad()) {
        return;
      }

      state.groups = groups;
      status.clear();
      select.disabled = false;
      renderOptions();
    })
    .catch((error) => {
      if (!isCurrentLoad()) {
        return;
      }

      state.groups = [];
      state.selectedValue = '';
      status.showError(`${normalizeErrorMessage(error, 'Unable to load taxon groups')}. Showing All groups only.`);
      select.disabled = false;
      renderOptions();
    });

  return targetBody;

  function renderOptions() {
    const currentSelectedValue = state.selectedValue;
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All groups';
    select.appendChild(allOption);

    for (const group of state.groups) {
      const option = document.createElement('option');
      option.value = group.external_key;
      option.textContent = state.labelMode === 'vernacular' ? (group.friendly || group.title || group.external_key) : (group.title || group.friendly || group.external_key);
      select.appendChild(option);
    }

    if (!state.groups.some((group) => group.external_key === currentSelectedValue)) {
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