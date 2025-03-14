import sql from 'mssql';
import {
  MSSQL_SERVER,
  MSSQL_DATABASE,
  MSSQL_USER,
  MSSQL_PASSWORD,
  MSSQL_PORT
} from '@env';

const sqlConfig = {
  user: MSSQL_USER,
  password: MSSQL_PASSWORD,
  database: MSSQL_DATABASE,
  server: MSSQL_SERVER,
  port: Number(MSSQL_PORT) || 1433,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // For Azure SQL
    trustServerCertificate: true, // For local dev / self-signed certs
  }
};

// Connection pool
let pool: sql.ConnectionPool | null = null;

// Initialize connection pool
export async function initializeDatabase() {
  try {
    if (!pool) {
      console.log('Creating new database connection pool...');
      pool = await sql.connect(sqlConfig);
      console.log('Database connection pool created successfully');
    }
    return pool;
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

// Execute query with parameters
export async function executeQuery(
  query: string,
  params: { [key: string]: any } = {}
) {
  try {
    const currentPool = await initializeDatabase();
    const request = currentPool.request();
    
    // Add parameters to the request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });
    
    const result = await request.query(query);
    return result;
  } catch (err) {
    console.error('Error executing query:', err);
    throw err;
  }
}

// Close database connection when app terminates
export async function closeDatabase() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('Database connection pool closed');
    }
  } catch (err) {
    console.error('Error closing database connection:', err);
    throw err;
  }
}