// mongodb_client.js
import { MongoClient, ObjectId } from 'mongodb';

const {
  MONGODB_URI,                    // e.g. mongodb://admin:admin@localhost:27017/?authSource=admin
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_AUTH_SOURCE = 'admin',
  MONGO_HOST = 'localhost',
  MONGO_PORT = '27017',
  // You have a single DB with both models inside:
  MONGO_DB_EMBEDDED = 'products_playground',
  MONGO_DB_REFERENCING = 'products_playground',
} = process.env;

// Build a URI if not provided
const uri =
  MONGODB_URI ??
  `mongodb://${MONGO_HOST}:${MONGO_PORT}`;

const client = new MongoClient(uri,{
  maxPoolSize: 20,
  socketTimeoutMS: 3000,
  connectTimeoutMS: 3000,
});

let ready;
async function ensureConnected() {
  if (!ready) {
    ready = (async () => {
      await client.connect();
      // fail fast if creds are wrong
      await client.db('admin').command({ ping: 1 });
      console.log('[mongo] connected');
    })();
  }
  return ready;
}

export async function getClient() {
  await ensureConnected();
  return client;
}

export async function getEmbeddedDb() {
  await ensureConnected();
  return client.db(MONGO_DB_EMBEDDED);
}
export async function getReferencingDb() {
  await ensureConnected();
  return client.db(MONGO_DB_REFERENCING);
}

export { ObjectId };
