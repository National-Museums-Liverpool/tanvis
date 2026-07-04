import { describe, it, expect } from 'vitest';
import { render } from '../../src/core/render.js';
import { registerRenderer } from '../../src/core/registry.js';

describe('render', () => {
  it('uses the registered renderer', () => {
    registerRenderer('table', (element) => {
      element.textContent = 'rendered';
    });

    const element = document.createElement('div');
    element.dataset.visType = 'table';

    expect(render(element)).toEqual({ rendered: true, errors: [] });
    expect(element.textContent).toBe('rendered');
  });

  it('requires data-vis-start-date for new-species-table', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';

    expect(render(element)).toEqual({
      rendered: false,
      errors: ['Missing data-vis-start-date for new-species-table']
    });
  });
});
