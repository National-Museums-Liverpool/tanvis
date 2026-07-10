import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';

const LABEL_MODE_OPTIONS = [
  { label: 'Scientific', value: 'scientific' },
  { label: 'Vernacular', value: 'vernacular' }
];

const FALLBACK_TAXON_GROUPS = [
  { external_key: 'lepidoptera', title: 'Lepidoptera', friendly: 'Butterflies and moths' },
  { external_key: 'hymenoptera', title: 'Hymenoptera', friendly: 'Bees, wasps, ants and sawflies' },
  { external_key: 'diptera', title: 'Diptera', friendly: 'True flies' },
  { external_key: 'coleoptera', title: 'Coleoptera', friendly: 'Beetles' },
  { external_key: 'hemiptera', title: 'Hemiptera', friendly: 'True bugs' },
  { external_key: 'odonata', title: 'Odonata', friendly: 'Dragonflies and damselflies' },
  { external_key: 'orthoptera', title: 'Orthoptera', friendly: 'Grasshoppers and crickets' },
  { external_key: 'araneae', title: 'Araneae', friendly: 'Spiders' },
  { external_key: 'opiliones', title: 'Opiliones', friendly: 'Harvestmen' },
  { external_key: 'acari', title: 'Acari', friendly: 'Ticks and mites' },
  { external_key: 'pseudoscorpiones', title: 'Pseudoscorpiones', friendly: 'Pseudoscorpions' },
  { external_key: 'gastropoda', title: 'Gastropoda', friendly: 'Slugs and snails' },
  { external_key: 'bivalvia', title: 'Bivalvia', friendly: 'Bivalves' },
  { external_key: 'isopoda', title: 'Isopoda', friendly: 'Woodlice' },
  { external_key: 'chilopoda', title: 'Chilopoda', friendly: 'Centipedes' },
  { external_key: 'diplopoda', title: 'Diplopoda', friendly: 'Millipedes' },
  { external_key: 'oligochaeta', title: 'Oligochaeta', friendly: 'Earthworms' },
  { external_key: 'hirudinea', title: 'Hirudinea', friendly: 'Leeches' },
  { external_key: 'cnidaria', title: 'Cnidaria', friendly: 'Sea anemones, corals and jellyfish' },
  { external_key: 'echinodermata', title: 'Echinodermata', friendly: 'Starfish, sea urchins and sea cucumbers' }
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
    groups: FALLBACK_TAXON_GROUPS.slice(),
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
  });

  selectField.appendChild(select);
  targetBody.appendChild(selectField);

  const labelModeField = document.createElement('div');
  labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
  targetBody.appendChild(labelModeField);

  const status = document.createElement('p');
  status.className = 'tanvis-controls-help';
  status.textContent = 'Loading taxon groups...';
  targetBody.appendChild(status);

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

      state.groups = groups.length > 0 ? groups : FALLBACK_TAXON_GROUPS.slice();
      status.hidden = true;
      select.disabled = false;
      renderOptions();
    })
    .catch(() => {
      if (!isCurrentLoad()) {
        return;
      }

      status.textContent = 'Using built-in taxon group list';
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
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || defaultErrorMessage);
  }

  return payload;
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