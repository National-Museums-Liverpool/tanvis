import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/config/parseOptions.js';

describe('parseOptions', () => {
  it('reads the supported data attributes without a source override', () => {
    const element = document.createElement('div');
    element.dataset.visType = 'control-block';

    const parsed = parseOptions(element);

    expect(parsed).toMatchObject({
      type: 'control-block',
      area: 'vc-all',
    });
    expect(parsed).not.toHaveProperty('source');
  });

  it('does not default to a supported vis-type when data-vis-type is missing', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).type).toBeUndefined();
  });

  it('defaults ctl to false when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).ctl).toBe(false);
  });

  it('defaults boundaries to false when not supplied', () => {
    const element = document.createElement('div');

    expect(parseOptions(element).boundaries).toBe(false);
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

  it('includes expand as undefined when not supplied', () => {
    const element = document.createElement('div');
    const parsed = parseOptions(element);

    expect(parsed).toHaveProperty('expand');
    expect(parsed.expand).toBeUndefined();
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
    element.dataset.visLinkedTable = 'increasing-table';

    expect(parseOptions(element)).toMatchObject({
      type: 'temporal-year-chart',
      linkedTable: 'increasing-table'
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
      dotColour: '',
      transformation: '',
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
