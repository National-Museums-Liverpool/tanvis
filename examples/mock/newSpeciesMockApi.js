const DEFAULT_BASE_URL = '/api';

const newSpeciesRecords = [
  {
    speciesId: 2001,
    scientificName: 'Eristalis tenax',
    commonName: 'Drone Fly',
    firstRecordDate: '2025-04-12',
    vcNumber: 58
  },
  {
    speciesId: 2002,
    scientificName: 'Volucella pellucens',
    commonName: 'Pellucid Hoverfly',
    firstRecordDate: '2025-06-01',
    vcNumber: 59
  },
  {
    speciesId: 2003,
    scientificName: 'Cheilosia illustrata',
    commonName: 'Large Black Hoverfly',
    firstRecordDate: '2026-05-19',
    vcNumber: 60
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNewSpeciesRequest(url, baseUrl) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return url.pathname === `${trimmedBase}/new-species`;
}

export function installNewSpeciesMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);

    if (!isNewSpeciesRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    const startDate = requestUrl.searchParams.get('startDate');
    const endDate = requestUrl.searchParams.get('endDate');

    if (!startDate) {
      return jsonResponse(400, { error: 'startDate is required' });
    }

    if (!endDate) {
      return jsonResponse(400, { error: 'endDate is required' });
    }

    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      return jsonResponse(400, { error: 'Dates must use YYYY-MM-DD format' });
    }

    const records = newSpeciesRecords.filter((record) => {
      return record.firstRecordDate >= startDate && record.firstRecordDate <= endDate;
    });

    return jsonResponse(200, {
      startDate,
      endDate,
      count: records.length,
      records
    });
  };

  return function uninstallNewSpeciesMockApi() {
    window.fetch = originalFetch;
  };
}