import http from 'k6/http';
import { check, group, randomSeed, sleep } from 'k6';
import { test_options, path,amount_stores_to_delete } from './options.js';


import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const dbType = 'postgres'
const url = `${BASE_URL}/${dbType}${path}`;


export let options = test_options;

const SEED = 54232342;

export function setup() {

    const stores = [];
    for (let i = 0; i < amount_stores_to_delete; ++i) {
        const uuid = uuidv4();
        const store = {
            id: uuid,
            name: `${uuid}`,
            url: `k6DeleteMe-${uuid}`
        }
        const res = http.post(`${url}`, JSON.stringify(store), {
            headers: { 'Content-Type': 'application/json' },
        });


        if (res.status == 200) {
            stores.push(store);
        }
    }

    console.log(`stores length: ${stores.length}`);
    return { stores };
}


export default function (data) {
    const stores = data.stores;

    randomSeed(SEED);
    const store = randomItem(stores);


    const res = http.del(`${url}/${store.id}`);

    check(res, {
        'status is 200': (r) => r.status === 200
    });


    sleep(1.5);
}

export function teardown(stores) {
    for (const store in stores) {
        const res = http.del(`${url}/${store.id}`);
    }
}