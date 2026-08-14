import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeciesNameBlock } from '../../src/renderers/speciesNameBlock.js';

describe('species name block', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders placeholder text when no species has been selected', () => {
    const element = document.createElement('div');

    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      primaryName: 'scientific',
      secondaryName: 'none',
      authority: false
    });

    expect(element.textContent).toBe('Species name');
  });

  it('does not show loading text while fetching taxon details', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    const element = document.createElement('div');
    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      taxonId: 'NHMSYS0000000001',
      primaryName: 'scientific',
      secondaryName: 'none',
      authority: false
    });

    expect(element.textContent).not.toContain('Loading...');
  });

  it('renders scientific primary name with authority and vernacular secondary name', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          scientific_name: 'Bombus terrestris',
          scientific_name_authorship: 'Linnaeus, 1758',
          vernacular_name: 'Buff-tailed Bumblebee'
        }
      })
    });

    const element = document.createElement('div');
    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      taxonId: 'NHMSYS0000000001',
      primaryName: 'scientific',
      secondaryName: 'vernacular',
      authority: true
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://tanhub.biodiverseit.co.uk/api/v1/taxa/NHMSYS0000000001'
    );
    expect(element.textContent).toBe('Bombus terrestris Linnaeus, 1758 (Buff-tailed Bumblebee)');
    expect(element.querySelector('em:not([hidden])')?.textContent).toBe('Bombus terrestris');
  });

  it('renders vernacular primary and scientific secondary including authority in parentheses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        scientific_name: 'Carabus violaceus',
        scientific_name_authorship: 'Linnaeus, 1758',
        vernacular_name: 'Violet Ground Beetle'
      })
    });

    const element = document.createElement('div');
    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      taxonId: 'NHMSYS0000000002',
      primaryName: 'vernacular',
      secondaryName: 'scientific',
      authority: true
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('Violet Ground Beetle (Carabus violaceus Linnaeus, 1758)');
    expect(element.querySelector('em:not([hidden])')?.textContent).toBe('Carabus violaceus');
  });

  it('does not include authorship when authority is false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          scientific_name: 'Aglais io',
          scientific_name_authorship: 'Linnaeus, 1758',
          vernacular_name: 'Peacock'
        }
      })
    });

    const element = document.createElement('div');
    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      taxonId: 'NHMSYS0000000003',
      primaryName: 'scientific',
      secondaryName: 'none',
      authority: false
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('Aglais io');
    expect(element.querySelector('em:not([hidden])')?.textContent).toBe('Aglais io');
  });

  it('updates from taxonIdSource taxon-identified events', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockImplementation(async (url) => {
      if (url.endsWith('/taxa/NHMSYS0000000100')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              scientific_name: 'Initial species',
              vernacular_name: 'Initial vernacular'
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            scientific_name: 'Updated species',
            vernacular_name: 'Updated vernacular'
          }
        })
      };
    });

    const source = document.createElement('div');
    source.id = 'species-source';
    document.body.appendChild(source);

    const element = document.createElement('div');
    renderSpeciesNameBlock(element, {
      type: 'species-name-block',
      taxonId: 'NHMSYS0000000100',
      taxonIdSource: 'species-source',
      primaryName: 'scientific',
      secondaryName: 'none',
      authority: false
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Initial species');
  expect(element.querySelector('em:not([hidden])')?.textContent).toBe('Initial species');

    source.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'NHMSYS0000000200' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Updated species');
    expect(element.querySelector('em:not([hidden])')?.textContent).toBe('Updated species');
    expect(element.dataset.visTaxonid).toBe('NHMSYS0000000200');
  });
});
