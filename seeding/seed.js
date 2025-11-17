#!/usr/bin/env node
/**
 * Faker-based data generator + loader for:
 * - PostgreSQL 18 (tables: pc_product_categories, p_products, s_stores, o_offers)
 * - MongoDB 7
 *     * embedded model   -> collection: s_stores_embedded (with embedded offers)
 *     * referencing model-> collections: pc_product_categories_referencing, p_products_referencing, s_stores_referencing, o_offers_referencing
 *
 * Defaults assume Docker containers are mapped to localhost:
 *   Postgres: postgres://admin:admin@localhost:5432/postgres
 *   MongoDB : mongodb://admin:admin@localhost:27017 (authSource=admin)
 *
 * You can override via env vars:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 *   MONGODB_URI, MONGODB_DB
 *
 * Requires: pg, mongodb, @faker-js/faker, uuid, yargs, seedrandom
 *   npm i pg mongodb @faker-js/faker uuid yargs seedrandom
 *
 * Usage examples:
 *   # Same behavior as before (MongoDB embedded only)
 *   node faker_loader_pg_mongo_referencing_and_embedded.js
 *
 *   # MongoDB referencing only
 *   node faker_loader_pg_mongo_referencing_and_embedded.js --mongodb-mode referencing
 *
 *   # Seed both MongoDB models (embedded + referencing)
 *   node faker_loader_pg_mongo_referencing_and_embedded.js --mongodb-mode both
 */

import process from 'node:process';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import seedrandom from 'seedrandom';
import { faker } from '@faker-js/faker';
import { v7 as uuidv7 } from 'uuid';
import pg from 'pg';
import { MongoClient } from 'mongodb';

import { writeAllToCSVs, readAllFromCSVs } from './csv_writer.js'


const ExecutionModes = Object.freeze({
  CSV_DUMP_ONLY: "CSV_DUMP_ONLY",
  CSV_DUMP_AND_LOAD: "CSV_DUMP_AND_LOAD",
  LOAD_FROM_CSV_ONLY: "LOAD_FROM_CSV_ONLY"
})


const SELECTED_MODE = process.env.SELECTED_MODE || ExecutionModes.CSV_DUMP_AND_LOAD;
const SEED = parseInt(process.env.SEED);


// ---------- Configuration (env-overridable) ----------
const PGHOST = process.env.PGHOST || 'localhost';
const PGPORT = parseInt(process.env.PGPORT || '5432', 10);
const PGDATABASE = process.env.PGDATABASE || 'postgres';
const PGUSER = process.env.PGUSER || 'admin';
const PGPASSWORD = process.env.PGPASSWORD || 'admin';

const TIMESCALE_HOST = process.env.TIMESCALE_HOST || 'localhost';
const TIMESCALE_PORT = parseInt(process.env.TIMESCALE_PORT || '5432', 10);
const TIMESCALE_DATABASE = process.env.TIMESCALE_DATABASE || 'postgres';
const TIMESCALE_USER = process.env.TIMESCALE_USER || 'admin';
const TIMESCALE_PASSWORD = process.env.TIMESCALE_PASSWORD || '1234';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin@localhost:27017/?authSource=admin';
const MONGODB_DB = process.env.MONGODB_DB || 'products_playground';

const DEFAULT_N_CATEGORIES = 10;
const DEFAULT_N_STORES = 6;
const DEFAULT_N_PRODUCTS = 200;
const DEFAULT_N_OFFERS = 500; // total number of rows in o_offers

const N_CATEGORIES = parseInt(process.env.N_CATEGORIES, 10) || DEFAULT_N_CATEGORIES;
const N_STORES = parseInt(process.env.N_STORES, 10) || DEFAULT_N_STORES;
const N_PRODUCTS = parseInt(process.env.N_PRODUCTS, 10) || DEFAULT_N_PRODUCTS;
const N_OFFERS = parseInt(process.env.N_OFFERS, 10) || DEFAULT_N_OFFERS;

// ---------- EAN-13 generation (valid checksum) ----------
function ean13(rng = Math.random) {
  const digits = Array.from({ length: 12 }, () => Math.floor(rng() * 10));
  const sum_odd = digits.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const sum_even = digits.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  const checksum = (10 - ((sum_odd + 3 * sum_even) % 10)) % 10;
  return [...digits, checksum].join('');
}

// ---------- Types (JSDoc) ----------
/** @typedef {{id: string, name: string}} Category */
/** @typedef {{id: string, category_id: string, ean: string, name: string, retailPrice: number}} Product */
/** @typedef {{id: string, name: string, url: string}} Store */
/** @typedef {{store_id: string, product_id: string, price: number, amount: number}} Offer */

