import { describe, it, expect } from 'vitest';
import { listMockSpeciesIds } from '../../examples/mock/speciesStatsMockApi.js';

describe('mock species data', () => {
  it('includes the requested species identifiers', () => {
    const speciesIds = listMockSpeciesIds();

    expect(speciesIds).toEqual(expect.arrayContaining([
      'NBNSYS0000008324',
      'NBNSYS0000166146',
      'NBNSYS0000009861',
      'NBNSYS0100003682',
      'NHMSYS0000875595',
      'NBNSYS0000031091',
      'NHMSYS0001387317',
      'NBNSYS0000030351',
      'NBNSYS0000009230',
      'NBNSYS0000007559'
    ]));
  });
});
