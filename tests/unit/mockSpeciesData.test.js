import { describe, it, expect } from 'vitest';
import { listMockSpeciesIds } from '../../examples/mock/speciesStatsMockApi.js';

describe('mock species data', () => {
  it('includes the requested species identifiers', () => {
    const speciesIds = listMockSpeciesIds();

    expect(speciesIds).toEqual(expect.arrayContaining([
      'NBNORG0000094747',
      'NBNORG0000010184',
      'NBNORG0000010180',
      'NBNORG0000010181',
      'NBNORG0000052153',
      'NBNORG0000008998',
      'NBNORG0000010143',
      'NBNORG0000101258',
      'NBNORG0000010147',
      'NBNORG0000010123'
    ]));
  });
});