// ---------- Fake data generation ----------
function generateData({ n_categories, n_products, n_stores, n_offers, rng = Math.random }) {
  if (n_categories < 1 && n_products > 0) {
    throw new Error('Cannot create products without at least 1 category. Increase categories or set products 0.');
  }
  if ((n_stores === 0 || n_products === 0) && n_offers > 0) {
    console.warn('[WARN] Offers requested but either stores or products is 0; setting offers to 0.');
    n_offers = 0;
  }

  /** @type {Category[]} */
  const categories = [];
  const usedCatNames = new Set();
  while (categories.length < n_categories) {
    const name = faker.word.noun().slice(0, 64).replace(/^[a-z]/, (m) => m.toUpperCase());
    if (!usedCatNames.has(name)) {
      categories.push({ id: uuidv7(), name });
      usedCatNames.add(name);
    }
  }

  /** @type {Product[]} */
  const products = [];
  const usedEans = new Set();
  for (let i = 0; i < n_products; i++) {
    const cat = categories.length ? categories[Math.floor(rng() * categories.length)] : null;
    const pname = `${faker.company.name()} ${faker.color.human()} ${faker.word.noun()}`
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64)
      .replace(/\b\w/g, (m) => m.toUpperCase());
    const retail = Math.round((2.5 + rng() * (999.99 - 2.5)) * 100) / 100;
    let e = ean13(rng);
    while (usedEans.has(e)) e = ean13(rng);
    usedEans.add(e);
    products.push({
      id: uuidv7(),
      category_id: cat ? cat.id : uuidv7(), // should not happen due to check above
      ean: e,
      name: pname,
      retailPrice: Number(retail),
    });
  }

  /** @type {Store[]} */
  const stores = [];
  const usedStoreNames = new Set();
  const usedUrls = new Set();
  while (stores.length < n_stores) {
    const sname = `${faker.company.name()} Store`.slice(0, 64);
    const url = `https://${faker.internet.domainName()}/${faker.lorem.slug()}`.slice(0, 128);
    if (!usedStoreNames.has(sname) && !usedUrls.has(url)) {
      stores.push({ id: uuidv7(), name: sname, url });
      usedStoreNames.add(sname);
      usedUrls.add(url);
    }
  }

  /** @type {Offer[]} */
  const offers = [];
  if (n_offers > 0 && stores.length && products.length) {
    const allPairs = [];
    for (const s of stores) {
      for (const p of products) {
        allPairs.push([s.id, p.id, p.retailPrice]);
      }
    }
    const max_possible = allPairs.length;
    if (n_offers > max_possible) {
      console.warn(`[WARN] Requested ${n_offers} offers, but only ${max_possible} unique (store, product) pairs exist. Capping to ${max_possible}.`);
      n_offers = max_possible;
    }

    // Sample exactly n_offers unique pairs (Fisher-Yates partial shuffle)
    for (let i = allPairs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [allPairs[i], allPairs[j]] = [allPairs[j], allPairs[i]];
    }
    const sampled = allPairs.slice(0, n_offers);

    for (const [store_id, product_id, basePrice] of sampled) {
      const price = Math.round(basePrice * (0.6 + rng() * 0.6) * 100) / 100; // 0.6 - 1.2
      const amount = Math.floor(rng() * 251); // 0..250
      offers.push({ store_id, product_id, price: Number(price), amount });
    }
  }

  return { categories, products, stores, offers };
}

