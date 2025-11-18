import {
    COLL_STORES_EMBEDDED_INDEX,
    COLL_STORES_EMBEDDED_SCHEMA,
    COLL_STORES_EMBEDDED,

    getAllProducts,
    getAllStores,
    getAllStoreNames,
    getAllStoreNamesDesc,
    getFilteredStores,
    getFilteredStoreNames,
    updateStore,
    createStore,
    deleteStore,
    deleteStoreWhereUrlLike,
    getAllStoresWithOfferCount,
    getAllCategories,
    getAllOffers,
    getOffersFromStore
} from "./mongodb_embedded_service.js";


const DB_NAME = 'products_playground'

export const mongo_embedded = {
    getAllProducts: (limit = 10, offset = 0) => getAllProducts(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),
    getAllStores: (limit = 10, offset = 0) => getAllStores(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),
    getAllStoreNames: (limit = 10, offset = 0) => getAllStoreNames(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),
    getAllStoreNamesDesc: (limit = 10, offset = 0) => getAllStoreNamesDesc(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),

    getFilteredStores: (limit = 10, offset = 0, filterTerm) => getFilteredStores(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED),
    getFilteredStoreNames: (limit = 10, offset = 0, filterTerm) => getFilteredStoreNames(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED),

    updateStore: (store) => updateStore(store, DB_NAME, COLL_STORES_EMBEDDED),
    createStore: (store) => createStore(store, DB_NAME, COLL_STORES_EMBEDDED),

    deleteStore: (id) => deleteStore(id, DB_NAME, COLL_STORES_EMBEDDED),

    deleteStoreWhereUrlLike: (term) => deleteStoreWhereUrlLike(term, DB_NAME, COLL_STORES_EMBEDDED),

    getAllStoresWithOfferCount: (limit = 10, offset = 0) => getAllStoresWithOfferCount(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),
    getAllCategories: (limit = 10, offset = 0) => getAllCategories(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),
    getAllOffers: (limit = 10, offset = 0) => getAllOffers(limit, offset, DB_NAME, COLL_STORES_EMBEDDED),

    getOffersFromStore: (limit = 10, offset = 0, storeId) => getOffersFromStore(limit = 10, offset = 0, storeId, DB_NAME, COLL_STORES_EMBEDDED),

}

export const mongo_embedded_index = {
    getAllProducts: (limit = 10, offset = 0) => getAllProducts(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getAllStores: (limit = 10, offset = 0) => getAllStores(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getAllStoreNames: (limit = 10, offset = 0) => getAllStoreNames(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getAllStoreNamesDesc: (limit = 10, offset = 0) => getAllStoreNamesDesc(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    getFilteredStores: (limit = 10, offset = 0, filterTerm) => getFilteredStores(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getFilteredStoreNames: (limit = 10, offset = 0, filterTerm) => getFilteredStoreNames(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    updateStore: (store) => updateStore(store, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    createStore: (store) => createStore(store, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    deleteStore: (id) => deleteStore(id, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    deleteStoreWhereUrlLike: (term) => deleteStoreWhereUrlLike(term, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    getAllStoresWithOfferCount: (limit = 10, offset = 0) => getAllStoresWithOfferCount(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getAllCategories: (limit = 10, offset = 0) => getAllCategories(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),
    getAllOffers: (limit = 10, offset = 0) => getAllOffers(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

    getOffersFromStore: (limit = 10, offset = 0, storeId) => getOffersFromStore(limit = 10, offset = 0, storeId, DB_NAME, COLL_STORES_EMBEDDED_INDEX),

}

export const mongo_embedded_schema = {
    getAllProducts: (limit = 10, offset = 0) => getAllProducts(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getAllStores: (limit = 10, offset = 0) => getAllStores(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getAllStoreNames: (limit = 10, offset = 0) => getAllStoreNames(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getAllStoreNamesDesc: (limit = 10, offset = 0) => getAllStoreNamesDesc(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    getFilteredStores: (limit = 10, offset = 0, filterTerm) => getFilteredStores(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getFilteredStoreNames: (limit = 10, offset = 0, filterTerm) => getFilteredStoreNames(limit, offset, filterTerm, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    updateStore: (store) => updateStore(store, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    createStore: (store) => createStore(store, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    deleteStore: (id) => deleteStore(id, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    deleteStoreWhereUrlLike: (term) => deleteStoreWhereUrlLike(term, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    getAllStoresWithOfferCount: (limit = 10, offset = 0) => getAllStoresWithOfferCount(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getAllCategories: (limit = 10, offset = 0) => getAllCategories(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),
    getAllOffers: (limit = 10, offset = 0) => getAllOffers(limit, offset, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

    getOffersFromStore: (limit = 10, offset = 0, storeId) => getOffersFromStore(limit = 10, offset = 0, storeId, DB_NAME, COLL_STORES_EMBEDDED_SCHEMA),

}