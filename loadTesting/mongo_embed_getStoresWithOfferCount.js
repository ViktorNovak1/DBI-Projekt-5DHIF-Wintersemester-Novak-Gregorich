import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration via environment variables:
// BASE_URL - base URL of the app (default http://localhost:3001)
// VUS - number of virtual users (overrides stages if set)
// DURATION - test duration, e.g. "30s", "1m" (used when VUS is set)
// Example: BASE_URL="http://localhost:3001" VUS=50 DURATION="30s" k6 run loadtest.js

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
      { duration: '10s', target: 10000 }, 
      { duration: '10', target: 10000 }, 
      { duration: '10s', target: 10000 }, 
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000'],
      'checks': ['rate>0.99'],
    },
  };
})();


export default function () {
  const url = `${BASE_URL}/mongo-embedded/stores/withOfferCount?page=2&limit=100`;

  const res = http.get(url, { tags: { name: 'GET /mongo-embedded/stores/withOfferCount' } });

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
  });

  // Small random sleep to simulate real user think time
  sleep(Math.random() * 1.5 + 0.1);
}