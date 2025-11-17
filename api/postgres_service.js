import { Pool } from 'pg';

const postgresPool = new Pool({
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'admin',
    database: process.env.PGDATABASE || 'postgres',
    password: process.env.PGPASSWORD || 'admin',
    port: parseInt(process.env.PGPORT || '5432', 10)
});

export async function getAllProducts(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT * FROM "p_products" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

//-----------------------------------------------
export async function getAllStores(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT * FROM "s_stores" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

export async function getAllStoreNames(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT "name" FROM "s_stores" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

export async function getAllStoreNamesDesc(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT "name" FROM "s_stores" ORDER BY "name" DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

export async function getFilteredStores(limit = 10, offset = 0, filterTerm) {
    const result = await postgresPool.query(`SELECT * FROM "s_stores" WHERE "name" LIKE $1 LIMIT $2 OFFSET $3`, [`%${filterTerm}%`, limit, offset]);
    return result.rows;
}

export async function getFilteredStoreNames(limit = 10, offset = 0, filterTerm) {
    const result = await postgresPool.query(`SELECT "name" FROM "s_stores" WHERE "name" LIKE $1 LIMIT $2 OFFSET $3`, [`%${filterTerm}%`, limit, offset]);
    return result.rows;
}

export async function updateStore(store) {
    const result = await postgresPool.query(`update "s_stores" set "name" = $1, "url"  = $2 where "id" = $3`, [store.name, store.url, store.id]);
    return result.rows;
}

export async function createStore(store) {
    const result = await postgresPool.query(`insert into "s_stores" ("id", "name", "url")  values ($1,$2,$3)`, [store.id, store.name, store.url]);
    return result.rows;
}

export async function deleteStore(id) {
    const result = await postgresPool.query(`delete from "s_stores" where "id" = $1`, [id]);
    return result.rows;
}

export async function deleteStoreWhereUrlLike(term) {
    const result = await postgresPool.query(`delete from "s_stores" where "url" like $1`, [`%${term}%`]);
    return result.rows;
}

export async function getAllStoresWithOfferCount(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT *,(select count(*) from "o_offers" o where o."store_id" = s.id) as "offerCount" FROM "s_stores" s LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}
//-----------------------------------------------
export async function getAllCategories(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT * FROM "pc_product_categories" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}
//-----------------------------------------------
export async function getAllOffers(limit = 10, offset = 0) {
    const result = await postgresPool.query('SELECT * FROM "o_offers" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

export async function createOffer(offer) {
    const result = await postgresPool.query(`insert into "o_offers" ("store_id", "product_id", "price", "amount") values ($1,$2,$3,$4);`,
        [offer.store_id, offer.product_id, offer.price, offer.amount]);

    return result.rows;
}

export async function deleteOffer(store_id, product_id) {
    const result = await postgresPool.query(`delete from "o_offers" where "store_id" == $1 and "product_id" == $2;`, [store_id, product_id]);

    return result.rows;
}

export async function getDataAmount() {
    const result = await postgresPool.query(`select 
       (select count(*) from "o_offers")              as amountOffers,
       (select count(*) from "p_products")            as amountProducts,
       (select count(*) from "pc_product_categories") as amountProductCategories,
       (select count(*) from "s_stores")              as amountStores;`)

    return result.rows;
}


export async function getOffersFromStore(limit = 10, offset = 0, store_id) {

    const sql = `select "store_id",
       "product_id",
       "price",
       "retailPrice",
       "amount",
       "ean",
       "p_products".name as "productName",
       "pc_product_categories".name as "categoryName"
       from "o_offers"
         inner join "p_products" on "p_products".id = "o_offers"."product_id"
         inner join "pc_product_categories" on "p_products"."categoryId" = "pc_product_categories".id
         where store_id = $1
         LIMIT $2
         OFFSET $3`;

    const result = await postgresPool.query(sql, [store_id, limit, offset]);
    return result.rows;
}