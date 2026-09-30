import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderRecordsTable } from '../../src/renderers/recordsTable.js';

describe('renderRecordsTable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Tabulator;
    document.querySelectorAll('#linked-map').forEach((node) => node.remove());
  });

  it('filters occurrences by taxon and tetrad after a subscribed tetrad-clicked event', async () => {
    window.Tabulator = function Tabulator(container, options) {
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return { on() {} };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-map';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderRecordsTable(element, {
      type: 'records-table',
      taxonId: 'OLD-TAXON',
      taxonIdSource: 'linked-map'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('tetrad-clicked', {
      detail: {
        taxonId: 'CLICKED-TAXON',
        gridReference: 'SJ58D'
      }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(requestUrl.searchParams.get('taxon_identifier[eq]')).toBe('CLICKED-TAXON');
    expect(requestUrl.searchParams.get('grid_ref_2km[eq]')).toBe('SJ58D');
    expect(element.querySelector('.tanvis-table-header-text').textContent).toBe('0 records in SJ58D');

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'CLICKED-TAXON' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const unfilteredRequestUrl = new URL(String(fetchMock.mock.calls[2][0]));
    expect(unfilteredRequestUrl.searchParams.get('taxon_identifier[eq]')).toBe('CLICKED-TAXON');
    expect(unfilteredRequestUrl.searchParams.has('grid_ref_2km[eq]')).toBe(false);
  });
});