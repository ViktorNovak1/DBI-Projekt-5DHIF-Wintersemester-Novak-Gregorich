import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { test_options, path } from './options.js';

import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const dbType = 'mongo-embedded-schema'
const url = `${BASE_URL}/${dbType}${path}`;


export let options = test_options;


export function setup() {
    const res = http.get(`${BASE_URL}/${dbType}/stores`);
    const body = JSON.parse(res.body);

   // console.log(body);

    return body.stores[0];
}

export default function (originalStore) {

    const uuid = uuidv4();
    const store = {
        id: originalStore.id,
        name: originalStore.name,
        url: `${uuid}/k6Updated`,
    }

    const res = http.put(`${url}/${originalStore.id}`, JSON.stringify(store), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(res, {
        'status is 200': (r) => r.status === 200
    });


    sleep(1.5);
}

export function teardown(originalStore) {
    const res = http.put(`${url}/${originalStore.id}`, JSON.stringify(originalStore), {
        headers: { 'Content-Type': 'application/json' },
    });
}