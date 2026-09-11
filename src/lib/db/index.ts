import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to create the PostgreSQL connection.");
}

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });
