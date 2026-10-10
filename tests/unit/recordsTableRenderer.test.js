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

    const requestedUrls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      requestedUrls.push(parsedUrl);
      return {
        ok: true,
        json: async () => parsedUrl.pathname.includes('/taxa/')
          ? { data: { taxon_rank__rank: 'Species', taxon__scientific_name: 'Test species' } }
          : { data: [] }
      };
    });
    const occurrenceRequests = () => requestedUrls.filter((url) => url.pathname.endsWith('/occurrences'));

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-map';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderRecordsTable(element, {
      type: 'records-table',
      taxonId: 'OLD-TAXON',
      taxonIdSource: 'linked-map'
    });

    await vi.waitFor(() => expect(occurrenceRequests()).toHaveLength(1));

    taxonIdSource.dispatchEvent(new CustomEvent('tetrad-clicked', {
      detail: {
        taxonId: 'CLICKED-TAXON',
        gridReference: 'SJ58D'
      }
    }));

    await vi.waitFor(() => expect(occurrenceRequests()).toHaveLength(2));

    const requestUrl = occurrenceRequests()[1];
    expect(requestUrl.searchParams.get('taxon_identifier[eq]')).toBe('CLICKED-TAXON');
    expect(requestUrl.searchParams.get('grid_ref_2km[eq]')).toBe('SJ58D');
    expect(element.querySelector('.tanvis-table-header-text').textContent).toBe('0 records in SJ58D');

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'CLICKED-TAXON' }
    }));

    await vi.waitFor(() => expect(occurrenceRequests()).toHaveLength(3));

    const unfilteredRequestUrl = occurrenceRequests()[2];
    expect(unfilteredRequestUrl.searchParams.get('taxon_identifier[eq]')).toBe('CLICKED-TAXON');
    expect(unfilteredRequestUrl.searchParams.has('grid_ref_2km[eq]')).toBe(false);
  });

  it('filters higher taxa by scientific name and reuses taxon info across pages', async () => {
    const pageResults = [];
    window.Tabulator = function Tabulator(container, options) {
      void Promise.all([
        options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 }),
        options.ajaxRequestFunc('custom_handler', {}, { page: 2, size: 10 })
      ]).then((results) => pageResults.push(...results));
      return { on() {} };
    };

    const requestedUrls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      requestedUrls.push(parsedUrl);
      return {
        ok: true,
        json: async () => parsedUrl.pathname.endsWith('/taxa/FAMILY-1')
          ? { data: { taxon_rank__rank: 'Family', taxon__scientific_name: 'Culicidae' } }
          : {
              data: [{
                taxon_identifier: 'RECORD-TAXON',
                unique_key: 'SOURCE:RECORD-1',
                from_date: '2025-01-01',
                to_date: '2025-01-02',
                grid_ref_2km: 'SJ58D',
                taxon: { scientific_name: 'Culicidae', taxon_rank__rank: 'Family' },
                'parent-taxa': [{ scientific_name: 'Diptera' }],
                taxon__scientific_name: 'Culicidae',
                parent_taxa__scientific_name: 'Diptera',
                source__label: 'Imported feed'
              }],
              meta: { total: 15 }
            }
      };
    });

    const element = document.createElement('div');
    renderRecordsTable(element, {
      type: 'records-table',
      taxonId: 'FAMILY-1',
      region: 'vc-58',
      gridReference: 'SJ58D'
    });

    const taxonRequests = () => requestedUrls.filter((url) => url.pathname.endsWith('/taxa/FAMILY-1'));
    const occurrenceRequests = () => requestedUrls.filter((url) => url.pathname.endsWith('/occurrences'));
    await vi.waitFor(() => expect(occurrenceRequests()).toHaveLength(2));
    await vi.waitFor(() => expect(pageResults).toHaveLength(2));

    expect(taxonRequests()).toHaveLength(1);
    expect(occurrenceRequests().map((url) => url.searchParams.get('offset'))).toEqual(['0', '10']);
    for (const requestUrl of occurrenceRequests()) {
      expect(requestUrl.searchParams.get('taxon_identifier[eq]')).toBeNull();
      expect(requestUrl.searchParams.get('include')).toBe('taxon,parent-taxa');
      expect(requestUrl.searchParams.get('family__scientific_name')).toBe('Culicidae');
      expect(requestUrl.searchParams.get('higher_geography_identifier[eq]')).toBe('58');
      expect(requestUrl.searchParams.get('grid_ref_2km[eq]')).toBe('SJ58D');
      expect(requestUrl.searchParams.get('sort')).toBe('-to_date');
    }

    for (const pageResult of pageResults) {
      expect(pageResult.data[0]).toMatchObject({
        Source: 'SOURCE',
        Date: '2025-01-01 to 2025-01-02',
        grid_ref_2km: 'SJ58D'
      });
      expect(pageResult.data[0]).not.toHaveProperty('taxon');
      expect(pageResult.data[0]).not.toHaveProperty('parent-taxa');
      expect(Object.keys(pageResult.data[0]).some((field) => field.includes('__'))).toBe(false);
    }
  });
});