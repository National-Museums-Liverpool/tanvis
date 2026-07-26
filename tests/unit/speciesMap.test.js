import * as d3 from 'd3';
import { beforeEach, describe, it, expect } from 'vitest';
import { createOccurrenceData, applyOccurrenceDataToMap } from '../../src/adapters/speciesMap.js';

describe('species map redraw flow', () => {
  beforeEach(() => {
    globalThis.d3 = d3;
  });

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

    //const adapter = createOccurrenceData();
    //const payload = await adapter();
    const payload = await createOccurrenceData();

    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58',
      val: 10,
      caption: 'SJ58: 1 records'
    });
  });

  it('ignores rows without grid_ref_2km', async () => {
    applyOccurrenceDataToMap({ setMapType() {}, redrawMap() {} }, [{ grid_square: 'SJ58' }]);

    //const adapter = createOccurrenceData();
    //const payload = await adapter();
    const payload = await createOccurrenceData();

    expect(payload.records).toEqual([]);
  });
});
