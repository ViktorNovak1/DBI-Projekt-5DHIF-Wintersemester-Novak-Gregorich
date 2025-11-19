import {
    COLL_STORES_REF,


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
    getOffersFromStore,
    COLL_PRODUCTS_REF,
    COLL_CATEGORIES_REF,
    COLL_STORES_REF_INDEX,
    COLL_PRODUCTS_REF_INDEX,
    COLL_CATEGORIES_REF_INDEX,
    COLL_OFFERS_REF,
    COLL_OFFERS_REF_INDEX
} from "./mongodb_referencing_service.js";

const DB_NAME = 'products_playground'

export const mongo_referencing = {
    getAllProducts: (limit = 10, offset = 0) => getAllProducts(limit, offset, DB_NAME, COLL_STORES_REF),
    getAllStores: (limit = 10, offset = 0) => getAllStores(limit, offset, DB_NAME, COLL_STORES_REF),
    getAllStoreNames: (limit = 10, offset = 0) => getAllStoreNames(limit, offset, DB_NAME, COLL_STORES_REF),
    getAllStoreNamesDesc: (limit = 10, offset = 0) => getAllStoreNamesDesc(limit, offset, DB_NAME, COLL_STORES_REF),

    getFilteredStores: (limit = 10, offset = 0, filterTerm) => getFilteredStores(limit, offset, filterTerm, DB_NAME, COLL_STORES_REF),
    getFilteredStoreNames: (limit = 10, offset = 0, filterTerm) => getFilteredStoreNames(limit, offset, filterTerm, DB_NAME, COLL_STORES_REF),

    updateStore: (store) => updateStore(store, DB_NAME, COLL_STORES_REF),
    createStore: (store) => createStore(store, DB_NAME, COLL_STORES_REF),

    deleteStore: (id) => deleteStore(id, DB_NAME, COLL_STORES_REF),

    deleteStoreWhereUrlLike: (term) => deleteStoreWhereUrlLike(term, DB_NAME, COLL_STORES_REF),

    getAllStoresWithOfferCount: (limit = 10, offset = 0) => getAllStoresWithOfferCount(limit, offset, DB_NAME, COLL_OFFERS_REF, COLL_STORES_REF),
    getAllCategories: (limit = 10, offset = 0) => getAllCategories(limit, offset, DB_NAME, COLL_STORES_REF),
    getAllOffers: (limit = 10, offset = 0) => getAllOffers(limit, offset, DB_NAME, COLL_STORES_REF),

    getOffersFromStore: (limit = 10, offset = 0, storeId) => getOffersFromStore(limit = 10, offset = 0, storeId, DB_NAME, COLL_STORES_REF, COLL_PRODUCTS_REF, COLL_CATEGORIES_REF),
}

export const mongo_referencing_index = {
    getAllProducts: (limit = 10, offset = 0) => getAllProducts(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),
    getAllStores: (limit = 10, offset = 0) => getAllStores(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),
    getAllStoreNames: (limit = 10, offset = 0) => getAllStoreNames(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),
    getAllStoreNamesDesc: (limit = 10, offset = 0) => getAllStoreNamesDesc(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),

    getFilteredStores: (limit = 10, offset = 0, filterTerm) => getFilteredStores(limit, offset, filterTerm, DB_NAME, COLL_STORES_REF_INDEX),
    getFilteredStoreNames: (limit = 10, offset = 0, filterTerm) => getFilteredStoreNames(limit, offset, filterTerm, DB_NAME, COLL_STORES_REF_INDEX),

    updateStore: (store) => updateStore(store, DB_NAME, COLL_STORES_REF_INDEX),
    createStore: (store) => createStore(store, DB_NAME, COLL_STORES_REF_INDEX),

    deleteStore: (id) => deleteStore(id, DB_NAME, COLL_STORES_REF_INDEX),

    deleteStoreWhereUrlLike: (term) => deleteStoreWhereUrlLike(term, DB_NAME, COLL_STORES_REF_INDEX),

    getAllStoresWithOfferCount: (limit = 10, offset = 0) => getAllStoresWithOfferCount(limit, offset, DB_NAME, COLL_OFFERS_REF_INDEX, COLL_STORES_REF_INDEX),
    getAllCategories: (limit = 10, offset = 0) => getAllCategories(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),
    getAllOffers: (limit = 10, offset = 0) => getAllOffers(limit, offset, DB_NAME, COLL_STORES_REF_INDEX),

    getOffersFromStore: (limit = 10, offset = 0, storeId) => getOffersFromStore(limit = 10, offset = 0, storeId, DB_NAME, COLL_STORES_REF_INDEX, COLL_PRODUCTS_REF_INDEX, COLL_CATEGORIES_REF_INDEX),
}