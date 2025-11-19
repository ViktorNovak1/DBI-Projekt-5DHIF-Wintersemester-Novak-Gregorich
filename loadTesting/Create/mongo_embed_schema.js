import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { test_options, path } from './options.js';

import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const url = `${BASE_URL}/mongo-embedded-schema${path}`;


export let options = test_options;

const deleteTerm = 'k6DeleteMe'

export default function () {

    const uuid = uuidv4();
    const store = {
        id: uuid,
        name: uuid,
        url: `${uuid}/${deleteTerm}`,
    }

    const res = http.post(url, JSON.stringify(store), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200
    });


    sleep(1.5);
}

export function teardown() {
    const res = http.del(`${url}/url/${deleteTerm}`);
}