import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { ENV } from "../config/env";

// Ensure DATABASE_URL exists
if (!ENV.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Create PostgreSQL connection pool
const dbConnectionString = (() => {
  const connectionString = ENV.DATABASE_URL!;

  if (/uselibpqcompat=/i.test(connectionString)) {
    return connectionString;
  }

  return connectionString.includes("?")
    ? `${connectionString}&uselibpqcompat=true&sslmode=require`
    : `${connectionString}?uselibpqcompat=true&sslmode=require`;
})();

const pool = new Pool({
  connectionString: dbConnectionString,

  // Optional settings
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fires whenever a new database connection is established
pool.on("connect", () => {
  console.log("🟢 PostgreSQL Connected");
});

// Fires whenever the pool encounters an error
pool.on("error", (err) => {
  console.error("🔴 PostgreSQL Pool Error:", err);
});

// Initialize Drizzle ORM
export const db = drizzle(pool, {
  schema,
});

// Optional: Export the pool if you need raw SQL queries
export { pool };