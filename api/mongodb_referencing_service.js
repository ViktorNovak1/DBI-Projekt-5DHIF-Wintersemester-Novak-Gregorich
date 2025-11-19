// mongodb_referencing_service.js
import { getClient, ObjectId } from './mongodb_client.js';

export const COLL_STORES_REF = process.env.MONGO_COLL_STORES_REFERENCING || 's_stores_referencing';
export const COLL_OFFERS_REF = process.env.MONGO_COLL_OFFERS_REFERENCING || 'o_offers_referencing';
export const COLL_PRODUCTS_REF = process.env.MONGO_COLL_PRODUCTS_REFERENCING || 'p_products_referencing';
export const COLL_CATEGORIES_REF = process.env.MONGO_COLL_CATEGORIES_REFERENCING || 'pc_product_categories_referencing';

export const COLL_STORES_REF_INDEX = 's_stores_referencing_index';
export const COLL_OFFERS_REF_INDEX = 'o_offers_referencing_index';
export const COLL_PRODUCTS_REF_INDEX = 'p_products_referencing_index';
export const COLL_CATEGORIES_REF_INDEX = 'pc_product_categories_referencing_index';

function paginate(offset, limit) { return [{ $skip: offset }, { $limit: limit }]; }

export async function getAllProducts(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1, categoryId: { $toString: '$categoryId' } } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllStores(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1, url: 1 } },
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
    { $match: { name: new RegExp(filterTerm) } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getFilteredStoreNames(limit = 10, offset = 0, filterTerm, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, name: 1 } },
    { $match: { name: new RegExp(filterTerm) } },
    { $sort: { name: -1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function updateStore(store, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .updateOne({ _id: store.id }, { $set: { name: store.name, url: store.url } });
}

export async function createStore(store, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).
    insertOne({ id: store.id, name: store.name, url: store.url, offers: [] });
}

export async function deleteStore(id, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .deleteOne({ _id: id });
}

export async function deleteStoreWhereUrlLike(term, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName)
    .deleteOne({ url: new RegExp(term) });
}


export async function getAllStoresWithOfferCount(limit = 10, offset = 0, dbName, collectionName, storesCollectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $group: { _id: "$store_id", offerCount: { $sum: 1 } } },
    {
      $lookup: {
        from: storesCollectionName,
        localField: "_id",
        foreignField: "_id",
        as: "store"
      }
    }, { $unwind: '$store' },
    { $project: { _id: 0, id: "$_id", offercount: "$offerCount", name: "$store.name", url: "$store.url" } },
    { $sort: { id: 1 } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllCategories(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1 } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllOffers(limit = 10, offset = 0, dbName, collectionName) {
  const client = await getClient();
  return client.db(dbName).collection(collectionName).aggregate([
    {
      $project: {
        _id: 0,
        storeId: { $toString: '$storeId' },
        productId: { $toString: '$productId' },
        price: 1, retailPrice: 1, amount: 1, ean: 1,
      }
    },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getOffersFromStore(limit = 10, offset = 0, storeId, dbName, collectionName, collectionNameProducts, collectionNameCategories) {
  const client = await getClient();
  const storeObjectId = new ObjectId(storeId);
  return client.db(dbName).collection(collectionName).aggregate([
    { $match: { storeId: storeObjectId } },
    { $lookup: { from: collectionNameProducts, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $lookup: { from: collectionNameCategories, localField: 'product.categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    {
      $project: {
        _id: 0,
        storeId: { $toString: '$storeId' },
        productId: { $toString: '$productId' },
        price: 1, retailPrice: 1, amount: 1, ean: 1,
        productName: '$product.name',
        categoryName: '$category.name',
      },
    },
    ...paginate(offset, limit),
  ]).toArray();
}
