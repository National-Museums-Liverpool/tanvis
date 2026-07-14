const DEFAULT_BASE_URL = '/api';

const taxonYearStatsRows = [
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000001',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2016,
    occurrences_count: 14,
    grid_square_count: 8
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000002',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2017,
    occurrences_count: 21,
    grid_square_count: 13
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000003',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2018,
    occurrences_count: 19,
    grid_square_count: 11
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000004',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2019,
    occurrences_count: 32,
    grid_square_count: 18
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000005',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2020,
    occurrences_count: 28,
    grid_square_count: 17
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000006',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2021,
    occurrences_count: 35,
    grid_square_count: 20
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000007',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2022,
    occurrences_count: 41,
    grid_square_count: 23
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000008',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2023,
    occurrences_count: 38,
    grid_square_count: 22
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000009',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2024,
    occurrences_count: 44,
    grid_square_count: 25
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000010',
    taxon_identifier: 'NHMSYS0001234567',
    year: 2025,
    occurrences_count: 47,
    grid_square_count: 26
  },
  {
    uuid: 'a7feecf0-0f5d-4332-8df9-100000000011',
    taxon_identifier: 'NHMSYS0007654321',
    year: 2023,
    occurrences_count: 12,
    grid_square_count: 6
  }
];

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