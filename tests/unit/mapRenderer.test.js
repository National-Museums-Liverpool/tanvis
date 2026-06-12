import { describe, it, expect } from 'vitest';
import { renderStaticMap } from '../../src/renderers/map.js';

describe('renderStaticMap', () => {
  it('calls brc-atlas svgMap, renders controls, and updates area selection', () => {
    const setIdentfierCalls = [];
    const redrawCalls = [];
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          setIdentfier: (value) => setIdentfierCalls.push(value),
          redrawMap: () => redrawCalls.push(true)
        };
      }
    };

    const element = document.createElement('div');
    const config = {
      type: 'map',
      area: 'vc-58-59-60',
      source: '/example.csv',
      ctl: true
    };

    renderStaticMap(element, config);

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].selector).toMatch(/^#tanvis-map-/);
    expect(svgMapCalls[0].transOptsControl).toBe(false);
    expect(svgMapCalls[0].transOptsKey).toBe('vc-58-59-60');
    expect(svgMapCalls[0].gridGjson).toBe('/data/vcs/hectad-grids/vc-58-59-60-hectads.geojson');
    expect(svgMapCalls[0].gridLineStyle).toBeUndefined();
    expect(setIdentfierCalls).toEqual(['/example.csv']);
    expect(redrawCalls).toHaveLength(1);

    expect(document.head.querySelector('#tanvis-shared-styles')).not.toBeNull();
    expect(element.querySelector('.tanvis-controls')).not.toBeNull();
    expect(element.querySelector('.tanvis-controls-toggle')).not.toBeNull();
    expect(element.querySelector('.tanvis-controls-header')).not.toBeNull();
    expect(element.querySelector('.tanvis-controls-group')).not.toBeNull();
    const toggle = element.querySelector('.tanvis-controls-toggle');
    const group = element.querySelector('.tanvis-controls-group');
    expect(toggle.textContent).toContain('Data options');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(group.hidden).toBe(false);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(group.hidden).toBe(true);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(group.hidden).toBe(false);

    const radios = Array.from(element.querySelectorAll('input[type="radio"]'));
    expect(radios).toHaveLength(4);
    expect(radios.map((radio) => radio.value)).toEqual(['vc-58', 'vc-59', 'vc-60', 'vc-58-59-60']);
    expect(element.textContent).toContain('Data options');
    expect(element.textContent).not.toContain('Area');
    expect(radios.find((radio) => radio.value === 'vc-58-59-60')?.checked).toBe(true);

    const vc59Radio = radios.find((radio) => radio.value === 'vc-59');
    vc59Radio.checked = true;
    vc59Radio.dispatchEvent(new Event('change'));

    expect(element.dataset.visArea).toBe('vc-59');
    expect(svgMapCalls).toHaveLength(2);
    expect(svgMapCalls[1].transOptsKey).toBe('vc-59');
    expect(svgMapCalls[1].boundaryGjson).toBe('/data/vcs/simp-100/vc-59-100.geojson');
    expect(redrawCalls).toHaveLength(2);
  });

  it('omits gridGjson when hectads is false', () => {
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderStaticMap(element, {
      type: 'map',
      area: 'vc-58',
      source: '/example.csv',
      ctl: false,
      hectads: false
    });

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].gridGjson).toBeUndefined();
    expect(svgMapCalls[0].gridLineStyle).toBe('none');
    expect(svgMapCalls[0].boundaryGjson).toBe('/data/vcs/simp-100/vc-58-100.geojson');
  });
});
