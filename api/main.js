// main.js
import express from 'express';
import cors from 'cors';




import * as mongoEmbedded from './mongodb_embedded_service.js';
import * as mongoRef from './mongodb_referencing_service.js';
import * as pg from './postgres_service.js';

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

  app.get(`${prefix}/stores/names`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getAllStoreNames(limit, offset);
    res.json({ page, limit, stores });
  });

  app.get(`${prefix}/stores/namesDesc`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getAllStoreNamesDesc(limit, offset);
    res.json({ page, limit, stores });
  });

  app.get(`${prefix}/stores/filteredName/:filterTerm`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getFilteredStores(limit, offset, req.params.filterTerm);
    res.json({ page, limit, stores });
  });

  app.get(`${prefix}/stores/filteredNameProjection/:filterTerm`, async (req, res) => {
    const { page, limit, offset } = getPageLimit(req);
    const stores = await svc.getFilteredStoreNames(limit, offset, req.params.filterTerm);
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


  app.put(`${prefix}/stores/:id`, async (req, res) => {

    const body = req.body;

    const store = {
      id: req.params.id,
      url: body.url,
      name: body.name,
    };

    const result = await svc.updateStore(store);
    res.json(result);
  });

  app.delete(`${prefix}/stores/:id`, async (req, res) => {
    const result = await svc.deleteStore(req.params.id);
    res.json(result);
  });

  app.delete(`${prefix}/stores/url/:term`, async (req, res) => {
    const result = await svc.deleteStoreWhereUrlLike(req.params.term);
    res.json(result);
  });

  app.post(`${prefix}/stores`, async (req, res) => {
    const body = req.body;

    const store = {
      id: body.id,
      url: body.url,
      name: body.name,
    };

    const result = await svc.createStore(store);
    res.json(result);
  });
}


mountRoutes('/postgres', pg);


mountRoutes('/mongo-embedded', mongoEmbedded);
mountRoutes('/mongo-referencing', mongoRef);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