async function loadPostgres(categories, products, stores, offers) {
  const { Client } = pg;
  const client = new Client({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
  });

  try {
    await client.connect();
    console.log(`[Postgres] Connection successful to ${client.user}@${client.host}:${client.port}/${client.database}`);
  } catch (e) {
    console.error(`[Postgres] Connection FAILED:`, e.message);
    return;
  }

  const createSql = [
    `create table if not exists "pc_product_categories" (
      "id" uuid primary key,
      "name" varchar(64) unique not null);`,

    `create table if not exists "p_products" (
      "id" uuid primary key,
      "category_id" uuid not null references "pc_product_categories"("id"),
      "ean" varchar(13) unique not null,
      "name" varchar(64) not null,
      "retailPrice" real not null);`,


    `create table if not exists "s_stores" (
      "id" uuid primary key,
      "name" varchar(64) unique not null,
      "url" varchar(128) unique not null);`,

    `create table if not exists "o_offers" (
      "store_id" uuid not null references "s_stores"("id"),  
      "product_id" uuid not null references "p_products"("id"),  
      "price" real not null, 
      "amount" integer not null, 
      primary key ("store_id", "product_id"));`,
  ];

  try {
    await client.query('BEGIN');
    for (const sql of createSql) {
      await client.query(sql);
    }
    await client.query('TRUNCATE "o_offers", "p_products", "s_stores", "pc_product_categories" RESTART IDENTITY CASCADE;');
    console.log(`[Postgres] Cleanup done (tables truncated).`);

    // Bulk inserts (batched to avoid Postgres 65,535-parameter limit)
    const insertMany = async (table, cols, rows, conflictCols, maxParams = 60000) => {
      if (!rows.length) return;
      const perRow = cols.length;
      const rowsPerBatch = Math.max(1, Math.min(Math.floor(maxParams / perRow), 5000)); // safety cap
      for (let start = 0; start < rows.length; start += rowsPerBatch) {
        const chunk = rows.slice(start, start + rowsPerBatch);
        const values = [];
        const params = [];
        let i = 1;
        for (const row of chunk) {
          const placeholders = [];
          for (const col of cols) {
            placeholders.push(`$${i++}`);
            params.push(row[col]);
          }
          values.push(`(${placeholders.join(',')})`);
        }
        const conflict = conflictCols && conflictCols.length
          ? ` on conflict (${conflictCols.map(e => `"${e}"`).join(', ')}) do nothing`
          : '';
        const sql = `insert into "${table}" (${cols.map(e => `"${e}"`).join(', ')}) values ${values.join(', ')}${conflict}`;
        await client.query(sql, params);
      }
    };

    await insertMany('pc_product_categories', ['id', 'name'], categories, ['id']);
    await insertMany('p_products', ['id', 'category_id', 'ean', 'name', 'retailPrice'], products, ['id']);
    await insertMany('s_stores', ['id', 'name', 'url'], stores, ['id']);
    await insertMany('o_offers', ['store_id', 'product_id', 'price', 'amount'], offers, ['store_id', 'product_id']);

    const count = async (table) => (await client.query(`select count(*) from "${table}"`)).rows[0].count;
    const cat_count = await count('pc_product_categories');
    const prod_count = await count('p_products');
    const store_count = await count('s_stores');
    const offer_count = await count('o_offers');

    await client.query('COMMIT');
    console.log(`[Postgres] Rows now in DB — categories:${cat_count} products:${prod_count} stores:${store_count} offers:${offer_count}`);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => { });
    console.error(`[Postgres] ERROR while creating/inserting:`, e.message);
  } finally {
    await client.end().catch(() => { });
  }
}

// ---------- MongoDB (embedded) ----------
async function loadMongoEmbedded(categories, products, stores, offers, useIndex) {
  let client;
  try {
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.db('admin').command({ ping: 1 });
    console.log('[MongoDB] Connection successful.');
  } catch (e) {
    console.error('[MongoDB] Connection FAILED:', e.message);
    return;
  }

  const collectionName = useIndex ? 's_stores_embedded_index' : 's_stores_embedded';
  const db = client.db(MONGODB_DB);
  const colStore = db.collection(collectionName);

  try {
    // Cleanup
    const existing = new Set(await db.listCollections().toArray().then((arr) => arr.map((c) => c.name)));
    if (existing.has(collectionName)) await colStore.drop();
    console.log(`[MongoDB][embedded] Cleanup done (dropped collections: ${collectionName} if existed).`);
  } catch (e) {
    console.warn('[MongoDB][embedded] Cleanup warning:', e.message);
  }

  if (useIndex === true) {
    try {
      await colStore.createIndex({ id: 1 }, { unique: true });
      await colStore.createIndex({ name: 1 }, { unique: true });
      await colStore.createIndex({ url: 1 }, { unique: true });
      // Prevent duplicate product offers per store (sparse to allow stores without offers)
      await colStore.createIndex({ id: 1, 'offers.product.id': 1 }, { unique: true, sparse: true });
    } catch (e) {
      console.warn('[MongoDB][embedded] Index creation warning:', e.message);
    }
  }

  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const prodById = new Map(products.map((p) => [p.id, p]));

  const offersByStore = new Map();
  for (const o of offers) {
    const key = o.store_id;
    if (!offersByStore.has(key)) offersByStore.set(key, []);
    offersByStore.get(key).push(o);
  }

  const docs = [];
  for (const s of stores) {
    const sOffers = offersByStore.get(s.id) || [];
    const embeddedOffers = [];
    for (const o of sOffers) {
      const p = prodById.get(o.product_id);
      if (!p) continue;
      embeddedOffers.push({
        product: {
          id: p.id,
          category: catById.get(p.category_id) || 'Unknown',
          ean: p.ean,
          name: p.name,
          product_id: Number(p.retailPrice),
        },
        price: Number(o.price),
        amount: Number(o.amount),
      });
    }
    docs.push({ id: s.id, name: s.name, url: s.url, offers: embeddedOffers });
  }

  let inserted = 0;
  try {
    if (docs.length) {
      const res = await colStore.insertMany(docs, { ordered: false });
      inserted = Object.keys(res.insertedIds).length;
    }
  } catch (e) {
    if (e && e.result && typeof e.result.nInserted === 'number') {
      console.warn('[MongoDB][embedded] Bulk insert warning:', e.message);
      inserted = e.result.nInserted;
    } else {
      console.error('[MongoDB][embedded] Error inserting stores:', e.message);
    }
  }

  try {
    const store_count = await colStore.countDocuments({});
    const total_offers = await colStore.aggregate([
      { $unwind: { path: '$offers', preserveNullAndEmptyArrays: false } },
      { $count: 'n' },
    ]).toArray().then((arr) => (arr[0] ? arr[0].n : 0));
    console.log(`[MongoDB][embedded] Inserts — stores inserted:${inserted}`);
    console.log(`[MongoDB][embedded] Docs now in DB — stores:${store_count} offers:${total_offers}`);
  } catch (e) {
    console.error('[MongoDB][embedded] Count/Aggregation error:', e.message);
  } finally {
    await client.close().catch(() => { });
  }
}

// ---------- MongoDB (referencing) ----------
async function loadMongoReferencing(categories, products, stores, offers, useIndex) {
  let client;
  try {
    client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await client.db('admin').command({ ping: 1 });
    console.log('[MongoDB] Connection successful.');
  } catch (e) {
    console.error('[MongoDB] Connection FAILED:', e.message);
    return;
  }

  const catCollectionName = `pc_product_categories_referencing${useIndex ? '_index' : ''}`;
  const prodCollectionName = `p_products_referencing${useIndex ? '_index' : ''}`;
  const storeCollectionName = `s_stores_referencing${useIndex ? '_index' : ''}`;
  const offerCollectionName = `o_offers_referencing${useIndex ? '_index' : ''}`;


  const db = client.db(MONGODB_DB);
  const colCat = db.collection(catCollectionName);
  const colProd = db.collection(prodCollectionName);
  const colStore = db.collection(storeCollectionName);
  const colOffer = db.collection(offerCollectionName);

  // Cleanup
  try {
    const names = new Set(await db.listCollections().toArray().then((a) => a.map((c) => c.name)));
    const toDrop = [catCollectionName, prodCollectionName, storeCollectionName, offerCollectionName].filter((n) => names.has(n));
    for (const n of toDrop) await db.collection(n).drop();
    console.log(`[MongoDB][ref] Cleanup done (dropped collections: ${toDrop.length ? toDrop.join(', ') : 'none'}).`);
  } catch (e) {
    console.warn('[MongoDB][ref] Cleanup warning:', e.message);
  }

  if (useIndex === true) {
    try {
      await colCat.createIndex({ name: 1 }, { unique: true });
      await colProd.createIndex({ ean: 1 }, { unique: true });
      await colProd.createIndex({ category_id: 1 }, { name: 'fk_category_id' });
      await colStore.createIndex({ name: 1 }, { unique: true });
      await colStore.createIndex({ url: 1 }, { product_id: true });

      await colOffer.createIndex({ store_id: 1, product_id: 1 }, { unique: true, name: 'pk_store_product' });
      await colOffer.createIndex({ store_id: 1 }, { name: 'fk_store_id' });
      await colOffer.createIndex({ product_id: 1 }, { name: 'fk_product_id' });
    } catch (e) {
      console.warn('[MongoDB][ref] Index creation warning:', e.message);
    }
  }

  try {
    if (categories.length) {
      await colCat.insertMany(categories.map((c) => ({ _id: c.id, name: c.name })), { ordered: false });
    }
    if (products.length) {
      await colProd.insertMany(products.map((p) => ({
        _id: p.id,
        category_id: p.category_id,
        ean: p.ean,
        name: p.product_id,
        retailPrice: Number(p.retailPrice),
      })), { ordered: false });
    }
    if (stores.length) {
      await colStore.insertMany(stores.map((s) => ({ _id: s.id, name: s.name, url: s.url })), { ordered: false });
    }

    if (offers.length) {
      const prodIds = new Set(await colProd.find({}, { projection: { _id: 1 } }).toArray().then((arr) => arr.map((d) => d._id)));
      const storeIds = new Set(await colStore.find({}, { projection: { _id: 1 } }).toArray().then((arr) => arr.map((d) => d._id)));

      const offerDocs = [];
      let skipped = 0;
      for (const o of offers) {
        if (storeIds.has(o.store_id) && prodIds.has(o.product_id)) {
          offerDocs.push({ store_id: o.store_id, product_id: o.product_id, price: Number(o.price), amount: Number(o.amount) });
        } else {
          skipped += 1;
        }
      }
      if (offerDocs.length) await colOffer.insertMany(offerDocs, { ordered: false });
      if (skipped) console.log(`[MongoDB][ref] Skipped ${skipped} offers with missing references (should be 0).`);
    }

    const [cat_count, prod_count, store_count, offer_count] = await Promise.all([
      colCat.countDocuments({}),
      colProd.countDocuments({}),
      colStore.countDocuments({}),
      colOffer.countDocuments({}),
    ]);
    console.log(`[MongoDB][ref] Docs now in DB — categories:${cat_count} products:${prod_count} stores:${store_count} offers:${offer_count}`);
  } catch (e) {
    if (e && e.result) {
      console.warn('[MongoDB][ref] Bulk insert warning:', e.message);
    } else {
      console.error('[MongoDB][ref] ERROR while inserting:', e.message);
    }
  } finally {
    await client.close().catch(() => { });
  }
}

