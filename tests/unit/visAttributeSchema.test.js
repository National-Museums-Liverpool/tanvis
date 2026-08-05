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
    expect(mapTypeRule).toMatchObject({ defaultValue: 'static' });
    expect(schema.rules.find((rule) => rule.key === 'dotColour')).toMatchObject({ defaultValue: 'black' });
    expect(schema.rules.find((rule) => rule.key === 'transformation')).toMatchObject({ defaultValue: 'none' });
    expect(schema.rules.find((rule) => rule.key === 'dotShape')).toMatchObject({ defaultValue: 'circle' });
    expect(schema.rules.map((rule) => rule.key)).toEqual(expect.arrayContaining(['control', 'taxonId', 'area', 'mapType']));
    expect(schema.rules.find((rule) => rule.key === 'species')).toBeUndefined();
  });

  it('exposes a combined parse-and-validate handler on each rule', () => {
    const schema = getVisAttributeSchema('species-map');
    const controlRule = schema.rules.find((rule) => rule.key === 'control');

    expect(controlRule.parseAndValidate).toBeTypeOf('function');

    const result = controlRule.parseAndValidate('', { visControl: '' }, {}, document.createElement('div'), controlRule);
    expect(result.value).toBeUndefined();
  });

  it('always includes shared rules even when vis-type lists do not mention them explicitly', () => {
    const schema = getVisAttributeSchema('control-block');

    expect(schema.rules.find((rule) => rule.key === 'area')).toBeDefined();
    expect(schema.rules.map((rule) => rule.key)).toContain('area');
  });

  it('exposes boundaries for map-based visualizations but not temporal-year-chart', () => {
    const speciesSchema = getVisAttributeSchema('species-map');
    const gridSchema = getVisAttributeSchema('grid-stats-map');
    const temporalSchema = getVisAttributeSchema('temporal-year-chart');

    expect(speciesSchema.rules.find((rule) => rule.key === 'boundaries')).toBeDefined();
    expect(gridSchema.rules.find((rule) => rule.key === 'boundaries')).toBeDefined();
    expect(temporalSchema.rules.find((rule) => rule.key === 'boundaries')).toBeUndefined();
  });
});
