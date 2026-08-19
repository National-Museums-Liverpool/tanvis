import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeciesInfoBlock } from '../../src/renderers/speciesInfoBlock.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

describe('species info block', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders simple info text from taxon-stats response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          occurrences_count: 123,
          grid_square_count: 45,
          taxon__conservation_status: 'Near Threatened',
          geographic_region__higher_geography: null
        }]
      })
    });

    const element = document.createElement('div');
    renderSpeciesInfoBlock(element, {
      type: 'species-info-block',
      taxonId: 'NHMSYS0000000001',
      area: 58
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const url = new URL(globalThis.fetch.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/v1/taxon-stats');
    expect(url.searchParams.get('taxon_identifier[eq]')).toBe('NHMSYS0000000001');
    expect(url.searchParams.get('higher_geography_identifier[eq]')).toBe('58');
    expect(url.searchParams.get('include')).toBe('taxon');
    expect(url.searchParams.get('limit')).toBe('10000');
    const rows = element.querySelectorAll('tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].children[0]?.textContent).toBe('Status:');
    expect(rows[1].children[0]?.textContent).toBe('Occurrences:');
    expect(rows[2].children[0]?.textContent).toBe('Tetrads:');
    expect(rows[0].children[0]?.style.textAlign).toBe('right');
    expect(rows[1].children[0]?.style.textAlign).toBe('right');
    expect(rows[2].children[0]?.style.textAlign).toBe('right');
    expect(rows[0].children[1]?.textContent).toBe('Near Threatened');
    expect(rows[0].children[1]?.querySelector('em')?.textContent).toBe('Near Threatened');
    expect(rows[1].children[1]?.textContent).toBe('123 (vc58)');
    expect(rows[2].children[1]?.textContent).toBe('45 (vc58)');
  });

  it('does not use higher_geography_identifier filter when area is empty (all VCs)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { occurrences_count: 5, grid_square_count: 2, taxon__conservation_status: 'LC', geographic_region__higher_geography: 58 },
          { occurrences_count: 6, grid_square_count: 3, taxon__conservation_status: 'LC', geographic_region__higher_geography: 59 },
          { occurrences_count: 7, grid_square_count: 4, taxon__conservation_status: 'LC', geographic_region__higher_geography: 60 },
          { occurrences_count: 18, grid_square_count: 9, taxon__conservation_status: 'LC', geographic_region__higher_geography: null }
        ]
      })
    });

    const element = document.createElement('div');
    renderSpeciesInfoBlock(element, {
      type: 'species-info-block',
      taxonId: 'NHMSYS0000000002',
      area: ''
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const url = new URL(globalThis.fetch.mock.calls[0][0]);
    expect(url.searchParams.get('higher_geography_identifier[eq]')).toBeNull();

    const rows = element.querySelectorAll('tr');
    expect(rows[0].children[1]?.textContent).toBe('Least Concern');
    expect(rows[1].children[1]?.textContent).toBe('18 (all VCs), 5 (vc58), 6 (vc59), 7 (vc60)');
    expect(rows[2].children[1]?.textContent).toBe('9 (all VCs), 2 (vc58), 3 (vc59), 4 (vc60)');
  });

  it('uses the selected VC label when a filtered query returns no rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderSpeciesInfoBlock(element, {
      type: 'species-info-block',
      taxonId: 'NHMSYS0000000003',
      area: 59
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const rows = element.querySelectorAll('tr');
    expect(rows[1].children[1]?.textContent).toBe('0 (vc59)');
    expect(rows[2].children[1]?.textContent).toBe('0 (vc59)');
  });

  it('updates taxon from taxonIdSource taxon-identified events', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation(async (url) => {
      if (url.includes('NHMSYS0000000100')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ occurrences_count: 1, grid_square_count: 1, taxon__conservation_status: 'Least Concern', geographic_region__higher_geography: null }]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: [{ occurrences_count: 9, grid_square_count: 7, taxon__conservation_status: 'Vulnerable', geographic_region__higher_geography: null }]
        })
      };
    });

    const source = document.createElement('div');
    source.id = 'species-source';
    document.body.appendChild(source);

    const element = document.createElement('div');
    renderSpeciesInfoBlock(element, {
      type: 'species-info-block',
      taxonId: 'NHMSYS0000000100',
      taxonIdSource: 'species-source',
      area: 58
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const initialRows = element.querySelectorAll('tr');
    expect(initialRows[1].children[1]?.textContent).toBe('1 (vc58)');

    source.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'NHMSYS0000000200' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    const updatedRows = element.querySelectorAll('tr');
    expect(updatedRows[1].children[1]?.textContent).toBe('9 (vc58)');
    expect(element.dataset.visTaxonid).toBe('NHMSYS0000000200');
  });

  it('updates area filter from linked control area-change events', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ occurrences_count: 3, grid_square_count: 2 }] })
    });

    const element = document.createElement('div');
    renderSpeciesInfoBlock(element, {
      type: 'species-info-block',
      taxonId: 'NHMSYS0000000300',
      area: 58,
      control: 'control-block'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    let lastUrl = new URL(fetchSpy.mock.calls.at(-1)[0]);
    expect(lastUrl.searchParams.get('higher_geography_identifier[eq]')).toBe('58');

    publishControlEvent('control-block', {
      type: 'area-change',
      area: 59
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    lastUrl = new URL(fetchSpy.mock.calls.at(-1)[0]);
    expect(lastUrl.searchParams.get('higher_geography_identifier[eq]')).toBe('59');
  });
});