import http from 'k6/http';
import { check, sleep } from 'k6';
import { test_options, path } from './options.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const url = `${BASE_URL}/mongo-embedded-schema${path}`;


export let options = test_options;


export default function () {
  const res = http.get(url, { tags: { name: 'GET /postgres/stores/' } });

  let json;
  try {
    json = res.json();
  } catch (e) {
    json = null;
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response is json': () => json !== null,
  });

  sleep(1.5);
}