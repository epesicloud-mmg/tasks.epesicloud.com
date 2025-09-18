const { Client } = require("pg");
const fs = require("fs");

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL
});

// Helper function to escape SQL values
function escapeSQLValue(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "string") {
    // Escape single quotes and wrap in quotes
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (typeof value === "object") {
    // Handle JSON/JSONB columns
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return value.toString();
}

// Helper function to get column information
async function getColumnInfo(tableName) {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length,
      numeric_precision,
      numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position;
  `;

  const result = await client.query(query, [tableName]);
  return result.rows;
}

// Helper function to generate CREATE TABLE statement
async function generateCreateTable(tableName) {
  const columns = await getColumnInfo(tableName);

  let createStatement = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

  const columnDefinitions = columns.map((col) => {
    let def = `  "${col.column_name}" ${col.data_type.toUpperCase()}`;

    // Add length/precision for specific types
    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    } else if (col.numeric_precision && col.data_type === "numeric") {
      def += `(${col.numeric_precision}${col.numeric_scale ? "," + col.numeric_scale : ""})`;
    }

    // Add NOT NULL constraint
    if (col.is_nullable === "NO") {
      def += " NOT NULL";
    }

    // Add default value
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  });

  createStatement += columnDefinitions.join(",\n");
  createStatement += "\n);\n\n";

  return createStatement;
}

// Helper function to get primary keys and indexes
async function getConstraintsAndIndexes(tableName) {
  let statements = "";

  // Get primary key
  const pkQuery = `
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary;
  `;

  try {
    const pkResult = await client.query(pkQuery, [tableName]);
    if (pkResult.rows.length > 0) {
      const pkColumns = pkResult.rows
        .map((row) => `"${row.attname}"`)
        .join(", ");
      statements += `ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_pkey" PRIMARY KEY (${pkColumns});\n`;
    }
  } catch (err) {
    console.log(
      `⚠️  Could not get primary key for ${tableName}: ${err.message}`,
    );
  }

  return statements;
}

(async () => {
  try {
    await client.connect();
    console.log("🔗 Connected to database");

    // Get all tables in the public schema
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name;
    `);

    let sqlExport = "";
    sqlExport += "-- PostgreSQL Database Export\n";
    sqlExport += `-- Generated on: ${new Date().toISOString()}\n`;
    sqlExport += "-- \n\n";

    // Disable foreign key checks during import
    sqlExport += "SET session_replication_role = replica;\n\n";

    console.log(`📋 Found ${tables.rows.length} tables to export`);

    for (const row of tables.rows) {
      const tableName = row.table_name;

      // Get row count
      const countRes = await client.query(
        `SELECT COUNT(*) FROM "${tableName}"`,
      );
      const rowCount = parseInt(countRes.rows[0].count, 10);
      console.log(`📊 ${tableName}: ${rowCount} rows`);

      // Add table comment
      sqlExport += `-- Table: ${tableName} (${rowCount} rows)\n`;
      sqlExport += `-- ----------------------------------------\n\n`;

      // Generate CREATE TABLE statement
      try {
        const createTable = await generateCreateTable(tableName);
        sqlExport += createTable;
      } catch (err) {
        console.log(
          `⚠️  Could not generate CREATE TABLE for ${tableName}: ${err.message}`,
        );
        sqlExport += `-- Error generating CREATE TABLE for ${tableName}\n\n`;
        continue;
      }

      if (rowCount > 0) {
        console.log(`📦 Exporting data for "${tableName}"...`);

        // Get all data
        const dataRes = await client.query(`SELECT * FROM "${tableName}"`);

        if (dataRes.rows.length > 0) {
          const columns = Object.keys(dataRes.rows[0]);
          const columnNames = columns.map((col) => `"${col}"`).join(", ");

          // Generate INSERT statements in batches for better performance
          const batchSize = 100;
          for (let i = 0; i < dataRes.rows.length; i += batchSize) {
            const batch = dataRes.rows.slice(i, i + batchSize);

            sqlExport += `INSERT INTO "${tableName}" (${columnNames}) VALUES\n`;

            const values = batch
              .map((row) => {
                const rowValues = columns
                  .map((col) => escapeSQLValue(row[col]))
                  .join(", ");
                return `  (${rowValues})`;
              })
              .join(",\n");

            sqlExport += values + ";\n\n";
          }
        }
      }

      // Add constraints and indexes
      try {
        const constraints = await getConstraintsAndIndexes(tableName);
        if (constraints) {
          sqlExport += constraints + "\n";
        }
      } catch (err) {
        console.log(
          `⚠️  Could not get constraints for ${tableName}: ${err.message}`,
        );
      }

      sqlExport += "\n";
    }

    // Re-enable foreign key checks
    sqlExport += "SET session_replication_role = DEFAULT;\n\n";

    // Add final comment
    sqlExport += "-- Export completed\n";

    // Write to file
    fs.writeFileSync("database_export.sql", sqlExport);
    console.log("✅ SQL export completed! File saved as 'database_export.sql'");
    console.log(
      `📄 File size: ${(fs.statSync("database_export.sql").size / 1024 / 1024).toFixed(2)} MB`,
    );

    await client.end();
  } catch (err) {
    console.error("❌ Export failed:", err);
    process.exit(1);
  }
})();
