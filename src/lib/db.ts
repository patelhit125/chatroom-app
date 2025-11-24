import pg from "pg";
const { Pool } = pg;

// Type imports
import type { QueryResult, PoolClient, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

export interface QueryParams {
  text: string;
  values?: unknown[];
}

/**
 * Execute a database query with automatic logging and error handling
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, values);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      // console.log("📊 Query executed", {
      //   duration: `${duration}ms`,
      //   rows: result.rowCount,
      //   text: text.substring(0, 100),
      // });
    }

    return result;
  } catch (error) {
    console.error("❌ Database query error:", error);
    console.error("Query:", text);
    console.error("Values:", values);
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
