const DEFAULT_BASE_URL = '/api';
const DEFAULT_CSV_PATH = './mock/grid-squares.csv';

let gridSquareStatsRowsPromise = null;

function parseCsvRow(line) {
  const [squareRaw, higherGeographyRaw, higherGeographyNameRaw] = line.split(',');
  return {
    square: String(squareRaw || '').trim(),
    higher_geography_identifier: Number(String(higherGeographyRaw || '').trim()),
    geographic_region__higher_geography: String(higherGeographyNameRaw || '').trim()
  };
}

function createMockStatsFromCsvRow(csvRow, index) {
  const higherGeographyIdentifier = Number.isFinite(csvRow.higher_geography_identifier)
    ? csvRow.higher_geography_identifier
    : null;

  return {
    uuid: `grid-stats-${String(index + 1).padStart(6, '0')}`,
    square: csvRow.square,
    // Mocked numeric fields for now; these are not sourced from CSV.
    easting: 300000 + (index * 1000),
    northing: 300000 + ((index % 300) * 1000),
    lon: -4.5 + ((index % 240) * 0.02),
    lat: 50.0 + ((index % 160) * 0.02),
    partial: index % 3 === 0 ? 1 : 0,
    occurrences_count: 25 + ((index * 17) % 500),
    species_count: 10 + ((index * 11) % 150),
    higher_geography_identifier: higherGeographyIdentifier,
    geographic_region__higher_geography: csvRow.geographic_region__higher_geography,
    geographic_region__location_type: 'Vice County'
  };
}

async function loadGridSquareStatsRows(csvPath) {
  const response = await fetch(csvPath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load mock CSV: ${csvPath}`);
  }

  const csvText = await response.text();
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const csvRows = lines
    .slice(1)
    .map(parseCsvRow)
    .filter((row) => row.square && Number.isFinite(row.higher_geography_identifier) && row.geographic_region__higher_geography);

  return csvRows.map((row, index) => createMockStatsFromCsvRow(row, index));
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

function isGridSquareStatsRequest(url, baseUrl) {
  const trimmedBase = normaliseBase(baseUrl);
  return url.pathname === `${trimmedBase}/v1/grid-square-stats`;
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

function includeGeographicRegionRequested(url) {
  const includeParams = url.searchParams.getAll('include');
  return includeParams.some((value) => {
    return value
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .includes('geographic-region');
  });
}

function stripGeographicRegionFields(row) {
  const {
    geographic_region__higher_geography,
    geographic_region__location_type,
    ...rest
  } = row;

  return rest;
}

function handleGridSquareStatsRequest(url, gridSquareStatsRows) {
  const geographicRegionFilter = url.searchParams.get('geographic_region_identifier[eq]');
  const partialFilter = url.searchParams.get('partial[eq]');
  const speciesCountFilter = url.searchParams.get('species_count[gte]');
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);
  const includeGeographicRegion = includeGeographicRegionRequested(url);

  const filtered = gridSquareStatsRows.filter((row) => {
    if (geographicRegionFilter) {
      const geographicRegionIdentifier = Number(geographicRegionFilter);
      if (!Number.isFinite(geographicRegionIdentifier) || row.higher_geography_identifier !== geographicRegionIdentifier) {
        return false;
      }
    }

    if (partialFilter !== null && partialFilter !== undefined && partialFilter !== '') {
      const partial = Number(partialFilter);
      if (!Number.isFinite(partial) || row.partial !== partial) {
        return false;
      }
    }

    if (speciesCountFilter !== null && speciesCountFilter !== undefined && speciesCountFilter !== '') {
      const speciesCount = Number(speciesCountFilter);
      if (!Number.isFinite(speciesCount) || row.species_count < speciesCount) {
        return false;
      }
    }

    return true;
  });

  const page = filtered
    .slice(offset, offset + limit)
    .map((row) => (includeGeographicRegion ? row : stripGeographicRegionFields(row)));

  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installGridStatsMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const csvPath = options.csvPath || DEFAULT_CSV_PATH;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  gridSquareStatsRowsPromise = loadGridSquareStatsRows(csvPath);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);

    if (!isGridSquareStatsRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    const gridSquareStatsRows = await gridSquareStatsRowsPromise;

    console.log('[grid-stats-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
    return handleGridSquareStatsRequest(requestUrl, gridSquareStatsRows);
  };

  return function uninstallGridStatsMockApi() {
    window.fetch = originalFetch;
    gridSquareStatsRowsPromise = null;
  };
}

export async function listMockGridSquareStatsSquares() {
  if (!gridSquareStatsRowsPromise) {
    return [];
  }

  const rows = await gridSquareStatsRowsPromise;
  return rows.map((row) => row.square);
}