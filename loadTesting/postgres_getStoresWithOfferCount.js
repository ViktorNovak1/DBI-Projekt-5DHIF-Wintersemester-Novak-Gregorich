import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration via environment variables:
// BASE_URL - base URL of the app (default http://localhost:3000)
// VUS - number of virtual users (overrides stages if set)
// DURATION - test duration, e.g. "30s", "1m" (used when VUS is set)
// Example: BASE_URL="http://localhost:3000" VUS=50 DURATION="30s" k6 run loadtest.js

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// If VUS and DURATION are provided we run a constant VUs test; otherwise a staged ramp test is used.
export let options = (() => {
  if (__ENV.VUS && __ENV.DURATION) {
    return {
      vus: parseInt(__ENV.VUS, 10),
      duration: __ENV.DURATION,
      thresholds: {
        // p95 response time under 1s
        'http_req_duration': ['p(95)<1000'],
        // at least 99% checks passing
        'checks': ['rate>0.99'],
      },
    };
  }

  return {
    stages: [
      { duration: '10s', target: 100 }, 
      { duration: '10', target: 1000 }, 
      { duration: '10s', target: 100 }, 
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000'],
      'checks': ['rate>0.99'],
    },
  };
})();

// Helper: build request URL with page, limit, offset
function buildUrl(page, limit) {
  const offset = (page - 1) * limit;
  const params = `?page=${page}&limit=${limit}&offset=${offset}`;
  return `${BASE_URL}/postgres/stores/withOfferCount${params}`;
}

export default function () {
  // Randomize pagination to exercise different offsets
  const page = Math.floor(Math.random() * 20) + 1; // pages 1..20
  const limits = [5, 10, 20, 50];
  const limit = limits[Math.floor(Math.random() * limits.length)];

  const url = buildUrl(page, limit);

  const res = http.get(url, { tags: { name: 'GET /postgres/stores/withOfferCount' } });

  // Basic checks:
  let json;
  try {
    json = res.json();
  } catch (e) {
    json = null;
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is json': () => json !== null,
    'has page field': () => json && Object.prototype.hasOwnProperty.call(json, 'page'),
    'has limit field': () => json && Object.prototype.hasOwnProperty.call(json, 'limit'),
    'has stores array': () => json && Array.isArray(json.stores),
    'stores length <= limit': () => json && Array.isArray(json.stores) ? json.stores.length <= limit : false,
  });

  // Small random sleep to simulate real user think time
  sleep(Math.random() * 1.5 + 0.1);
}