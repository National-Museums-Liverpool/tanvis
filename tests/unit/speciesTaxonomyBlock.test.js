import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeciesTaxonomyBlock } from '../../src/renderers/speciesTaxonomyBlock.js';

describe('species taxonomy block', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders a placeholder when no species has been selected', () => {
    const element = document.createElement('div');

    renderSpeciesTaxonomyBlock(element, {
      type: 'species-taxonomy-block'
    });

    expect(element.textContent).toBe('No taxon selected');
  });

  it('renders an ancestor chain from the taxa API with any number of parents', async () => {
    const taxa = {
      Species: {
        scientific_name: 'Species',
        parent_taxon__taxon_identifier: 'parent3'
      },
      parent3: {
        scientific_name: 'Parent3',
        parent_taxon__taxon_identifier: 'parent2'
      },
      parent2: {
        scientific_name: 'Parent2',
        vernacular_name: 'Common Parent2',
        parent_taxon__taxon_identifier: 'parent1'
      },
      parent1: {
        scientific_name: 'Parent1'
      }
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const identifier = new URL(url).pathname.split('/').pop();
      return {
        ok: true,
        json: async () => ({ data: taxa[identifier] })
      };
    });

    const element = document.createElement('div');
    renderSpeciesTaxonomyBlock(element, {
      type: 'species-taxonomy-block',
      taxonId: 'Species'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    for (const [url] of globalThis.fetch.mock.calls) {
      expect(new URL(url).searchParams.get('include')).toBe('parent-taxon');
    }
    expect(element.textContent).toBe('Parent1>Parent2>Parent3>Species');
  });

  it('renders only the species name when no parent is returned', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { scientific_name: 'Species' }
      })
    });

    const element = document.createElement('div');
    renderSpeciesTaxonomyBlock(element, {
      type: 'species-taxonomy-block',
      taxonId: 'Species'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('Species');
  });

  it('prefers vernacular names when requested and falls back to scientific names', async () => {
    const taxa = {
      Species: {
        scientific_name: 'Scientific species',
        vernacular_name: 'Common species',
        parent_taxon__taxon_identifier: 'parent'
      },
      parent: {
        scientific_name: 'Scientific parent'
      }
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const identifier = new URL(url).pathname.split('/').pop();
      return {
        ok: true,
        json: async () => ({ data: taxa[identifier] })
      };
    });

    const element = document.createElement('div');
    renderSpeciesTaxonomyBlock(element, {
      type: 'species-taxonomy-block',
      taxonId: 'Species',
      preferCommon: true
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('Scientific parent>Common species');
  });

  it('updates the taxonomy when a linked source identifies another species', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const identifier = new URL(url).pathname.split('/').pop();
      return {
        ok: true,
        json: async () => ({
          data: { scientific_name: identifier }
        })
      };
    });

    const source = document.createElement('div');
    source.id = 'species-source';
    document.body.appendChild(source);

    const element = document.createElement('div');
    renderSpeciesTaxonomyBlock(element, {
      type: 'species-taxonomy-block',
      taxonId: 'Initial',
      taxonIdSource: 'species-source'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Initial');

    source.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'Updated' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(element.textContent).toBe('Updated');
  });
});
