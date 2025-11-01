#!/usr/bin/env python3
"""
Faker-based data generator + loader for:
- PostgreSQL 17 (tables: pc_product_categories, p_products, s_stores, o_offers)
- MongoDB 7   (collections with the same names and unique indexes)

Defaults assume Docker containers are mapped to localhost:
  Postgres: postgres://admin:admin@localhost:5432/postgres
  MongoDB : mongodb://admin:admin@localhost:27017 (authSource=admin)

You can override via env vars:
  PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
  MONGODB_URI, MONGODB_DB

Requires: psycopg2-binary, pymongo, faker
    pip install psycopg2-binary pymongo faker
"""

import os
import random
import uuid
import argparse
from dataclasses import dataclass
from typing import List, Tuple

from faker import Faker

# ---------- Configuration (env-overridable) ----------
PGHOST = os.getenv("PGHOST", "localhost")
PGPORT = int(os.getenv("PGPORT", "5432"))
PGDATABASE = os.getenv("PGDATABASE", "postgres")
PGUSER = os.getenv("PGUSER", "admin")
PGPASSWORD = os.getenv("PGPASSWORD", "admin")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
MONGODB_DB = os.getenv("MONGODB_DB", "products_playground")

# Defaults (can be overridden by CLI)
DEFAULT_N_CATEGORIES = 10
DEFAULT_N_STORES = 6
DEFAULT_N_PRODUCTS = 200
DEFAULT_N_OFFERS = 500  # total number of rows in o_offers

fake = Faker()

# ---------- EAN-13 generation (valid checksum) ----------
def ean13() -> str:
    digits = [random.randint(0, 9) for _ in range(12)]
    sum_odd = sum(digits[i] for i in range(0, 12, 2))
    sum_even = sum(digits[i] for i in range(1, 12, 2))
    checksum = (10 - ((sum_odd + 3 * sum_even) % 10)) % 10
    return "".join(map(str, digits + [checksum]))

# ---------- Data models ----------
@dataclass
class Category:
    id: uuid.UUID
    name: str

@dataclass
class Product:
    id: uuid.UUID
    categoryId: uuid.UUID
    ean: str
    name: str
    retailPrice: float

@dataclass
class Store:
    id: uuid.UUID
    name: str
    url: str

@dataclass
class Offer:
    storeId: uuid.UUID
    productId: uuid.UUID
    price: float
    amount: int

# ---------- Fake data generation ----------
def generate_data(n_categories: int,
                  n_products: int,
                  n_stores: int,
                  n_offers: int) -> Tuple[List[Category], List[Product], List[Store], List[Offer]]:

    # Basic sanity checks so we don't create impossible combos
    if n_categories < 1 and n_products > 0:
        raise ValueError("Cannot create products without at least 1 category. Increase --categories or set --products 0.")
    if (n_stores == 0 or n_products == 0) and n_offers > 0:
        print("[WARN] Offers requested but either stores or products is 0; setting offers to 0.")
        n_offers = 0

    # Categories
    categories: List[Category] = []
    used_cat_names = set()
    while len(categories) < n_categories:
        name = fake.unique.word().title()[:64]
        if name not in used_cat_names:
            categories.append(Category(id=uuid.uuid4(), name=name))
            used_cat_names.add(name)

    # Products
    products: List[Product] = []
    used_eans = set()
    for _ in range(n_products):
        cat = random.choice(categories) if categories else None
        pname = f"{fake.company()} {fake.color_name()} {fake.word()}".title()[:64]
        retail = round(random.uniform(2.5, 999.99), 2)
        e = ean13()
        while e in used_eans:
            e = ean13()
        used_eans.add(e)
        products.append(Product(
            id=uuid.uuid4(),
            categoryId=cat.id if cat else uuid.uuid4(),  # should not happen due to check above
            ean=e,
            name=pname,
            retailPrice=float(retail),
        ))

    # Stores
    stores: List[Store] = []
    used_store_names = set()
    used_urls = set()
    while len(stores) < n_stores:
        sname = f"{fake.company()} Store"[:64]
        url = f"https://{fake.domain_name()}/{fake.slug()}"[:128]
        if sname not in used_store_names and url not in used_urls:
            stores.append(Store(id=uuid.uuid4(), name=sname, url=url))
            used_store_names.add(sname)
            used_urls.add(url)

    # Offers (exact count)
    offers: List[Offer] = []
    if n_offers > 0 and stores and products:
        # All possible (store, product) pairs without duplicates (respecting PK (storeId, productId))
        all_pairs = [(s.id, p.id, p.retailPrice) for s in stores for p in products]
        max_possible = len(all_pairs)
        if n_offers > max_possible:
            print(f"[WARN] Requested {n_offers} offers, but only {max_possible} unique (store, product) pairs exist. Capping to {max_possible}.")
            n_offers = max_possible

        # Sample exactly n_offers unique pairs
        sampled = random.sample(all_pairs, n_offers)
        for store_id, product_id, base_price in sampled:
            price = round(base_price * random.uniform(0.6, 1.2), 2)
            amount = random.randint(0, 250)
            offers.append(Offer(storeId=store_id, productId=product_id, price=float(price), amount=amount))

    return categories, products, stores, offers

