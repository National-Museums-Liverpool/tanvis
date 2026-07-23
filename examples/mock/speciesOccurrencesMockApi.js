const DEFAULT_BASE_URL = '/api';

const occurrenceRows = [
  {
    uuid: 'occ-000001',
    taxon_identifier: 'NHMSYS0000001001',
    higher_geography_identifier: 58,
    event_date: '2024-06-11',
    grid_square: 'SJ58'
  },
  {
    uuid: 'occ-000002',
    taxon_identifier: 'NHMSYS0000001001',
    higher_geography_identifier: 59,
    event_date: '2024-06-12',
    grid_square: 'SD76'
  },
  {
    uuid: 'occ-000003',
    taxon_identifier: 'NHMSYS0000001001',
    higher_geography_identifier: 60,
    event_date: '2024-06-13',
    grid_square: 'SD31'
  },
  {
    uuid: 'occ-000004',
    taxon_identifier: 'NHMSYS0000001002',
    higher_geography_identifier: 59,
    event_date: '2024-05-03',
    grid_square: 'SJ99'
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

function isOccurrencesRequest(url, baseUrl) {
  const trimmedBase = normaliseBase(baseUrl);
  return url.pathname === `${trimmedBase}/v1/occurrences`;
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

function parseHigherGeographyInFilter(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
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

function handleOccurrencesRequest(url) {
  const taxonIdentifier = url.searchParams.get('taxon_identifier[eq]');
  const higherGeographyFilter = parseHigherGeographyInFilter(url.searchParams.get('higher_geography_identifier[in]'));
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);

  let filtered = occurrenceRows;

  if (taxonIdentifier) {
    filtered = filtered.filter((row) => row.taxon_identifier === taxonIdentifier);
  }

  if (higherGeographyFilter.length > 0) {
    filtered = filtered.filter((row) => higherGeographyFilter.includes(row.higher_geography_identifier));
  }

  const page = filtered.slice(offset, offset + limit);
  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installSpeciesOccurrencesMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);

    if (!isOccurrencesRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    console.log('[species-occurrences-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
    return handleOccurrencesRequest(requestUrl);
  };

  return function uninstallSpeciesOccurrencesMockApi() {
    window.fetch = originalFetch;
  };
}
