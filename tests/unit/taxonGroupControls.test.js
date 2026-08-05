import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTaxonGroupControls } from '../../src/controls/taxonGroupControls.js';
import { subscribeToControl } from '../../src/controls/controlBus.js';

describe('createTaxonGroupControls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('emits a name-language-change event when the label mode toggle changes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const rootElement = document.createElement('div');
    rootElement.id = 'vc-control-taxon-groups';
    document.body.appendChild(rootElement);

    const events = [];
    subscribeToControl('vc-control-taxon-groups', (event) => {
      events.push(event);
    });

    const targetBody = createTaxonGroupControls({
      rootElement,
      apiBase: 'https://example.test/api/v1/',
      labelMode: 'scientific'
    });
    document.body.appendChild(targetBody);

    await Promise.resolve();

    const vernacularInput = document.querySelector('input[value="vernacular"]');
    expect(vernacularInput).not.toBeNull();

    vernacularInput.checked = true;
    vernacularInput.dispatchEvent(new Event('change', { bubbles: true }));

    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual({
      type: 'name-language-change',
      labelMode: 'vernacular'
    });
  });
});
