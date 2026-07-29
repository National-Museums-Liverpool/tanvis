import { describe, it, expect } from 'vitest';
import { getVisAttributeSchema } from '../../src/config/visAttributeSchema.js';

describe('getVisAttributeSchema', () => {
  it('keeps per-vis-type rules explicit while resolving shared defaults', () => {
    const schema = getVisAttributeSchema('species-map');
    const areaRule = schema.rules.find((rule) => rule.key === 'area');
    const hectadsRule = schema.rules.find((rule) => rule.key === 'hectads');
    const mapTypeRule = schema.rules.find((rule) => rule.key === 'mapType');

    expect(areaRule).toMatchObject({ defaultValue: 'vc-all' });
    expect(hectadsRule).toMatchObject({ defaultValue: true });
    expect(mapTypeRule).toMatchObject({ defaultValue: undefined });
    expect(schema.rules.map((rule) => rule.key)).toEqual(expect.arrayContaining(['type', 'source', 'control', 'species', 'area', 'mapType']));
  });
});
