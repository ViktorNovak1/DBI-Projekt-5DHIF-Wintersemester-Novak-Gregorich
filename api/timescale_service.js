import { Pool } from 'pg';

const timescalePool = new Pool({
    host: process.env.TIMESCALE_HOST || 'localhost',
    user: process.env.TIMESCALE_USER || 'admin',
    database: process.env.TIMESCALE_DATABASE || 'postgres',
    password: process.env.TIMESCALE_PASSWORD || 'admin',
    port: parseInt(process.env.TIMESCALE_PORT || '5432', 10)
});



export async function getAllProducts(limit = 10, offset = 0) {
    const result = await timescalePool.query('SELECT * FROM "p_products" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

//-----------------------------------------------
export async function getAllStores(limit = 10, offset = 0) {
    const result = await timescalePool.query('SELECT * FROM "s_stores" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}

export async function getAllStoresWithOfferCount(limit = 10, offset = 0) {
    const result = await timescalePool.query('SELECT *,(select count(*) from "o_offers" o where o."store_id" = s.id) as "offerCount" FROM "s_stores" s LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}
//-----------------------------------------------
export async function getAllCategories(limit = 10, offset = 0) {
    const result = await timescalePool.query('SELECT * FROM "pc_product_categories" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}
//-----------------------------------------------
export async function getAllOffers(limit = 10, offset = 0) {
    const result = await timescalePool.query('SELECT * FROM "o_offers" LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
}


export async function getOffersFromStore(limit = 10, offset = 0, store_id) {

    const sql = `select "store_id",
       "product_id",
       "price",
       "retailPrice",
       "amount",
       "ean",
       "p_products"."name" as productName,
       "pc_product_categories"."name" as categoryName
       from "o_offers"
         inner join "p_products" on "p_products".id = "o_offers"."product_id"
         inner join "pc_product_categories" on "p_products"."categoryId" = "pc_product_categories".id
         where store_id = $1
         LIMIT $2
         OFFSET $3`;




    const result = await timescalePool.query(sql, [store_id, limit, offset]);
    return result.rows;
}

export async function createOffer(offer) {
    const result = await timescalePool.query(`insert into "o_offers" ("store_id", "product_id", "price", "amount") values ($1,$2,$3,$4);`,
        [offer.store_id, offer.product_id, offer.price, offer.amount]);

    return result.rows;
}

export async function deleteOffer(store_id, product_id) {
    const result = await timescalePool.query(`delete from "o_offers" where "store_id" == $1 and "product_id" == $2;`, [store_id, product_id]);

    return result.rows;
}

export async function getDataAmount() {
    const result = await timescalePool.query(`select 
       (select count(*) from "o_offers")              as amountOffers,
       (select count(*) from "p_products")            as amountProducts,
       (select count(*) from "pc_product_categories") as amountProductCategories,
       (select count(*) from "s_stores")              as amountStores;`)

    return result.rows;
}