async function GetData() {
  if (SELECTED_MODE == ExecutionModes.CSV_DUMP_AND_LOAD || SELECTED_MODE == ExecutionModes.CSV_DUMP_ONLY) {
    console.log('Generating fake data...');
    const { categories, products, stores, offers } = generateData({
      n_categories: N_CATEGORIES,
      n_products: N_PRODUCTS,
      n_stores: N_STORES,
      n_offers: N_OFFERS,
      rng: Math.random,
    });
    console.log(`Generated: ${categories.length} categories, ${products.length} products, ${stores.length} stores, ${offers.length} offers`);

    return { categories, products, stores, offers };
  }
  else if (SELECTED_MODE == ExecutionModes.LOAD_FROM_CSV_ONLY) {
    const { categories, products, stores, offers } = await readAllFromCSVs()
    console.log(`Loaded: ${categories.length} categories, ${products.length} products, ${stores.length} stores, ${offers.length} offers`);

    return { categories, products, stores, offers };
  }

  /**@type {{categories: Category[], products: Product[], stores: Store[], offers: Offer[]}} */
  const result = { categories: [], products: [], stores: [], offers: [] };
  return result;
}

function IsSelectedModeValid() {
  for (let mode in ExecutionModes) {
    if (ExecutionModes[mode] === SELECTED_MODE) return true;
  }
  return false;
}

// ---------- Main ----------
async function main() {
  if (!IsSelectedModeValid()) {
    console.error(`Selected Mode: "${SELECTED_MODE}" is invalid`);
    return;
  }
  console.log(`Selected Mode: "${SELECTED_MODE}"`);

  if (SEED != undefined && !isNaN(SEED)) {
    console.log(`Seeding RNG with ${SEED} for reproducible output...`);
    faker.seed(SEED);
    seedrandom(String(SEED), { global: true }); // seed Math.random
  }

  const { categories, products, stores, offers } = await GetData();
  if (categories.length == 0 || products.length == 0 || stores.length == 0) {
    console.error("Data failure")
    return;
  }

  if (SELECTED_MODE == ExecutionModes.CSV_DUMP_AND_LOAD || SELECTED_MODE == ExecutionModes.CSV_DUMP_ONLY) {
    await writeAllToCSVs({ categories, products, stores, offers });
  }

  if (SELECTED_MODE == ExecutionModes.CSV_DUMP_AND_LOAD || SELECTED_MODE == ExecutionModes.LOAD_FROM_CSV_ONLY) {
    let load_pg = false; // eben nicht
    let load_mongo = true; // eben schon

    if (load_pg) {
      console.log('\n=== Loading into PostgreSQL ===');
      await loadPostgres(categories, products, stores, offers);
    }

    if (load_mongo) {
      console.log('\n=== Loading into MongoDB (embedded model) ===');
      await loadMongoEmbedded(categories, products, stores, offers, false);
      await loadMongoEmbedded(categories, products, stores, offers, true);

      console.log('\n=== Loading into MongoDB (referencing model) ===');
      await loadMongoReferencing(categories, products, stores, offers, false);
      await loadMongoReferencing(categories, products, stores, offers, true);
    }
  }
}

const isDirectRun = (() => {
  try {
    if (!process.argv[1]) return false;
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch (_) {
    return true;
  }
})();

if (isDirectRun) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
