// main.js
import express from 'express';
import cors from 'cors';

// POSTGRES (existing)
import {
  getAllProducts as pgGetAllProducts,
  getAllCategories as pgGetAllCategories,
  getAllOffers as pgGetAllOffers,
  getAllStores as pgGetAllStores,
  getAllStoresWithOfferCount as pgGetAllStoresWithOfferCount,
  getOffersFromStore as pgGetOffersFromStore,
} from './postgres_service.js';


// MONGO: embedded + referencing
import * as mongoEmbedded from './mongodb_embedded_service.js';
import * as mongoRef from './mongodb_referencing_service.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/** helper for page/limit */
function getPageLimit(req) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** quick registrar to avoid duplication */
function mountRoutes(prefix, svc) {
  app.get(`${prefix}/products`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const products = await svc.getAllProducts(limit, offset);
    res.json({ page, limit, products });
  });

  app.get(`${prefix}/stores`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getAllStores(limit, offset);
    res.json({ page, limit, stores });
  });

  app.get(`${prefix}/stores/withOfferCount`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getAllStoresWithOfferCount(limit, offset);
    res.json({ page, limit, stores });
  });

  app.get(`${prefix}/offers/fromStore/:id`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const offers = await svc.getOffersFromStore(limit, offset, req.params.id);
    res.json({ page, limit, offers });
  });

  app.get(`${prefix}/categories`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const categories = await svc.getAllCategories(limit, offset);
    res.json({ page, limit, categories });
  });

  app.get(`${prefix}/offers`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const offers = await svc.getAllOffers(limit, offset);
    res.json({ page, limit, offers });
  });
}

// Existing Postgres routes (unchanged)
mountRoutes('/postgres', {
  getAllProducts: pgGetAllProducts,
  getAllCategories: pgGetAllCategories,
  getAllOffers: pgGetAllOffers,
  getAllStores: pgGetAllStores,
  getAllStoresWithOfferCount: pgGetAllStoresWithOfferCount,
  getOffersFromStore: pgGetOffersFromStore,
});

// mountRoutes('/timescale', {
//   getAllProducts: tsGetAllProducts,
//   getAllCategories: tsGetAllCategories,
//   getAllOffers: tsGetAllOffers,
//   getAllStores: tsGetAllStores,
//   getAllStoresWithOfferCount: tsGetAllStoresWithOfferCount,
//   getOffersFromStore: tsGetOffersFromStore,
// });


// New Mongo routes
mountRoutes('/mongo-embedded', mongoEmbedded);
mountRoutes('/mongo-referencing', mongoRef);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
