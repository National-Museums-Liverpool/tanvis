const DEFAULT_BASE_URL = '/api';

const START_YEAR = 2016;
const END_YEAR = 2026;

const taxonSeriesProfiles = [
  { taxon_identifier: 'NHMSYS0001234567', baseOccurrences: 14, yearlyOccurrencesStep: 3, baseGridSquares: 8, yearlyGridStep: 2 },
  { taxon_identifier: 'NHMSYS0007654321', baseOccurrences: 10, yearlyOccurrencesStep: 2, baseGridSquares: 5, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001001', baseOccurrences: 24, yearlyOccurrencesStep: 2, baseGridSquares: 10, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001002', baseOccurrences: 12, yearlyOccurrencesStep: 2, baseGridSquares: 6, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001003', baseOccurrences: 32, yearlyOccurrencesStep: 3, baseGridSquares: 14, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001004', baseOccurrences: 16, yearlyOccurrencesStep: 2, baseGridSquares: 8, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001005', baseOccurrences: 15, yearlyOccurrencesStep: 2, baseGridSquares: 7, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001006', baseOccurrences: 9, yearlyOccurrencesStep: 1, baseGridSquares: 4, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000001007', baseOccurrences: 19, yearlyOccurrencesStep: 2, baseGridSquares: 9, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000002001', baseOccurrences: 6, yearlyOccurrencesStep: 1, baseGridSquares: 3, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000002002', baseOccurrences: 4, yearlyOccurrencesStep: 1, baseGridSquares: 2, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000002003', baseOccurrences: 3, yearlyOccurrencesStep: 1, baseGridSquares: 1, yearlyGridStep: 1 },
  { taxon_identifier: 'NHMSYS0000002004', baseOccurrences: 5, yearlyOccurrencesStep: 1, baseGridSquares: 2, yearlyGridStep: 1 }
];

const taxonYearStatsRows = taxonSeriesProfiles.flatMap((profile, profileIndex) => {
  return buildTaxonYearSeries(profile, profileIndex);
});

function buildTaxonYearSeries(profile, profileIndex) {
  const rows = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const yearOffset = year - START_YEAR;
    const seasonalWobble = yearOffset % 3 === 1 ? 1 : 0;
    const rowIndex = profileIndex * (END_YEAR - START_YEAR + 1) + yearOffset + 1;

    rows.push({
      uuid: `a7feecf0-0f5d-4332-8df9-${String(rowIndex).padStart(12, '0')}`,
      taxon_identifier: profile.taxon_identifier,
      year,
      occurrences_count: profile.baseOccurrences + (profile.yearlyOccurrencesStep * yearOffset) + seasonalWobble,
      grid_square_count: profile.baseGridSquares + (profile.yearlyGridStep * yearOffset)
    });
  }

  return rows;
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function normaliseBase(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function isTaxonYearStatsRequest(url, baseUrl) {
  const trimmedBase = normaliseBase(baseUrl);
  return url.pathname === `${trimmedBase}/v1/taxon-year-stats`;
}

function parsePositiveInteger(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function buildListResponse(url, data, total, limit, offset) {
  const nextOffset = offset + limit;
  const previousOffset = offset - limit;

  const self = new URL(url.toString());
  self.searchParams.set('limit', String(limit));
  self.searchParams.set('offset', String(offset));

  const next = nextOffset < total ? new URL(url.toString()) : null;
  const prev = previousOffset >= 0 ? new URL(url.toString()) : null;

  if (next) {
    next.searchParams.set('limit', String(limit));
    next.searchParams.set('offset', String(nextOffset));
  }

  if (prev) {
    prev.searchParams.set('limit', String(limit));
    prev.searchParams.set('offset', String(previousOffset));
  }

  return {
    data,
    meta: {
      limit,
      offset,
      count: data.length,
      total
    },
    links: {
      self: `${self.pathname}${self.search}`,
      next: next ? `${next.pathname}${next.search}` : null,
      prev: prev ? `${prev.pathname}${prev.search}` : null
    }
  };
}

function handleTaxonYearStatsRequest(url) {
  const taxonIdentifier = url.searchParams.get('taxon_identifier[eq]');
  const startYear = url.searchParams.get('year[gte]');
  const endYear = url.searchParams.get('year[lte]');

  if (!taxonIdentifier) {
    return jsonResponse(400, { error: 'taxon_identifier[eq] is required' });
  }

  const parsedStartYear = startYear === null ? undefined : parsePositiveInteger(startYear, NaN);
  const parsedEndYear = endYear === null ? undefined : parsePositiveInteger(endYear, NaN);

  if (startYear !== null && !Number.isFinite(parsedStartYear)) {
    return jsonResponse(400, { error: 'year[gte] must be a positive integer' });
  }

  if (endYear !== null && !Number.isFinite(parsedEndYear)) {
    return jsonResponse(400, { error: 'year[lte] must be a positive integer' });
  }

  if (Number.isFinite(parsedStartYear) && Number.isFinite(parsedEndYear) && parsedStartYear > parsedEndYear) {
    return jsonResponse(400, { error: 'year range is invalid' });
  }

  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);

  const filtered = taxonYearStatsRows.filter((row) => {
    if (row.taxon_identifier !== taxonIdentifier) {
      return false;
    }

    if (Number.isFinite(parsedStartYear) && row.year < parsedStartYear) {
      return false;
    }

    if (Number.isFinite(parsedEndYear) && row.year > parsedEndYear) {
      return false;
    }

    return true;
  });

  const page = filtered.slice(offset, offset + limit);
  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installTemporalYearChartMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);

    if (!isTaxonYearStatsRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    console.log('[temporal-year-chart-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
    return handleTaxonYearStatsRequest(requestUrl);
  };

  return function uninstallTemporalYearChartMockApi() {
    window.fetch = originalFetch;
  };
}