import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/config/parseOptions.js';

describe('parseOptions', () => {
  it('reads the supported data attributes without a source override', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'control-block';

    const parsed = parseOptions(element);

    expect(parsed).toMatchObject({
      type: 'control-block',
      area: '',
    });
    expect(parsed).not.toHaveProperty('source');
  });

  it('parses vice-county attributes to numeric identifiers for specific areas and empty string for vc-all', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-map';
    element.dataset.visArea = 'vc-all';

    expect(parseOptions(element).area).toBe('');

    const vc59Element = document.createElement('div');
    vc59Element.dataset.visType = 'species-map';
    vc59Element.dataset.visArea = 'vc-59';

    expect(parseOptions(vc59Element).area).toBe(59);
  });

  it('does not default to a supported vis-type when data-vis-type is missing', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).type).toBeUndefined();
  });

  it('defaults boundaries to true when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).boundaries).toBe(true);
  });

  it('parses boundaries true when supplied as true', () => {
    const element = document.createElement('div');
    element.dataset.visBoundaries = 'true';

    expect(parseOptions(element).boundaries).toBe(true);
  });

  it('defaults hectads to true when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).hectads).toBe(true);
  });

  it('parses hectads false when supplied as false', () => {
    const element = document.createElement('div');
    element.dataset.visHectads = 'false';

    expect(parseOptions(element).hectads).toBe(false);
  });

  it('defaults expand to false when not supplied', () => {
    const element = document.createElement('div');
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('expand');
    expect(parsed.expand).toBe(false);
  });

  it('parses expand true when supplied as true', () => {
    const element = document.createElement('div');
    element.dataset.visExpand = 'true';

    expect(parseOptions(element).expand).toBe(true);
  });

  it('parses expand false when supplied as false', () => {
    const element = document.createElement('div');
    element.dataset.visExpand = 'false';

    expect(parseOptions(element).expand).toBe(false);
  });

  it('includes width as undefined when not supplied', () => {
    const element = document.createElement('div');
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('width');
    expect(parsed.width).toBeUndefined();
  });

  it('parses width when supplied as a positive number', () => {
    const element = document.createElement('div');
    element.dataset.visWidth = '640';

    expect(parseOptions(element).width).toBe(640);
  });

  it('includes width as undefined when supplied as a non-positive number', () => {
    const element = document.createElement('div');
    element.dataset.visWidth = '0';
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('width');
    expect(parsed.width).toBeUndefined();
  });

  it('includes height as undefined when not supplied', () => {
    const element = document.createElement('div');
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('height');
    expect(parsed.height).toBeUndefined();
  });

  it('parses height when supplied as a positive number', () => {
    const element = document.createElement('div');
    element.dataset.visHeight = '480';

    expect(parseOptions(element).height).toBe(480);
  });

  it('includes height as undefined when supplied as a non-positive number', () => {
    const element = document.createElement('div');
    element.dataset.visHeight = '-10';
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('height');
    expect(parsed.height).toBeUndefined();
  });

  it('reads start and end date attributes for new-species-table', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'new-species-table';
    element.dataset.visStartDate = '2025-01-01';
    element.dataset.visEndDate = '2025-12-31';

    expect(parseOptions(element)).toMatchObject({
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });
  });

  it('parses data-vis-top-n when supplied', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'increasing-species-table';
    element.dataset.visTopN = '25';

    expect(parseOptions(element).topN).toBe(25);
  });

  it('reads taxon and year attributes for temporal-year-chart', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'temporal-year-chart';
    element.dataset.visTaxonid = 'NHMSYS0001234567';
    element.dataset.visStartYear = '1970';
    element.dataset.visEndYear = '2024';

    expect(parseOptions(element)).toMatchObject({
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      startYear: 1970,
      endYear: 2024
    });
  });

  it('reads data-vis-linked-table for temporal-year-chart', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'temporal-year-chart';
    element.dataset.visTaxonIdSource = 'increasing-table';

    expect(parseOptions(element)).toMatchObject({
      type: 'temporal-year-chart',
      taxonIdSource: 'increasing-table'
    });
  });

  it('reads data-vis-linked-table for species-map', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-map';
    element.dataset.visTaxonIdSource = 'my-new-species-table';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-map',
      taxonIdSource: 'my-new-species-table'
    });
  });

  it('reads data-vis-year for species-absent-since', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-absent-since';
    element.dataset.visYear = '2024';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-absent-since',
      year: 2024
    });
  });

  it('defaults dot styling properties when data attributes are absent', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-map';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-map',
      dotColour: 'black',
      transformation: 'none',
      dotShape: 'circle'
    });
  });

  it('reads data-vis-map-type for map renderers', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-map';
    element.dataset.visMapType = 'leaflet';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-map',
      mapType: 'leaflet'
    });
  });

  it('reads data-vis-taxonid for species-map', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-map';
    element.dataset.visTaxonid = 'NHMSYS0000001001';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-map',
      taxonId: 'NHMSYS0000001001'
    });
  });

  it('reads data-vis-grid-stats-type for grid-stats-map', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'grid-stats-map';
    element.dataset.visGridStatsType = 'species';

    expect(parseOptions(element)).toMatchObject({
      type: 'grid-stats-map',
      gridStatsType: 'species'
    });
  });

  it('reads data-vis-taxonid for species-identifier', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'species-identifier';
    element.dataset.visTaxonid = 'NHMSYS0000001001';

    expect(parseOptions(element)).toMatchObject({
      type: 'species-identifier',
      taxonId: 'NHMSYS0000001001'
    });
  });

  it('defaults grid-stats-map mapType to static when data-vis-map-type is absent', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'grid-stats-map';

    expect(parseOptions(element)).toMatchObject({
      type: 'grid-stats-map',
      mapType: 'static'
    });
  });

  it('reads data-vis-map-type for grid-stats-map', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'grid-stats-map';
    element.dataset.visMapType = 'switch';

    expect(parseOptions(element)).toMatchObject({
      type: 'grid-stats-map',
      mapType: 'switch'
    });
  });
});
