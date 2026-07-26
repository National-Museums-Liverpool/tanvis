import { describe, it, expect } from 'vitest';
import { resolveActiveMapType } from '../../src/adapters/map/mapTypeSwitchControl.js';

describe('resolveActiveMapType', () => {
  it('reads a saved backend selection from the host element when the map container has none', () => {
    const hostElement = document.createElement('div');
    hostElement.dataset.tanvisGridStatsActiveMapType = 'leaflet';

    const mapElement = document.createElement('div');
    hostElement.appendChild(mapElement);

    expect(resolveActiveMapType(mapElement, 'switch', 'tanvisGridStatsActiveMapType')).toBe('leaflet');
  });
});
