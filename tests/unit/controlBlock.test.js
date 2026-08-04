import { afterEach, describe, expect, it, vi } from 'vitest';
import { createControlBlockAdapter } from '../../src/adapters/controlBlock.js';

describe('control block species selector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('searches taxa by scientific name and dispatches the selected species id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const requestUrl = typeof url === 'string' ? url : String(url);

      if (requestUrl.includes('taxon-groups')) {
        return {
          ok: true,
          json: async () => ({ data: [{ title: 'Bees', external_key: 'bees' }] })
        };
      }

      if (requestUrl.includes('/taxa')) {
        return {
          ok: true,
          json: async () => ({ data: [{ taxon_identifier: 'ABC123', scientific_name: 'Apis mellifera', vernacular_name: 'Honey bee' }] })
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const element = document.createElement('div');
    element.id = 'vc-control';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58',
      source: 'https://example.test/api/'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const searchInput = element.querySelector('input.tanvis-species-search-input');
    expect(searchInput).not.toBeNull();

    searchInput.value = 'bee';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const requestUrl = fetchMock.mock.calls.at(-1)?.[0];
    expect(String(requestUrl)).toContain('scientific_name%5Bcontains%5D=bee');

    let selectedSpeciesId = null;
    element.addEventListener('species-row-selected', (event) => {
      selectedSpeciesId = event.detail?.speciesId || null;
    });

    const resultOption = element.querySelector('.tanvis-species-search-result');
    expect(resultOption).not.toBeNull();
    resultOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(selectedSpeciesId).toBe('ABC123');
  });

  it('keeps the existing results visible while a newer query is pending', async () => {
    let resolveSecondRequest;
    const secondRequestPromise = new Promise((resolve) => {
      resolveSecondRequest = resolve;
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const requestUrl = typeof url === 'string' ? url : String(url);

      if (requestUrl.includes('taxon-groups')) {
        return {
          ok: true,
          json: async () => ({ data: [{ title: 'Bees', external_key: 'bees' }] })
        };
      }

      if (requestUrl.includes('/taxa')) {
        if (requestUrl.includes('scientific_name%5Bcontains%5D=bee')) {
          return {
            ok: true,
            json: async () => ({ data: [{ taxon_identifier: 'ABC123', scientific_name: 'Apis mellifera', vernacular_name: 'Honey bee' }] })
          };
        }

        if (requestUrl.includes('scientific_name%5Bcontains%5D=wasp')) {
          return {
            ok: true,
            json: async () => secondRequestPromise
          };
        }
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const element = document.createElement('div');
    element.id = 'vc-control';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const searchInput = element.querySelector('input.tanvis-species-search-input');
    expect(searchInput).not.toBeNull();

    searchInput.value = 'bee';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const initialResult = element.querySelector('.tanvis-species-search-result');
    expect(initialResult?.textContent).toContain('Apis mellifera');

    searchInput.value = 'wasp';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    const visibleResults = element.querySelectorAll('.tanvis-species-search-result');
    expect(visibleResults.length).toBeGreaterThan(0);
    expect(visibleResults[0].textContent).toContain('Apis mellifera');

    resolveSecondRequest({
      data: [{ taxon_identifier: 'XYZ999', scientific_name: 'Vespula germanica', vernacular_name: 'German wasp' }]
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 350));

    const updatedResult = element.querySelector('.tanvis-species-search-result');
    expect(updatedResult?.textContent).toContain('Vespula germanica');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('scientific_name%5Bcontains%5D=wasp');
  });

  it('does not request taxa again when the search is cleared', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const requestUrl = typeof url === 'string' ? url : String(url);

      if (requestUrl.includes('taxon-groups')) {
        return {
          ok: true,
          json: async () => ({ data: [{ title: 'Bees', external_key: 'bees' }] })
        };
      }

      if (requestUrl.includes('/taxa')) {
        return {
          ok: true,
          json: async () => ({ data: [{ taxon_identifier: 'ABC123', scientific_name: 'Apis mellifera', vernacular_name: 'Honey bee' }] })
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const element = document.createElement('div');
    element.id = 'vc-control';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const searchInput = element.querySelector('input.tanvis-species-search-input');
    expect(searchInput).not.toBeNull();

    searchInput.value = 'bee';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const taxaRequestsBeforeClear = fetchMock.mock.calls.filter(([requestUrl]) => String(requestUrl).includes('/taxa')).length;
    expect(taxaRequestsBeforeClear).toBe(1);

    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const taxaRequestsAfterClear = fetchMock.mock.calls.filter(([requestUrl]) => String(requestUrl).includes('/taxa')).length;
    expect(taxaRequestsAfterClear).toBe(1);
    expect(element.querySelector('.tanvis-species-search-result')).toBeNull();
  });

  it('clears the input and results after a species is selected', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const requestUrl = typeof url === 'string' ? url : String(url);

      if (requestUrl.includes('taxon-groups')) {
        return {
          ok: true,
          json: async () => ({ data: [{ title: 'Bees', external_key: 'bees' }] })
        };
      }

      if (requestUrl.includes('/taxa')) {
        return {
          ok: true,
          json: async () => ({ data: [{ taxon_identifier: 'ABC123', scientific_name: 'Apis mellifera', vernacular_name: 'Honey bee' }] })
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const element = document.createElement('div');
    element.id = 'vc-control';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const searchInput = element.querySelector('input.tanvis-species-search-input');
    expect(searchInput).not.toBeNull();

    searchInput.value = 'bee';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const resultOption = element.querySelector('.tanvis-species-search-result');
    expect(resultOption).not.toBeNull();

    resultOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(searchInput.value).toBe('');
    expect(element.querySelector('.tanvis-species-search-result')).toBeNull();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('scientific_name%5Bcontains%5D=bee');
  });

  it('hides requested control sections when data-vis-control-hide is set', async () => {
    const element = document.createElement('div');
    element.id = 'vc-control';
    element.dataset.visControlHide = 'area groups name-type species';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.querySelector('input[type="radio"][value="vc-58"]')).toBeNull();
    expect(element.querySelector('select.tanvis-controls-select')).toBeNull();
    expect(element.querySelector('input[type="radio"][value="scientific"]')).toBeNull();
    expect(element.querySelector('input.tanvis-species-search-input')).toBeNull();
  });

  it('hides only the name-type toggle buttons when data-vis-control-hide includes name-type', async () => {
    const element = document.createElement('div');
    element.id = 'vc-control';
    element.dataset.visControlHide = 'name-type';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.querySelector('select.tanvis-controls-select')).not.toBeNull();
    expect(element.querySelector('input[type="radio"][value="scientific"]')).toBeNull();
    expect(element.querySelector('input[type="radio"][value="vernacular"]')).toBeNull();
  });

  it('hides only the groups selector when data-vis-control-hide includes groups', async () => {
    const element = document.createElement('div');
    element.id = 'vc-control';
    element.dataset.visControlHide = 'groups';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.querySelector('select.tanvis-controls-select')).toBeNull();
    expect(element.querySelector('input[type="radio"][value="scientific"]')).not.toBeNull();
    expect(element.querySelector('input[type="radio"][value="vernacular"]')).not.toBeNull();
  });

  it('switches to the vernacular filter when the label mode is vernacular', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const requestUrl = typeof url === 'string' ? url : String(url);

      if (requestUrl.includes('taxon-groups')) {
        return {
          ok: true,
          json: async () => ({ data: [{ title: 'Bees', external_key: 'bees' }] })
        };
      }

      if (requestUrl.includes('/taxa')) {
        return {
          ok: true,
          json: async () => ({ data: [{ taxon_identifier: 'XYZ999', scientific_name: 'Apis mellifera', vernacular_name: 'Honey bee' }] })
        };
      }

      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const element = document.createElement('div');
    element.id = 'vc-control';
    document.body.appendChild(element);

    const adapter = createControlBlockAdapter();
    adapter.render(element, {
      area: 'vc-58'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const vernacularInput = Array.from(element.querySelectorAll('input[type="radio"]')).find((input) => input.value === 'vernacular');
    expect(vernacularInput).not.toBeNull();
    vernacularInput.checked = true;
    vernacularInput.dispatchEvent(new Event('change', { bubbles: true }));

    const searchInput = element.querySelector('input.tanvis-species-search-input');
    searchInput.value = 'honey';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    const requestUrl = fetchMock.mock.calls.at(-1)?.[0];
    expect(String(requestUrl)).toContain('vernacular_name%5Bcontains%5D=honey');
  });
});
