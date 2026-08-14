import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeciesRemarksBlock } from '../../src/renderers/speciesRemarksBlock.js';

describe('species remarks block', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders placeholder text when no species has been selected', () => {
    const element = document.createElement('div');

    renderSpeciesRemarksBlock(element, {
      type: 'species-remarks-block'
    });

    expect(element.textContent).toBe('No species remarks available.');
  });

  it('renders placeholder text when taxon remarks are not returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          scientific_name: 'Bombus terrestris'
        }
      })
    });

    const element = document.createElement('div');
    renderSpeciesRemarksBlock(element, {
      type: 'species-remarks-block',
      taxonId: 'NHMSYS0000000001'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('No species remarks available.');
  });

  it('renders taxon remarks from the taxa API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          taxon_remarks: 'A scarce species of unimproved grassland.'
        }
      })
    });

    const element = document.createElement('div');
    renderSpeciesRemarksBlock(element, {
      type: 'species-remarks-block',
      taxonId: 'NHMSYS0000000002'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://tanhub.biodiverseit.co.uk/api/v1/taxa/NHMSYS0000000002'
    );
    expect(element.textContent).toBe('A scarce species of unimproved grassland.');
  });

  it('updates from taxonIdSource taxon-identified events', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation(async (url) => {
      if (url.endsWith('/taxa/NHMSYS0000000100')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              taxon_remarks: 'Initial remarks.'
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            taxon_remarks: 'Updated remarks.'
          }
        })
      };
    });

    const source = document.createElement('div');
    source.id = 'species-source';
    document.body.appendChild(source);

    const element = document.createElement('div');
    renderSpeciesRemarksBlock(element, {
      type: 'species-remarks-block',
      taxonId: 'NHMSYS0000000100',
      taxonIdSource: 'species-source'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Initial remarks.');

    source.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'NHMSYS0000000200' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Updated remarks.');
    expect(element.dataset.visTaxonid).toBe('NHMSYS0000000200');
  });
});