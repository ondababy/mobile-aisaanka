import * as turf from "@turf/turf";
import pkg from 'pg';
const { Pool, Client } = pkg;
import * as fs from 'fs';
import * as path from 'path';

const connectionString =
  "postgres://postgres:adrianondastemb2@localhost:5432/metro_commute";

const client = new Client({
  connectionString: connectionString,
});

async function createTables(client) {
  try {
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await client.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id SERIAL PRIMARY KEY,
        collection_type TEXT,
        generator TEXT,
        copyright TEXT,
        timestamp TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS route_features (
        id SERIAL PRIMARY KEY,
        route_id INTEGER REFERENCES routes(id),
        feature_type TEXT,
        osm_id TEXT,
        properties JSONB,
        geometry GEOMETRY
      );
    `);

    await client.query("COMMIT");
    console.log("Tables created successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating tables:", err);
    throw err;
  }
}

async function importGeoJSON(client, filePath) {
  try {
    console.log(`Reading GeoJSON file: ${filePath}`);
    const geojsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    await client.query("BEGIN");

    console.log("Importing feature collection metadata");
    const routeResult = await client.query(
      `INSERT INTO routes (collection_type, generator, copyright, timestamp)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        geojsonData.type,
        geojsonData.generator,
        geojsonData.copyright,
        geojsonData.timestamp,
      ]
    );

    const routeId = routeResult.rows[0].id;

    const features = geojsonData.features || [];
    console.log(`🗺️ Importing ${features.length} features`);

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];

      if (i > 0 && i % 10 === 0) {
        console.log(`⏳ Imported ${i}/${features.length} features...`);
      }

      const osmId =
        feature.properties && feature.properties["@id"]
          ? feature.properties["@id"]
          : null;

      await client.query(
        `INSERT INTO route_features (
          route_id, 
          feature_type, 
          osm_id, 
          properties, 
          geometry
        )
        VALUES ($1, $2, $3, $4, ST_GeomFromGeoJSON($5))`,
        [
          routeId,
          feature.type,
          osmId,
          feature.properties || {},
          JSON.stringify(feature.geometry),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`Successfully imported all ${features.length} features`);
    return routeId;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error importing GeoJSON:", err);
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Please provide the path to a GeoJSON file");
    console.log("Usage: node import-geojson.js <path-to-geojson-file>");
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileExt = path.extname(filePath).toLowerCase();
  if (fileExt !== ".json" && fileExt !== ".geojson") {
    console.warn("Warning: File does not have .json or .geojson extension");
  }

  try {
    console.log("Connecting to PostgreSQL database...");
    await client.connect();

    await createTables(client);

    const routeId = await importGeoJSON(client, filePath);
    console.log(`Import complete! Route ID: ${routeId}`);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main();