# ---------- PostgreSQL load (cleanup + insert) ----------
def load_postgres(categories: List[Category], products: List[Product], stores: List[Store], offers: List[Offer]) -> None:
    import psycopg2
    from psycopg2.extras import execute_values, register_uuid

    # Register UUID adapter globally so psycopg2 can handle Python uuid.UUID
    register_uuid()

    conn = None
    try:
        conn = psycopg2.connect(
            host=PGHOST,
            port=PGPORT,
            dbname=PGDATABASE,
            user=PGUSER,
            password=PGPASSWORD,
        )
        print(f"[PostgreSQL] Connection successful to {PGUSER}@{PGHOST}:{PGPORT}/{PGDATABASE}")
    except Exception as e:
        print(f"[PostgreSQL] Connection FAILED: {e}")
        return

    try:
        with conn:
            with conn.cursor() as cur:
                # Ensure schema exists
                cur.execute("""
                create table if not exists pc_product_categories
                (
                    id   uuid primary key,
                    name varchar(64) unique not null
                );
                """)
                cur.execute("""
                create table if not exists p_products
                (
                    id          uuid primary key,
                    categoryId  uuid               not null references pc_product_categories(id),
                    ean         varchar(13) unique not null,
                    name        varchar(64)        not null,
                    retailPrice real               not null
                );
                """)
                cur.execute("""
                create table if not exists s_stores
                (
                    id   uuid primary key,
                    name varchar(64) unique  not null,
                    url  varchar(128) unique not null
                );
                """)
                cur.execute("""
                create table if not exists o_offers
                (
                    storeId   uuid    not null references s_stores (id),
                    productId uuid    not null references p_products (id),
                    price     real    not null,
                    amount    integer not null,
                    primary key (storeId, productId)
                );
                """)

                # --- CLEANUP: wipe all rows (FK-safe)
                cur.execute("TRUNCATE o_offers, p_products, s_stores, pc_product_categories RESTART IDENTITY CASCADE;")
                print("[PostgreSQL] Cleanup done (tables truncated).")

                # Inserts with ON CONFLICT DO NOTHING to keep it idempotent
                execute_values(cur,
                    "insert into pc_product_categories (id, name) values %s on conflict (id) do nothing",
                    [(c.id, c.name) for c in categories]
                )
                execute_values(cur,
                    "insert into p_products (id, categoryId, ean, name, retailPrice) values %s "
                    "on conflict (id) do nothing",
                    [(p.id, p.categoryId, p.ean, p.name, p.retailPrice) for p in products]
                )
                execute_values(cur,
                    "insert into s_stores (id, name, url) values %s on conflict (id) do nothing",
                    [(s.id, s.name, s.url) for s in stores]
                )
                execute_values(cur,
                    "insert into o_offers (storeId, productId, price, amount) values %s "
                    "on conflict (storeId, productId) do nothing",
                    [(o.storeId, o.productId, o.price, o.amount) for o in offers]
                )

                # Simple counts
                cur.execute("select count(*) from pc_product_categories"); cat_count = cur.fetchone()[0]
                cur.execute("select count(*) from p_products"); prod_count = cur.fetchone()[0]
                cur.execute("select count(*) from s_stores"); store_count = cur.fetchone()[0]
                cur.execute("select count(*) from o_offers"); offer_count = cur.fetchone()[0]

                print(f"[PostgreSQL] Rows now in DB — categories:{cat_count} products:{prod_count} stores:{store_count} offers:{offer_count}")

    except Exception as e:
        print(f"[PostgreSQL] ERROR while creating/inserting: {e}")
    finally:
        if conn:
            conn.close()


