const DEFAULT_BASE_URL = '/api';

const speciesStatsRows = {
  "1001": {
    speciesId: 1001,
    vcNumber: 58,
    totalRecords: 1842,
    occupiedGridSquares: 237,
    rarityCategory: 'Local',
    firstRecordDate: '1978-06-14',
    firstRecordRecorderName: 'J. Whitaker',
    lastRecordDate: '2026-05-11',
    lastRecordRecorderName: 'R. Bell',
    firstVerifiedRecordDate: '1980-07-02',
    firstVerifiedRecordRecorderName: 'A. Shaw',
    lastVerifiedRecordDate: '2026-05-20',
    lastVerifiedRecordRecorderName: 'M. Turner',
    frequencyTrendScore: 56
  },
  "1002": {
    speciesId: 1002,
    vcNumber: null,
    totalRecords: 923,
    occupiedGridSquares: 88,
    rarityCategory: 'Nationally Scarce',
    firstRecordDate: '1964-08-22',
    firstRecordRecorderName: 'P. Stokes',
    lastRecordDate: '2025-09-04',
    lastRecordRecorderName: 'L. Ahmed',
    firstVerifiedRecordDate: '1971-05-30',
    firstVerifiedRecordRecorderName: 'C. Gibbons',
    lastVerifiedRecordDate: '2025-09-10',
    lastVerifiedRecordRecorderName: 'K. Doyle',
    frequencyTrendScore: 41
  },
  "1003": {
    speciesId: 1003,
    vcNumber: 60,
    totalRecords: 12034,
    occupiedGridSquares: 612,
    rarityCategory: 'Common',
    firstRecordDate: '1952-04-01',
    firstRecordRecorderName: 'D. Mercer',
    lastRecordDate: '2026-06-03',
    lastRecordRecorderName: 'S. Evans',
    firstVerifiedRecordDate: '1955-04-23',
    firstVerifiedRecordRecorderName: 'B. Muir',
    lastVerifiedRecordDate: '2026-06-07',
    lastVerifiedRecordRecorderName: 'T. Brookes',
    frequencyTrendScore: 67
  }
};

const speciesStatsList = Object.values(speciesStatsRows);

function extractSpeciesId(url, baseUrl) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const pathPrefix = `${trimmedBase}/species-stats`;

  if (!url.pathname.startsWith(pathPrefix)) {
    return null;
  }

  const pathRemainder = url.pathname.slice(pathPrefix.length);
  if (pathRemainder.startsWith('/')) {
    const pathId = pathRemainder.slice(1).trim();
    return pathId || null;
  }

  return url.searchParams.get('speciesId');
}

function extractRangeQuery(url, baseUrl) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const pathPrefix = `${trimmedBase}/species-stats`;

  if (!url.pathname.startsWith(pathPrefix)) {
    return null;
  }

  const firstRecordDateFrom = url.searchParams.get('firstRecordDateFrom');
  const firstRecordDateTo = url.searchParams.get('firstRecordDateTo');

  if (!firstRecordDateFrom && !firstRecordDateTo) {
    return null;
  }

  return {
    firstRecordDateFrom,
    firstRecordDateTo
  };
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function filterByFirstRecordDate(firstRecordDateFrom, firstRecordDateTo) {
  return speciesStatsList.filter((row) => {
    return row.firstRecordDate >= firstRecordDateFrom && row.firstRecordDate <= firstRecordDateTo;
  });
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function installSpeciesStatsMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
    const speciesId = extractSpeciesId(requestUrl, baseUrl);
    const rangeQuery = extractRangeQuery(requestUrl, baseUrl);

    if (speciesId === null && rangeQuery === null) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    if (rangeQuery !== null) {
      const { firstRecordDateFrom, firstRecordDateTo } = rangeQuery;

      if (!firstRecordDateFrom || !firstRecordDateTo) {
        return jsonResponse(400, {
          error: 'firstRecordDateFrom and firstRecordDateTo are both required'
        });
      }

      if (!isIsoDate(firstRecordDateFrom) || !isIsoDate(firstRecordDateTo)) {
        return jsonResponse(400, {
          error: 'Date range must use YYYY-MM-DD format'
        });
      }

      if (firstRecordDateFrom > firstRecordDateTo) {
        return jsonResponse(400, {
          error: 'firstRecordDateFrom must be earlier than or equal to firstRecordDateTo'
        });
      }

      return jsonResponse(200, {
        firstRecordDateFrom,
        firstRecordDateTo,
        count: filterByFirstRecordDate(firstRecordDateFrom, firstRecordDateTo).length,
        records: filterByFirstRecordDate(firstRecordDateFrom, firstRecordDateTo)
      });
    }

    if (!speciesId) {
      return jsonResponse(400, {
        error: 'speciesId is required'
      });
    }

    const row = speciesStatsRows[speciesId];
    if (!row) {
      return jsonResponse(404, {
        error: `No species stats found for speciesId ${speciesId}`
      });
    }

    return jsonResponse(200, row);
  };

  return function uninstallSpeciesStatsMockApi() {
    window.fetch = originalFetch;
  };
}

export function listMockSpeciesIds() {
  return Object.keys(speciesStatsRows);
}
