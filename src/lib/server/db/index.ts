import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type PostgresClient = ReturnType<typeof postgres>;
type DatabaseConnection = { connectionString: string; client: PostgresClient };
type DatabaseGlobal = typeof globalThis & { __originsDatabaseConnection?: DatabaseConnection };

const globals = globalThis as DatabaseGlobal;
const connectionString = env.DATABASE_URL ?? '';
let connection = globals.__originsDatabaseConnection;

if (!connection || connection.connectionString !== connectionString) {
  const previousClient = connection?.client;
  const client = postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10
  });
  connection = { connectionString, client };
  globals.__originsDatabaseConnection = connection;

  if (previousClient) {
    void previousClient.end({ timeout: 5 }).catch((cause) => {
      console.error('[database] Could not close the previous PostgreSQL pool', cause);
    });
  }
}

const client = connection.client;
export const db = drizzle(client, { schema });
