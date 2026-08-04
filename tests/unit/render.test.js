import { beforeEach, describe, it, expect } from 'vitest';
import { render } from '../../src/core/render.js';
import { registerRenderer, resetRenderers } from '../../src/core/registry.js';

describe('render', () => {
  beforeEach(() => {
    resetRenderers();
  });
  it('uses the registered renderer', () => {
    registerRenderer('control-block', (element) => {
      element.textContent = 'rendered';
    });

    const element = document.createElement('div');
    element.id = 'control-block-test';
    element.dataset.visType = 'control-block';

    expect(render(element)).toEqual({ rendered: true, errors: [] });
    expect(element.textContent).toBe('rendered');
  });

  it('does not require data-vis-start-date for new-species-table when a renderer is registered', () => {
    registerRenderer('new-species-table', () => {});

    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';

    expect(render(element)).toEqual({
      rendered: true,
      errors: []
    });
  });

  it('reports renderer errors through the render result', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';

    const result = render(element);

    expect(result.rendered).toBe(false);
    expect(result.errors).toContain('No renderer registered for type "new-species-table"');
  });

  it('renders temporal-year-chart when registered', () => {
    registerRenderer('temporal-year-chart', () => {});

    const element = document.createElement('div');
    element.dataset.visType = 'temporal-year-chart';

    expect(render(element)).toEqual({
      rendered: true,
      errors: []
    });
  });
});
