import { describe, it, expect } from 'vitest';
import { render } from '../../src/core/render.js';
import { registerRenderer } from '../../src/core/registry.js';

describe('render', () => {
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

  it('requires data-vis-start-date for new-species-table', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';

    expect(render(element)).toEqual({
      rendered: false,
      errors: ['Missing data-vis-start-date for new-species-table']
    });
  });

  it('renders validation errors inline in the visualization container', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';

    render(element);

    const status = element.querySelector('.tanvis-vis-status');
    expect(status).not.toBeNull();
    expect(status.textContent).toContain('Missing data-vis-start-date for new-species-table');
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
