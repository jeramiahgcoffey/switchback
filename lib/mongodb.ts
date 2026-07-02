/**
 * Shared MongoClient singleton.
 *
 * Follows the official Next.js `with-mongodb` pattern: in development a single
 * client is cached on `globalThis` so Hot Module Replacement doesn't open a new
 * connection pool on every edit; in production a fresh client per server
 * instance. The client connects lazily (on first operation), so importing this
 * module never blocks startup and never fails just because Atlas is unreachable.
 */
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = { appName: "switchback" };

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };
  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  client = new MongoClient(uri, options);
}

export default client;
