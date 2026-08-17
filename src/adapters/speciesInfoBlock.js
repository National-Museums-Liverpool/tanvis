import { clearElement } from '../utils/dom.js';
import { subscribeToControl, getLatestControlEvent } from '../controls/controlBus.js';
import { normalizeAreaContractValue } from '../controls/areaControls.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveApiBase } from '../config/apiBase.js';

const TAXON_STATS_RESOURCE = 'taxon-stats';
const DEFAULT_PAGE_LIMIT = 10000;

export function createSpeciesInfoBlockAdapter() {
  return {
    name: 'species-info-block',
    render(element, config) {
      const effectiveArea = getEffectiveArea(config);
      const renderConfig = {
        ...config,
        area: normalizeAreaContractValue(effectiveArea)
      };

      const taxonIdSourceId = renderConfig.taxonIdSource || '';
      const shouldPreserveTaxonIdSourceSubscription = Boolean(
        element.__tanvisTaxonIdSourceCleanup
        && element.__tanvisTaxonIdSourceId === taxonIdSourceId
      );
      const shouldPreserveControlSubscription = Boolean(
        element.__tanvisControlCleanup
        && element.__tanvisControlId === renderConfig.control
      );

      if (!shouldPreserveTaxonIdSourceSubscription) {
        clearTaxonIdSourceSubscription(element);
      }
      if (!shouldPreserveControlSubscription) {
        clearControlSubscription(element);
      }

      if (renderConfig.control && !shouldPreserveControlSubscription) {
        const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event || event.type !== 'area-change') {
            return;
          }

          const nextArea = normalizeAreaContractValue(
            event.area === undefined || event.area === null ? renderConfig.area : event.area
          );
          const currentArea = normalizeAreaContractValue(element.dataset.visArea);
          if (nextArea === currentArea) {
            return;
          }

          element.dataset.visArea = normalizeAreaDatasetValue(nextArea);
          createSpeciesInfoBlockAdapter().render(element, {
            ...renderConfig,
            area: nextArea,
            taxonId: element.dataset.visTaxonid || renderConfig.taxonId
          });
        });

        element.__tanvisControlCleanup = () => {
          controlBusCleanup?.();
        };
        element.__tanvisControlId = renderConfig.control;
      }

      if (renderConfig.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
        element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(taxonIdSourceId, (speciesId) => {
          if (!speciesId || speciesId === element.dataset.visTaxonid) {
            return;
          }

          element.dataset.visTaxonid = speciesId;
          createSpeciesInfoBlockAdapter().render(element, {
            ...renderConfig,
            taxonId: speciesId
          });
        });
        element.__tanvisTaxonIdSourceId = taxonIdSourceId;
      }

      const status = createVisStatusReporter(element);
      const taxonIdentifier = resolveTaxonIdentifier(element, renderConfig);
      const content = ensureContentStructure(element);

      element.dataset.visArea = normalizeAreaDatasetValue(renderConfig.area);

      if (!taxonIdentifier) {
        status.clear();
        renderSpeciesInfoText(content, [], renderConfig.area);
        return;
      }

      const loadId = (element.__tanvisSpeciesInfoBlockLoadId || 0) + 1;
      element.__tanvisSpeciesInfoBlockLoadId = loadId;
      element.dataset.visTaxonid = taxonIdentifier;

      fetchTaxonStats({
        apiBase: resolveApiBase(),
        taxonIdentifier,
        area: renderConfig.area
      })
        .then((stats) => {
          if (element.__tanvisSpeciesInfoBlockLoadId !== loadId) {
            return;
          }

          renderSpeciesInfoText(content, stats, renderConfig.area);
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisSpeciesInfoBlockLoadId !== loadId) {
            return;
          }

          status.showError(normalizeErrorMessage(error, 'Failed to load taxon stats'));
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

function normalizeAreaDatasetValue(area) {
  if (area === undefined || area === null) {
    return '';
  }

  return String(area);
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

function clearControlSubscription(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
  delete element.__tanvisControlId;
}

function getEffectiveArea(config) {
  if (!config.control || typeof document === 'undefined') {
    return normalizeAreaContractValue(config.area);
  }

  const controlElement = document.getElementById(config.control);
  const controlAreaValue = controlElement?.dataset?.visArea;
  const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
  if (
    controlElement
    && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea')
    && normalizedControlAreaValue !== undefined
    && normalizedControlAreaValue !== null
    && normalizedControlAreaValue !== ''
  ) {
    return normalizedControlAreaValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
    return normalizeAreaContractValue(latestEvent.area);
  }

  return normalizeAreaContractValue(config.area);
}

async function fetchTaxonStats({ apiBase, taxonIdentifier, area }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);

  if (area) {
    pageUrl.searchParams.set('higher_geography_identifier[eq]', String(area));
  }

  pageUrl.searchParams.set('include', 'taxon');
  pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));

  const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-stats');
  return getRecords(payload);
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

function getRecords(payload) {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return [payload.data];
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  return [];
}

