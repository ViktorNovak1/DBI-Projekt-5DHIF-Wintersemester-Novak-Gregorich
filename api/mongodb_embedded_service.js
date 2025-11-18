// mongodb_embedded_service.js
import { getClient, ObjectId } from './mongodb_client.js';

export const COLL_STORES_EMBEDDED = process.env.MONGO_COLL_STORES_EMBEDDED || 's_stores_embedded';
export const COLL_STORES_EMBEDDED_INDEX = 's_stores_embedded_index';
export const COLL_STORES_EMBEDDED_SCHEMA = 's_stores_embedded_schema';

function paginate(offset, limit) { return [{ $skip: offset }, { $limit: limit }]; }


export async function getAllProducts(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $unwind: { path: '$offers', preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: {
          id: { $ifNull: ['$offers.product.id', '$offers.productId'] },
          name: '$offers.product.name',
          catId: '$offers.product.category.id',
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: {
          $cond: [
            { $ne: ['$_id.id', null] },
            { $toString: '$_id.id' },
            { $concat: ['derived_', '$_id.name'] },
          ],
        },
        name: '$_id.name',
        categoryId: { $cond: [{ $ne: ['$_id.catId', null] }, { $toString: '$_id.catId' }, null] },
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}

/** STORES */
export async function getAllStores(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, id: { $toString: '$id' }, name: 1, url: 1 } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllStoreNames(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, name: 1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function getAllStoreNamesDesc(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, name: 1 } },
    { $sort: { name: -1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function getFilteredStores(limit = 10, offset = 0, filterTerm, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $match: { name: `/${filterTerm}/` } }, //eben ohne sanitization
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getFilteredStoreNames(limit = 10, offset = 0, filterTerm, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, name: 1 } },
    { $match: { name: new RegExp(filterTerm) } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function updateStore(store, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .updateOne({ id: store.id }, { $set: { name: store.name, url: store.url } });
}

export async function createStore(store, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).
    insertOne({ id: store.id, name: store.name, url: store.url, offers: [] });
}

export async function deleteStore(id, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .deleteOne({ id: id });
}

export async function deleteStoreWhereUrlLike(term, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .deleteOne({ url: `/${term}/` });
}


export async function getAllStoresWithOfferCount(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    {
      $project: {
        _id: 0,
        id: { $toString: '$id' },
        name: 1,
        url: 1,
        offercount: { $size: { $ifNull: ['$offers', []] } }, // matches frontend field
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}

/** CATEGORIES (derive from embedded offers) */
export async function getAllCategories(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $unwind: '$offers' },
    { $project: { cat: '$offers.product.category' } },
    { $match: { cat: { $ne: null } } },
    { $group: { _id: { id: '$cat.id', name: '$cat.name' } } },
    {
      $project: {
        _id: 0,
        id: { $cond: [{ $ne: ['$_id.id', null] }, { $toString: '$_id.id' }, { $concat: ['derived_', '$_id.name'] }] },
        name: '$_id.name',
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}

/** OFFERS (flatten) */
export async function getAllOffers(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $unwind: '$offers' },
    {
      $project: {
        _id: 0,
        storeId: { $toString: '$_id' },
        productId: { $toString: { $ifNull: ['$offers.product.id', '$offers.productId'] } },
        price: '$offers.price',
        retailPrice: '$offers.retailPrice',
        amount: '$offers.amount',
        ean: '$offers.ean',
        productName: '$offers.product.name',
        categoryName: '$offers.product.category.name',
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getOffersFromStore(limit = 10, offset = 0, storeId, dbName, collectionName) {
  const client = await getClient();
  const _id = new ObjectId(storeId);
  return client.db(dbName).collection(collectionName).aggregate([
    { $match: { _id } },
    { $unwind: '$offers' },
    {
      $project: {
        _id: 0,
        storeId: { $toString: '$_id' },
        productId: { $toString: { $ifNull: ['$offers.product.id', '$offers.productId'] } },
        price: '$offers.price',
        retailPrice: '$offers.retailPrice',
        amount: '$offers.amount',
        ean: '$offers.ean',
        productName: { $ifNull: ['$offers.product.name', '$offers.productName'] },
        categoryName: { $ifNull: ['$offers.product.category.name', '$offers.categoryName'] },
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}