# ---------- MongoDB load (cleanup + embedded insert) ----------
def load_mongodb(categories: List[Category], products: List[Product], stores: List[Store], offers: List[Offer]) -> None:
    from pymongo import MongoClient, errors

    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("[MongoDB] Connection successful.")
    except Exception as e:
        print(f"[MongoDB] Connection FAILED: {e}")
        return

    db = client[MONGODB_DB]

    # --- CLEANUP: drop target + legacy collections if present
    try:
        existing = set(db.list_collection_names())
        to_drop = {"s_stores", "pc_product_categories", "p_products", "o_offers"} & existing
        for name in to_drop:
            db[name].drop()
        print(f"[MongoDB] Cleanup done (dropped collections: {', '.join(to_drop) if to_drop else 'none'}).")
    except Exception as e:
        print(f"[MongoDB] Cleanup warning: {e}")

    col_store = db["s_stores"]  # single collection with embedded offers

    # Helpful indexes
    try:
        col_store.create_index([("id", 1)], unique=True)
        col_store.create_index([("name", 1)], unique=True)
        col_store.create_index([("url", 1)], unique=True)
        # Prevent duplicate product offers per store
        col_store.create_index([("id", 1), ("offers.product.id", 1)], unique=True, sparse=True)
    except Exception as e:
        print(f"[MongoDB] Index creation warning: {e}")

    # Build lookups
    cat_by_id = {c.id: c.name for c in categories}
    prod_by_id = {p.id: p for p in products}

    # Group offers by store
    offers_by_store: dict[str, list[Offer]] = {}
    for o in offers:
        key = str(o.storeId)
        offers_by_store.setdefault(key, []).append(o)

    # Prepare store docs with embedded offers and insert
    docs = []
    for s in stores:
        s_key = str(s.id)
        embedded_offers = []
        for o in offers_by_store.get(s_key, []):
            p = prod_by_id.get(o.productId)
            if not p:
                continue
            embedded_offers.append({
                "product": {
                    "id": str(p.id),
                    "category": cat_by_id.get(p.categoryId, "Unknown"),
                    "ean": p.ean,
                    "name": p.name,
                    "retailPrice": float(p.retailPrice),
                },
                "price": float(o.price),
                "amount": int(o.amount),
            })
        docs.append({
            "id": s_key,
            "name": s.name,
            "url": s.url,
            "offers": embedded_offers,
        })

    inserted = 0
    try:
        if docs:
            res = col_store.insert_many(docs, ordered=False)
            inserted = len(res.inserted_ids)
    except errors.BulkWriteError as bwe:
        print(f"[MongoDB] Bulk insert warning: {bwe.details}")
        inserted = bwe.details.get("nInserted", 0)
    except Exception as e:
        print(f"[MongoDB] Error inserting stores: {e}")

    # Final counts
    try:
        store_count = col_store.count_documents({})
        pipeline = [{"$unwind": {"path": "$offers", "preserveNullAndEmptyArrays": False}}, {"$count": "n"}]
        aggr = list(col_store.aggregate(pipeline))
        total_offers = aggr[0]["n"] if aggr else 0
        print(f"[MongoDB] Inserts — stores inserted:{inserted}")
        print(f"[MongoDB] Docs now in DB — stores:{store_count} offers:{total_offers}")
    except Exception as e:
        print(f"[MongoDB] Count/Aggregation error: {e}")
    finally:
        client.close()


# ---------- CLI ----------
def parse_args():
    p = argparse.ArgumentParser(description="Generate and load fake product data into Postgres and MongoDB.")
    p.add_argument("--seed", type=int, default=None,
                   help="Random seed for reproducible data. If set, both DBs receive exactly the same data across runs.")
    p.add_argument("--categories", type=int, default=DEFAULT_N_CATEGORIES, help="Number of categories.")
    p.add_argument("--products", type=int, default=DEFAULT_N_PRODUCTS, help="Number of products.")
    p.add_argument("--stores", type=int, default=DEFAULT_N_STORES, help="Number of stores.")
    p.add_argument("--offers", type=int, default=DEFAULT_N_OFFERS,
                   help="Total number of offers rows (unique (storeId, productId) pairs).")
    p.add_argument("--only-postgres", action="store_true", help="Load only into PostgreSQL.")
    p.add_argument("--only-mongodb", action="store_true", help="Load only into MongoDB.")
    return p.parse_args()

# ---------- Main ----------
def main():
    args = parse_args()

    # Seed both Faker and Python's random for reproducibility when requested
    if args.seed is not None:
        print(f"Seeding RNG with {args.seed} for reproducible output...")
        Faker.seed(args.seed)
        random.seed(args.seed)

    print("Generating fake data...")
    categories, products, stores, offers = generate_data(
        n_categories=args.categories,
        n_products=args.products,
        n_stores=args.stores,
        n_offers=args.offers
    )
    print(f"Generated: {len(categories)} categories, {len(products)} products, {len(stores)} stores, {len(offers)} offers")

    # Decide targets
    load_pg = True
    load_mongo = True
    if args.only_postgres and args.only_mongodb:
        print("Both --only-postgres and --only-mongodb were given; loading into BOTH.")
    elif args.only_postgres:
        load_mongo = False
    elif args.only_mongodb:
        load_pg = False

    if load_pg:
        print("\n=== Loading into PostgreSQL ===")
        load_postgres(categories, products, stores, offers)

    if load_mongo:
        print("\n=== Loading into MongoDB ===")
        load_mongodb(categories, products, stores, offers)

if __name__ == "__main__":
    main()
