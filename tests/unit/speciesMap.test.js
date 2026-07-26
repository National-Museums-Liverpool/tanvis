import { describe, it, expect } from 'vitest';
import { applyOccurrenceDataToMap, createOccurrenceMapTypeAdapter } from '../../src/adapters/speciesMap.js';

describe('species map redraw flow', () => {
  it('switches the map to the occurrences type and redraws it', () => {
    const calls = [];
    const map = {
      setMapType(type) {
        calls.push(['setMapType', type]);
      },
      redrawMap() {
        calls.push(['redrawMap']);
      }
    };

    applyOccurrenceDataToMap(map, [{ grid_ref_2km: 'SJ58' }]);

    expect(calls).toEqual([
      ['setMapType', 'occurrences'],
      ['redrawMap']
    ]);
  });

  it('uses the latest occurrence rows in the occurrences adapter', async () => {
    applyOccurrenceDataToMap({ setMapType() {}, redrawMap() {} }, [{ grid_ref_2km: 'SJ58' }]);

    const adapter = createOccurrenceMapTypeAdapter();
    const payload = await adapter();

    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58',
      id: 'SJ58'
    });
  });

  it('ignores rows without grid_ref_2km', async () => {
    applyOccurrenceDataToMap({ setMapType() {}, redrawMap() {} }, [{ grid_square: 'SJ58' }]);

    const adapter = createOccurrenceMapTypeAdapter();
    const payload = await adapter();

    expect(payload.records).toEqual([]);
  });
});
