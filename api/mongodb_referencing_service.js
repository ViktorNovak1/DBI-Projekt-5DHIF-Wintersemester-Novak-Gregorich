// mongodb_referencing_service.js
import { getReferencingDb, ObjectId } from './mongodb_client.js';

const COLL_STORES = process.env.MONGO_COLL_STORES_REFERENCING || 's_stores_referencing';
const COLL_OFFERS = process.env.MONGO_COLL_OFFERS_REFERENCING || 'o_offers_referencing';
const COLL_PRODUCTS = process.env.MONGO_COLL_PRODUCTS_REFERENCING || 'p_products_referencing';
const COLL_CATEGORIES = process.env.MONGO_COLL_CATEGORIES_REFERENCING || 'pc_product_categories_referencing';

function paginate(offset, limit) { return [{ $skip: offset }, { $limit: limit }]; }

export async function getAllProducts(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_PRODUCTS).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1, categoryId: { $toString: '$categoryId' } } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllStores(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1, url: 1 } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllStoreNames(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).aggregate([
    { $project: { _id: 0, name: 1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function getAllStoreNamesDesc(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).aggregate([
    { $project: { _id: 0, name: 1 } },
    { $sort: { name: -1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function getFilteredStores(limit = 10, offset = 0, filterTerm) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).aggregate([
    { $match: { name: `/${filterTerm}/` } }, //eben ohne sanitization
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getFilteredStoreNames(limit = 10, offset = 0, filterTerm) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).aggregate([
    { $project: { _id: 0, name: 1 } },
    { $match: { name: `/${filterTerm}/` } },
    { $sort: { name: -1 } },
    ...paginate(offset, limit)
  ]).toArray();
}

export async function updateStore(store) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES)
    .updateOne({ id: store.id }, { $set: { name: store.name, url: store.url } });
}

export async function createStore(store) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES).
    insertOne({ id: store.id, name: store.name, url: store.url, offers: [] });
}

export async function deleteStore(id) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES)
    .deleteOne({ id: id });
}

export async function deleteStoreWhereUrlLike(term) {
  const db = await getReferencingDb();
  return db.collection(COLL_STORES)
    .deleteOne({ url: `/${term}/` });
}


export async function getAllStoresWithOfferCount(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_OFFERS).aggregate([
    { $group: { _id: "$store_id", offerCount: { $sum: 1 } } },
    {
      $lookup: {
        from: "s_stores_referencing",
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

export async function getAllCategories(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_CATEGORIES).aggregate([
    { $project: { _id: 0, id: { $toString: '$_id' }, name: 1 } },
    ...paginate(offset, limit),
  ]).toArray();
}

export async function getAllOffers(limit = 10, offset = 0) {
  const db = await getReferencingDb();
  return db.collection(COLL_OFFERS).aggregate([
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

export async function getOffersFromStore(limit = 10, offset = 0, storeId) {
  const db = await getReferencingDb();
  const storeObjectId = new ObjectId(storeId);
  return db.collection(COLL_OFFERS).aggregate([
    { $match: { storeId: storeObjectId } },
    { $lookup: { from: COLL_PRODUCTS, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $lookup: { from: COLL_CATEGORIES, localField: 'product.categoryId', foreignField: '_id', as: 'category' } },
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
