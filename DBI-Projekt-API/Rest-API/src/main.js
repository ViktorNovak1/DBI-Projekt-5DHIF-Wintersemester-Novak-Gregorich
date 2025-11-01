import express from 'express';
import cors from 'cors';
import { getAllProducts, getAllCategories, getAllOffers, getAllStores, getAllStoresWithOfferCount, getOffersFromStore } from './postgres_service.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

// Products
app.get('/postgres/products', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const products = await getAllProducts(limit, offset);

    res.json({
        page,
        limit,
        products
    });
});

app.get('/postgres/stores', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const stores = await getAllStores(limit, offset);

    res.json({
        page,
        limit,
        stores
    });
});

app.get('/postgres/stores/withOfferCount', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const stores = await getAllStoresWithOfferCount(limit, offset);

    res.json({
        page,
        limit,
        stores
    });
});

app.get('/postgres/offers/fromStore/:id', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const offers = await getOffersFromStore(limit, offset, req.params.id);

    res.json({
        page,
        limit,
        offers
    });
});

app.get('/postgres/categories', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const categories = await getAllCategories(limit, offset);

    res.json({
        page,
        limit,
        categories
    });
});

app.get('/postgres/offers', async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const offset = (page - 1) * limit;

    const offers = await getAllOffers(limit, offset);

    res.json({
        page,
        limit,
        offers
    });
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});