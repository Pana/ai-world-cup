import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket
} from "mysql2/promise";
import { getConfig } from "./config.js";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const url = new URL(getConfig().DATABASE_URL);
    pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 10,
      decimalNumbers: true,
      timezone: "Z",
      multipleStatements: true
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export async function queryRows<T extends RowDataPacket[]>(
  sql: string,
  values: unknown[] = []
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, values as never[]);
  return rows;
}

export async function execute(
  sql: string,
  values: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute<ResultSetHeader>(
    sql,
    values as never[]
  );
  return result;
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function runMigrations(): Promise<string[]> {
  await ensureDatabaseExists();
  const migrationsDir = path.resolve("migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const connection = await getPool().getConnection();
  const applied: string[] = [];

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    for (const file of files) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        "SELECT version FROM schema_migrations WHERE version = ?",
        [file]
      );
      if (existing.length > 0) continue;

      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.execute(
          "INSERT INTO schema_migrations (version) VALUES (?)",
          [file]
        );
        await connection.commit();
        applied.push(file);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    connection.release();
  }

  return applied;
}

async function ensureDatabaseExists(): Promise<void> {
  const url = new URL(getConfig().DATABASE_URL);
  const database = url.pathname.replace(/^\//, "");
  if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error("DATABASE_URL must contain a valid database name");
  }

  const connection = await mysql.createConnection({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
  } finally {
    await connection.end();
  }
}
