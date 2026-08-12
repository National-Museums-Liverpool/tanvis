import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderSpeciesIdentifier } from '../../src/renderers/speciesIdentifier.js';

describe('species identifier control', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
    document.body.innerHTML = '';
  });

  it('dispatches taxon-identified from data-vis-taxonid once rendered', async () => {
    const element = document.createElement('div');
    element.id = 'species-id-control';

    let selectedSpeciesId = null;
    element.addEventListener('taxon-identified', (event) => {
      selectedSpeciesId = event.detail?.speciesId || null;
    });

    renderSpeciesIdentifier(element, {
      type: 'species-identifier',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toBe('');
    expect(selectedSpeciesId).toBe('NHMSYS0001234567');
  });

  it('uses the taxon-id query parameter in preference to data-vis-taxonid', async () => {
    window.history.replaceState({}, '', '/?taxon-id=NHMSYS0007654321');

    const element = document.createElement('div');
    element.id = 'species-id-control';

    let selectedSpeciesId = null;
    element.addEventListener('taxon-identified', (event) => {
      selectedSpeciesId = event.detail?.speciesId || null;
    });

    renderSpeciesIdentifier(element, {
      type: 'species-identifier',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(selectedSpeciesId).toBe('NHMSYS0007654321');
  });

  it('does not dispatch when neither taxon-id query param nor taxonId is present', async () => {
    const element = document.createElement('div');
    element.id = 'species-id-control';

    let dispatchCount = 0;
    element.addEventListener('taxon-identified', () => {
      dispatchCount += 1;
    });

    renderSpeciesIdentifier(element, {
      type: 'species-identifier'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dispatchCount).toBe(0);
  });

  it('waits for the window load event before dispatching when the document is still loading', async () => {
    const readyStateSpy = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const element = document.createElement('div');
    element.id = 'species-id-control';

    let selectedSpeciesId = null;
    element.addEventListener('taxon-identified', (event) => {
      selectedSpeciesId = event.detail?.speciesId || null;
    });

    renderSpeciesIdentifier(element, {
      type: 'species-identifier',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(selectedSpeciesId).toBeNull();

    readyStateSpy.mockRestore();
    window.dispatchEvent(new Event('load'));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(selectedSpeciesId).toBe('NHMSYS0001234567');
  });
});