function ensureContentStructure(element) {
  if (element.__tanvisSpeciesInfoBlockContent?.isConnected) {
    return element.__tanvisSpeciesInfoBlockContent;
  }

  clearElement(element);
  const doc = element?.ownerDocument || document;
  const content = doc.createElement('table');
  content.dataset.tanvisSpeciesInfoBlock = 'content';
  const body = doc.createElement('tbody');

  const conservationValueCell = appendInfoRow(doc, body, 'Status');
  const occurrencesValueCell = appendInfoRow(doc, body, 'Occurrences');
  const gridSquaresValueCell = appendInfoRow(doc, body, 'Grid squares');

  content.appendChild(body);
  element.appendChild(content);

  content.__tanvisSpeciesInfoBlockNodes = {
    conservationValueCell,
    occurrencesValueCell,
    gridSquaresValueCell
  };

  element.__tanvisSpeciesInfoBlockContent = content;
  return content;
}

function renderSpeciesInfoText(content, statsRows, area) {
  const nodes = content.__tanvisSpeciesInfoBlockNodes;
  const rows = Array.isArray(statsRows) ? statsRows : [];
  const sortedRows = sortStatsRowsForDisplay(rows, area);
  const firstRow = sortedRows[0] || {};

  renderCountCell(content, nodes.occurrencesValueCell, sortedRows, 'occurrences_count', area);
  renderCountCell(content, nodes.gridSquaresValueCell, sortedRows, 'grid_square_count', area);
  const conservationStatus = toDisplayStatus(firstRow?.taxon__conservation_status);

  renderItalicCell(nodes.conservationValueCell, content, conservationStatus);
}

function appendInfoRow(doc, body, labelText) {
  const row = doc.createElement('tr');
  const labelCell = doc.createElement('td');
  const valueCell = doc.createElement('td');

  labelCell.textContent = `${labelText}:`;
  labelCell.style.textAlign = 'right';

  row.appendChild(labelCell);
  row.appendChild(valueCell);
  body.appendChild(row);

  return valueCell;
}

function toDisplayNumber(value) {
  if (value === undefined || value === null || value === '') {
    return '0';
  }
  return String(value);
}

function renderCountCell(content, cell, rows, key, area) {
  clearElement(cell);
  const doc = content?.ownerDocument || document;

  const orderedRows = sortStatsRowsForDisplay(rows, area);
  if (orderedRows.length === 0) {
    appendCountEntry(cell, doc, '0', area ? formatVcLabel(area) : formatVcLabel(undefined));
    return;
  }

  orderedRows.forEach((row, index) => {
    if (index > 0) {
      cell.appendChild(doc.createTextNode(', '));
    }

    const count = toDisplayNumber(row?.[key]);
    const vcLabel = formatVcLabel(resolveRowVcValue(row));
    appendCountEntry(cell, doc, count, area ? formatVcLabel(area) : vcLabel);
  });
}

function appendCountEntry(cell, doc, count, label) {
  const strong = doc.createElement('strong');
  strong.textContent = String(count);
  cell.appendChild(strong);
  cell.appendChild(doc.createTextNode(` (${label})`));
}

function renderItalicCell(cell, content, value) {
  clearElement(cell);
  const doc = content?.ownerDocument || document;
  const emphasis = doc.createElement('em');
  emphasis.textContent = value;
  cell.appendChild(emphasis);
}

function sortStatsRowsForDisplay(rows, area) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  if (area) {
    return rows;
  }

  const preferredOrder = new Map([
    ['all', 0],
    ['vc58', 1],
    ['vc59', 2],
    ['vc60', 3]
  ]);

  return [...rows].sort((left, right) => {
    const leftKey = getRowSortKey(left);
    const rightKey = getRowSortKey(right);
    const leftOrder = preferredOrder.has(leftKey) ? preferredOrder.get(leftKey) : Number.POSITIVE_INFINITY;
    const rightOrder = preferredOrder.has(rightKey) ? preferredOrder.get(rightKey) : Number.POSITIVE_INFINITY;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return 0;
  });
}

function getRowSortKey(row) {
  const vcValue = resolveRowVcValue(row);
  if (vcValue === undefined || vcValue === null || vcValue === '' || vcValue === 'null') {
    return 'all';
  }

  return `vc${String(vcValue).trim()}`.toLowerCase();
}

function formatVcLabel(vcValue) {
  if (vcValue === undefined || vcValue === null || vcValue === '' || vcValue === 'null') {
    return 'all VCs';
  }

  const normalized = String(vcValue).trim();
  if (/^vc\d+$/i.test(normalized)) {
    return normalized.toLowerCase();
  }

  return `vc${normalized}`;
}

function resolveRowVcValue(row) {
  if (!row || typeof row !== 'object') {
    return undefined;
  }

  if (row.geographic_region__higher_geography !== undefined) {
    return row.geographic_region__higher_geography;
  }

  if (row.geographic_region_identifier !== undefined) {
    return row.geographic_region_identifier;
  }

  if (row.higher_geography_identifier !== undefined) {
    return row.higher_geography_identifier;
  }

  return undefined;
}

function toDisplayStatus(value) {
  if (value === undefined || value === null || value === '') {
    return 'None specified';
  }
  switch(value) {
    case 'DD':
      return 'Data Deficient';
    case 'LC':
      return 'Least Concern';
    case 'NT':
      return 'Near Threatened';
    case 'VU':
      return 'Vulnerable';
    case 'EN':
      return 'Endangered';
    case 'CR':
      return 'Critically Endangered';
    case 'RE':
      return 'Regionally Extinct';
    case 'EW':
      return 'Extinct in the Wild';
    case 'EX':
      return 'Extinct';
    case 'NE':
      return 'Not Evaluated';
    case 'NR':
      return 'Nationally Rare';
    case 'NS':
      return 'Nationally Scarce';
    default:
      return String(value);
  }
}