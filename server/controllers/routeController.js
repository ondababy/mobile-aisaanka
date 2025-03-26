// Import libraries correctly for ES modules
import pkg from 'pg';
import * as turf from '@turf/turf';
import axios from 'axios'; 

const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    "postgres://postgres:adrianondastemb2@localhost:5432/metro_commute",
});

export const getRoutes = async (req, res) => {
  try {
    // Query to get route names from the route_features table
    const query = `
      SELECT DISTINCT properties->>'name' AS name
      FROM route_features
      WHERE properties->>'name' IS NOT NULL
      ORDER BY name
    `;

    const result = await pool.query(query);

    // Extract just the names
    const routeNames = result.rows.map((row) => row.name);

    res.json({
      success: true,
      count: routeNames.length,
      routes: routeNames,
    });
  } catch (error) {
    console.error("Error fetching routes:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve routes",
    });
  }
};

export const getRouteByName = async (req, res) => {
  try {
    const routeName = req.params.name;

    const query = `
      SELECT 
        properties,
        ST_AsGeoJSON(geometry) AS geometry
      FROM route_features
      WHERE properties->>'name' = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [routeName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Route not found",
      });
    }

    // Convert geometry back to GeoJSON
    const routeData = result.rows[0];
    const geometryJSON = JSON.parse(routeData.geometry);

    res.json({
      success: true,
      route: {
        properties: routeData.properties,
        geometry: geometryJSON,
      },
    });
  } catch (error) {
    console.error("Error fetching route:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve route",
    });
  }
};

export const generateCommuteGuide = async (req, res) => {
  try {
    console.log("Received request at /api/routes/commute/guide");
    console.log("Request body:", req.body);
    
    const { source_lat, source_lon, dest_lat, dest_lon } = req.body;

    // Validate input
    if (!source_lat || !source_lon || !dest_lat || !dest_lon) {
      console.log("Missing coordinates in request");
      return res.status(400).json({
        success: false,
        error: "Missing required coordinates",
      });
    }

    // Convert to numbers and validate ranges
    const sourcePoint = {
      lat: parseFloat(source_lat),
      lon: parseFloat(source_lon),
    };

    const destPoint = {
      lat: parseFloat(dest_lat),
      lon: parseFloat(dest_lon),
    };

    console.log("Parsed source point:", sourcePoint);
    console.log("Parsed destination point:", destPoint);

    if (
      isNaN(sourcePoint.lat) ||
      isNaN(sourcePoint.lon) ||
      isNaN(destPoint.lat) ||
      isNaN(destPoint.lon)
    ) {
      console.log("Invalid coordinate values");
      return res.status(400).json({
        success: false,
        error: "Invalid coordinate values",
      });
    }

    console.log("Generating commute options...");
    
    // Generate commute options
    const commuteOptions = await generateCommuteOptions(sourcePoint, destPoint);
    
    console.log(`Generated ${commuteOptions.length} commute options`);

    res.json({
      success: true,
      source: sourcePoint,
      destination: destPoint,
      options: commuteOptions,
    });
  } catch (error) {
    console.error("Error generating commute guide:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate commute guide",
    });
  }
};

/**
 * Generate commute options between source and destination points
 * @param {Object} sourcePoint - Source coordinates {lat, lon}
 * @param {Object} destPoint - Destination coordinates {lat, lon}
 * @returns {Array} Array of commute options
 */
async function generateCommuteOptions(sourcePoint, destPoint) {
  const client = await pool.connect();

  try {
    // Create temporary source and destination points
    await client.query(
      `
      WITH temp_points AS (
        SELECT 
          ST_SetSRID(ST_MakePoint($1, $2), 4326) AS source_geom,
          ST_SetSRID(ST_MakePoint($3, $4), 4326) AS dest_geom
      )
      SELECT 1;
    `,
      [sourcePoint.lon, sourcePoint.lat, destPoint.lon, destPoint.lat]
    );

    // Step 1: Find routes closest to source and destination
    const closestRoutesQuery = `
      WITH source_point AS (
        SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geom
      ),
      dest_point AS (
        SELECT ST_SetSRID(ST_MakePoint($3, $4), 4326) AS geom
      ),
      route_distances AS (
        SELECT
          rf.id,
          properties->>'name' AS route_name,
          properties->>'ref' AS route_ref,
          ST_AsGeoJSON(geometry) AS geometry,
          ST_Distance(
            geometry,
            (SELECT geom FROM source_point)
          ) AS distance_from_source,
          ST_Distance(
            geometry,
            (SELECT geom FROM dest_point)
          ) AS distance_from_dest,
          -- Closest point on route to source
          ST_AsGeoJSON(ST_ClosestPoint(
            geometry,
            (SELECT geom FROM source_point)
          )) AS closest_point_to_source,
          -- Closest point on route to destination
          ST_AsGeoJSON(ST_ClosestPoint(
            geometry,
            (SELECT geom FROM dest_point)
          )) AS closest_point_to_dest
        FROM route_features rf
        WHERE properties->>'name' IS NOT NULL
      )
      SELECT
        id,
        route_name,
        route_ref,
        geometry,
        distance_from_source,
        distance_from_dest,
        closest_point_to_source,
        closest_point_to_dest,
        (distance_from_source + distance_from_dest) AS total_distance,
        (distance_from_source * 2 + distance_from_dest) AS source_weighted_score,
        CASE
          WHEN distance_from_source < 1 AND distance_from_dest < 1 THEN 1 -- Direct route
          WHEN distance_from_source < 1 THEN 2 -- Close to source
          WHEN distance_from_dest < 1 THEN 3 -- Close to destination
          ELSE 4 -- Requires transfers
        END AS route_type
      FROM route_distances
      ORDER BY source_weighted_score
      LIMIT 20;
    `;

    const routesResult = await client.query(closestRoutesQuery, [
      sourcePoint.lon,
      sourcePoint.lat,
      destPoint.lon,
      destPoint.lat,
    ]);

    // Extract potential routes
    const potentialRoutes = routesResult.rows.map((row) => ({
      id: row.id,
      name: row.route_name,
      ref: row.route_ref,
      geometry: JSON.parse(row.geometry),
      distanceFromSource: row.distance_from_source,
      distanceFromDest: row.distance_from_dest,
      closestPointToSource: JSON.parse(row.closest_point_to_source),
      closestPointToDest: JSON.parse(row.closest_point_to_dest),
      routeType: row.route_type,
    }));

    console.log(`Found ${potentialRoutes.length} potential routes`);

    // Step 2: Find direct routes (close to both source and destination)
    const directRoutes = potentialRoutes.filter(
      (route) =>
        route.distanceFromSource < 0.03 && route.distanceFromDest < 0.03
    );

    console.log(`Found ${directRoutes.length} direct routes`);

    // Step 3: Find routes that require one transfer
    const sourceRoutes = potentialRoutes
      .filter(
        (route) =>
          route.distanceFromSource < 0.03 && route.distanceFromDest >= 0.03
      )
      .slice(0, 5);

    const destRoutes = potentialRoutes
      .filter(
        (route) =>
          route.distanceFromDest < 0.03 && route.distanceFromSource >= 0.03
      )
      .slice(0, 5);

    console.log(`Found ${sourceRoutes.length} source routes and ${destRoutes.length} destination routes`);

    // Step 4: Generate route combinations and find intersections
    const transferOptions = await findTransferOptions(
      client,
      sourceRoutes,
      destRoutes
    );

    console.log(`Found ${transferOptions.length} transfer options`);

    // Step 5: Generate walking paths for each option
    const directOptions = await generateDirectOptions(
      sourcePoint,
      destPoint,
      directRoutes
    );
    const transferredOptions = await generateTransferOptions(
      sourcePoint,
      destPoint,
      transferOptions
    );

    // Step 6: Generate a pure walking option
    const walkingOption = generateWalkingOption(sourcePoint, destPoint);

    // Combine and sort options by total travel time (estimated)
    let allOptions = [...directOptions, ...transferredOptions, walkingOption];

    // Sort by estimated travel time (for now, just use distance as a proxy)
    allOptions.sort((a, b) => a.totalDistance - b.totalDistance);

    // Make sure we have at least 3 options
    const finalOptions = ensureMinimumOptions(allOptions, sourcePoint, destPoint);

    // Return at least 3 options
    return finalOptions.slice(0, Math.max(3, finalOptions.length));
  } catch (error) {
    console.error("Error generating commute options:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ensure we have at least 3 different route options
 * @param {Array} options - Existing route options
 * @param {Object} sourcePoint - Source coordinates
 * @param {Object} destPoint - Destination coordinates
 * @returns {Array} Expanded array of route options (at least 3)
 */
function ensureMinimumOptions(options, sourcePoint, destPoint) {
  if (options.length >= 3) {
    return options;
  }

  // Create a driving option if it doesn't exist
  const hasDriving = options.some(opt => opt.type === "driving");
  if (!hasDriving) {
    const drivingOption = {
      type: "driving",
      totalDistance: haversineDistance(
        sourcePoint.lat, sourcePoint.lon, 
        destPoint.lat, destPoint.lon
      ),
      legs: [
        {
          type: "driving",
          mode: "driving",
          name: "Drive to destination",
          distance: haversineDistance(
            sourcePoint.lat, sourcePoint.lon, 
            destPoint.lat, destPoint.lon
          ),
          path: {
            type: "LineString",
            coordinates: [
              [sourcePoint.lon, sourcePoint.lat],
              [destPoint.lon, destPoint.lat],
            ],
          },
        },
      ],
    };
    options.push(drivingOption);
  }

  // Create a jeepney option if it doesn't exist
  const hasJeepney = options.some(opt => opt.type === "jeepney");
  if (!hasJeepney && options.length < 3) {
    // Calculate midpoint
    const midpoint = {
      lon: sourcePoint.lon + (destPoint.lon - sourcePoint.lon) * 0.5,
      lat: sourcePoint.lat + (destPoint.lat - sourcePoint.lat) * 0.5,
    };

    const dist1 = haversineDistance(
      sourcePoint.lat, sourcePoint.lon, 
      midpoint.lat, midpoint.lon
    );
    
    const dist2 = haversineDistance(
      midpoint.lat, midpoint.lon,
      destPoint.lat, destPoint.lon
    );

    const jeepneyOption = {
      type: "jeepney",
      totalDistance: dist1 + dist2,
      legs: [
        {
          type: "transit",
          mode: "jeepney",
          name: "Jeepney Route",
          ref: "J1",
          distance: dist1 + dist2,
          path: {
            type: "LineString",
            coordinates: [
              [sourcePoint.lon, sourcePoint.lat],
              [midpoint.lon, midpoint.lat],
              [destPoint.lon, destPoint.lat],
            ],
          },
        },
      ],
    };
    options.push(jeepneyOption);
  }

  // Make sure we have a walking option
  const hasWalking = options.some(opt => opt.type === "walking");
  if (!hasWalking) {
    const walkingOption = generateWalkingOption(sourcePoint, destPoint);
    options.push(walkingOption);
  }

  return options;
}

/**
 * Find transfer options between source and destination routes
 * @param {Object} client - PostgreSQL client
 * @param {Array} sourceRoutes - Routes close to source
 * @param {Array} destRoutes - Routes close to destination
 * @returns {Array} Array of transfer options
 */
async function findTransferOptions(client, sourceRoutes, destRoutes) {
  const transferOptions = [];

  for (const sourceRoute of sourceRoutes) {
    for (const destRoute of destRoutes) {
      // Skip if same route
      if (sourceRoute.id === destRoute.id) continue;

      // Find closest points between the two routes
      const intersectionQuery = `
        WITH source_route AS (
          SELECT geometry AS geom FROM route_features WHERE id = $1
        ),
        dest_route AS (
          SELECT geometry AS geom FROM route_features WHERE id = $2
        )
        SELECT
          ST_AsGeoJSON(ST_ClosestPoint(sr.geom, dr.geom)) AS source_point,
          ST_AsGeoJSON(ST_ClosestPoint(dr.geom, sr.geom)) AS dest_point,
          ST_Distance(sr.geom, dr.geom) AS transfer_distance
        FROM source_route sr, dest_route dr;
      `;

      const intersectionResult = await client.query(intersectionQuery, [
        sourceRoute.id,
        destRoute.id,
      ]);

      if (intersectionResult.rows.length > 0) {
        const { source_point, dest_point, transfer_distance } =
          intersectionResult.rows[0];

        // Only consider transfers if routes are close enough to each other
        if (transfer_distance < 0.002) {
          // ~2km in degree units
          const sourceTransferPoint = JSON.parse(source_point);
          const destTransferPoint = JSON.parse(dest_point);

          transferOptions.push({
            sourceRoute,
            destRoute,
            sourceTransferPoint: sourceTransferPoint,
            destTransferPoint: destTransferPoint,
            transferDistance: transfer_distance,
          });
        }
      }
    }
  }

  // Sort by transfer distance
  transferOptions.sort((a, b) => a.transferDistance - b.transferDistance);

  return transferOptions.slice(0, 5); // Return top 5 transfer options
}

/**
 * Generate a path between two points using OSRM
 * @param {Array} start - Start coordinates [lon, lat]
 * @param {Array} end - End coordinates [lon, lat]
 * @param {string} profile - OSRM profile ('driving', 'foot', 'bike')
 * @returns {Object} GeoJSON LineString with the route
 */
async function generateOSRMPath(start, end, profile = "foot") {
  try {
    // OSRM service URL
    const OSRM_SERVICE_URL =
      process.env.OSRM_SERVICE_URL || "http://router.project-osrm.org";

    // Format coordinates for OSRM (lon,lat format)
    const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

    // Call OSRM API
    const response = await axios.get(
      `${OSRM_SERVICE_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&alternatives=true`
    );

    if (
      response.data &&
      response.data.routes &&
      response.data.routes.length > 0
    ) {
      // For non-driving modes, prefer alternative routes if available
      // These are often more direct or pedestrian-friendly
      const routeIndex =
        profile !== "driving" && response.data.routes.length > 1 ? 1 : 0;

      // Return the geometry from OSRM
      return response.data.routes[routeIndex].geometry;
    } else {
      console.warn("No routes found from OSRM, falling back to direct path");
      return generateSimplifiedPath(start, end);
    }
  } catch (error) {
    console.error("OSRM routing error:", error.message);

    // Fallback to simplified path generator
    return generateSimplifiedPath(start, end);
  }
}

/**
 * Generate a simplified path between two points when OSRM fails
 * @param {Array} start - Start coordinates [lon, lat]
 * @param {Array} end - End coordinates [lon, lat]
 * @returns {Object} GeoJSON LineString
 */
function generateSimplifiedPath(start, end) {
  try {
    // Calculate distance between points
    const calculateDistance = (p1, p2) => {
      const R = 6371; // Earth radius in kilometers
      const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
      const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1[1] * Math.PI) / 180) *
          Math.cos((p2[1] * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distance = calculateDistance(start, end);

    // For very short distances, just use a direct line
    if (distance < 0.1) {
      // Less than 100 meters
      return {
        type: "LineString",
        coordinates: [start, end],
      };
    }

    // Determine number of intermediate points based on distance
    const numPoints = Math.max(3, Math.min(10, Math.ceil(distance * 2)));

    // Generate intermediate points with small randomization
    const points = [start]; // Start with the exact start point

    for (let i = 1; i < numPoints - 1; i++) {
      const ratio = i / (numPoints - 1);
      const point = [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ];

      // Add small random offset for natural appearance
      // Scale the offset based on distance (smaller offset for longer distances)
      const maxOffset = 0.0002 / (distance || 1); // Smaller deviation for longer paths
      point[0] += (Math.random() - 0.5) * maxOffset;
      point[1] += (Math.random() - 0.5) * maxOffset;

      points.push(point);
    }

    points.push(end); // End with the exact end point

    return {
      type: "LineString",
      coordinates: points,
    };
  } catch (error) {
    console.error("Error generating simplified path:", error);

    // Ultimate fallback - direct line
    return {
      type: "LineString",
      coordinates: [start, end],
    };
  }
}

/**
 * Generate direct route options (single route)
 * @param {Object} sourcePoint - Source point {lat, lon}
 * @param {Object} destPoint - Destination point {lat, lon}
 * @param {Array} directRoutes - Routes close to both source and destination
 * @returns {Array} Array of direct route options
 */
async function generateDirectOptions(sourcePoint, destPoint, directRoutes) {
  const options = [];

  for (const route of directRoutes.slice(0, 2)) {
    // Take top 2 direct routes
    // Extract onboarding and alighting points from route
    const boardingPoint = [
      route.closestPointToSource.coordinates[0],
      route.closestPointToSource.coordinates[1],
    ];

    const alightingPoint = [
      route.closestPointToDest.coordinates[0],
      route.closestPointToDest.coordinates[1],
    ];

    // Generate walking path from source to route boarding point using OSRM
    const sourceWalk = await generateOSRMPath(
      [sourcePoint.lon, sourcePoint.lat],
      boardingPoint,
      "foot"
    );

    // Extract route segment between boarding and alighting points
    const routeSegment = extractRouteSegment(
      route.geometry,
      { coordinates: boardingPoint },
      { coordinates: alightingPoint }
    );

    // Generate walking path from route alighting point to destination
    const destWalk = await generateOSRMPath(
      alightingPoint,
      [destPoint.lon, destPoint.lat],
      "foot"
    );

    // Calculate total distance
    const totalDistance =
      calculatePathDistance(sourceWalk) +
      calculatePathDistance(routeSegment) +
      calculatePathDistance(destWalk);

    options.push({
      type: "transit", // Will be overridden by the calling function
      totalDistance,
      legs: [
        {
          type: "walking",
          mode: "walking",
          name: "Ride Tricycle/Walk",
          distance: calculatePathDistance(sourceWalk),
          path: sourceWalk,
        },
        {
          type: "transit",
          mode: route.mode || "bus", // Use the route's mode
          name: route.name,
          ref: route.ref || "",
          distance: calculatePathDistance(routeSegment),
          path: routeSegment,
        },
        {
          type: "walking",
          mode: "walking",
          name: "Ride Tricycle/Walk",
          distance: calculatePathDistance(destWalk),
          path: destWalk,
        },
      ],
    });
  }

  return options;
}

/**
 * Generate options that require transfers between routes
 * @param {Object} sourcePoint - Source point {lat, lon}
 * @param {Object} destPoint - Destination point {lat, lon}
 * @param {Array} transferOptions - Transfer options between routes
 * @returns {Array} Array of transfer route options
 */
async function generateTransferOptions(
  sourcePoint,
  destPoint,
  transferOptions
) {
  const options = [];

  for (const transfer of transferOptions.slice(0, 3)) {
    // Take top 3 transfer options
    const { sourceRoute, destRoute, sourceTransferPoint, destTransferPoint } =
      transfer;

    // Define exact boarding and alighting points for each route
    const sourceRouteBoarding = [
      sourceRoute.closestPointToSource.coordinates[0],
      sourceRoute.closestPointToSource.coordinates[1],
    ];

    const sourceRouteAlighting = [
      sourceTransferPoint.coordinates[0],
      sourceTransferPoint.coordinates[1],
    ];

    const destRouteBoarding = [
      destTransferPoint.coordinates[0],
      destTransferPoint.coordinates[1],
    ];

    const destRouteAlighting = [
      destRoute.closestPointToDest.coordinates[0],
      destRoute.closestPointToDest.coordinates[1],
    ];

    // Generate walking path from source to first route boarding point
    const sourceWalk = generateWalkingPath(
      [sourcePoint.lon, sourcePoint.lat],
      sourceRouteBoarding
    );

    // Generate first route segment using actual database path
    const firstRouteSegment = extractRouteSegment(
      sourceRoute.geometry,
      { coordinates: sourceRouteBoarding },
      { coordinates: sourceRouteAlighting }
    );

    // Generate walking path for transfer
    const transferWalk = generateWalkingPath(
      sourceRouteAlighting,
      destRouteBoarding
    );

    // Generate second route segment using actual database path
    const secondRouteSegment = extractRouteSegment(
      destRoute.geometry,
      { coordinates: destRouteBoarding },
      { coordinates: destRouteAlighting }
    );

    // Generate walking path from second route to destination
    const destWalk = generateWalkingPath(destRouteAlighting, [
      destPoint.lon,
      destPoint.lat,
    ]);

    // Calculate total distance
    const totalDistance =
      calculatePathDistance(sourceWalk) +
      calculatePathDistance(firstRouteSegment) +
      calculatePathDistance(transferWalk) +
      calculatePathDistance(secondRouteSegment) +
      calculatePathDistance(destWalk);

    options.push({
      type: "transfer",
      totalDistance,
      legs: [
        {
          type: "walking",
          mode: "walking",
          name: "Ride Tricycle/Walk",
          distance: calculatePathDistance(sourceWalk),
          path: sourceWalk,
        },
        {
          type: "transit",
          mode: "bus", // Assuming bus routes, modify as needed
          name: sourceRoute.name,
          ref: sourceRoute.ref || "",
          distance: calculatePathDistance(firstRouteSegment),
          path: firstRouteSegment,
        },
        {
          type: "walking",
          mode: "walking",
          name: "Transfer walk",
          distance: calculatePathDistance(transferWalk),
          path: transferWalk,
        },
        {
          type: "transit",
          mode: "bus", // Assuming bus routes, modify as needed
          name: destRoute.name,
          ref: destRoute.ref || "",
          distance: calculatePathDistance(secondRouteSegment),
          path: secondRouteSegment,
        },
        {
          type: "walking",
          mode: "walking",
          name: "Ride Tricycle/Walk",
          distance: calculatePathDistance(destWalk),
          path: destWalk,
        },
      ],
    });
  }

  return options;
}

/**
 * Generate a pure walking option (fallback)
 * @param {Object} sourcePoint - Source point {lat, lon}
 * @param {Object} destPoint - Destination point {lat, lon}
 * @returns {Object} Walking option
 */
function generateWalkingOption(sourcePoint, destPoint) {
  const walkPath = generateWalkingPath(
    [sourcePoint.lon, sourcePoint.lat],
    [destPoint.lon, destPoint.lat]
  );

  const distance = calculatePathDistance(walkPath);

  return {
    type: "walking",
    totalDistance: distance,
    legs: [
      {
        type: "walking",
        mode: "walking",
        name: "Walk to destination",
        distance,
        path: walkPath,
      },
    ],
  };
}

/**
 * Generate a walking path between two points
 * For now, this uses a simple straight line. In production, this should use a
 * routing service that follows streets (like OSRM, GraphHopper, etc.)
 * @param {Array} start - Start coordinates [lon, lat]
 * @param {Array} end - End coordinates [lon, lat]
 * @returns {Object} GeoJSON LineString
 */
function generateWalkingPath(start, end) {
  // In a real implementation, this would query a routing service like OSRM
  // For now, we'll generate a straight line as a placeholder
  return {
    type: "LineString",
    coordinates: [start, end],
  };
}

/**
 * Create interpolated points between two distant coordinates
 * @param {Array} start - Start point [lon, lat]
 * @param {Array} end - End point [lon, lat]
 * @param {number} numPoints - Number of points to create
 * @returns {Array} Array of interpolated coordinate points
 */
function interpolatePoints(start, end, numPoints) {
  const points = [];
  for (let i = 1; i < numPoints; i++) {
    const ratio = i / numPoints;
    const lon = start[0] + (end[0] - start[0]) * ratio;
    const lat = start[1] + (end[1] - start[1]) * ratio;
    points.push([lon, lat]);
  }
  return points;
}

/**
 * Extract segment of route between two points, preventing large jumps
 * @param {Object} routeGeometry - GeoJSON geometry of the route
 * @param {Object} startPoint - Start point GeoJSON
 * @param {Object} endPoint - End point GeoJSON
 * @returns {Object} GeoJSON LineString
 */
function extractRouteSegment(routeGeometry, startPoint, endPoint) {
  try {
    const startCoords = startPoint.coordinates;
    const endCoords = endPoint.coordinates;

    // Threshold for determining a "large jump" in kilometers
    const LARGE_JUMP_THRESHOLD_KM = 1.0;

    // Extract all coordinates from the route geometry
    let allCoordinates = [];

    if (routeGeometry.type === "LineString") {
      allCoordinates = routeGeometry.coordinates;
    } else if (routeGeometry.type === "MultiLineString") {
      // Flatten all segments into a single array of coordinates
      routeGeometry.coordinates.forEach((segment) => {
        allCoordinates = allCoordinates.concat(segment);
      });
    }

    if (allCoordinates.length === 0) {
      throw new Error("No coordinates found in route geometry");
    }

    // Find the closest points to our start and end in the full route
    let startIndex = -1;
    let endIndex = -1;
    let minStartDistance = Infinity;
    let minEndDistance = Infinity;

    for (let i = 0; i < allCoordinates.length; i++) {
      const coord = allCoordinates[i];

      const startDist = haversineDistance(
        startCoords[1],
        startCoords[0],
        coord[1],
        coord[0]
      );

      const endDist = haversineDistance(
        endCoords[1],
        endCoords[0],
        coord[1],
        coord[0]
      );

      if (startDist < minStartDistance) {
        minStartDistance = startDist;
        startIndex = i;
      }

      if (endDist < minEndDistance) {
        minEndDistance = endDist;
        endIndex = i;
      }
    }

    // Determine direction (forward or backward)
    let routeCoordinates = [];

    if (startIndex !== -1 && endIndex !== -1) {
      // Add the exact starting point
      routeCoordinates.push(startCoords);

      // If start is not very close to the nearest point, add intermediate points
      if (minStartDistance > 0.2) {
        // 200 meters
        const numPoints = Math.ceil(minStartDistance / 0.2);
        const interpolated = interpolatePoints(
          startCoords,
          allCoordinates[startIndex],
          numPoints
        );
        // Add all except the first and last
        for (let i = 1; i < interpolated.length - 1; i++) {
          routeCoordinates.push(interpolated[i]);
        }
      }

      // Add nearest point found in the route
      routeCoordinates.push(allCoordinates[startIndex]);

      // Determine if we should go forward or backward through the coordinates
      if (startIndex < endIndex) {
        // Forward direction
        let prevCoord = allCoordinates[startIndex];

        for (let i = startIndex + 1; i <= endIndex; i++) {
          const coord = allCoordinates[i];
          const distance = haversineDistance(
            prevCoord[1],
            prevCoord[0],
            coord[1],
            coord[0]
          );

          // If there's a large jump, add intermediate points
          if (distance > LARGE_JUMP_THRESHOLD_KM) {
            console.log(
              `Detected large jump of ${distance.toFixed(2)} km at index ${i}`
            );

            // Number of points to add is based on the jump distance
            const numPoints = Math.max(3, Math.ceil(distance / 0.5)); // At least 3, or one point every 500m
            const interpolated = interpolatePoints(prevCoord, coord, numPoints);

            // Add all except the first and last (which would be duplicates)
            for (let j = 1; j < interpolated.length - 1; j++) {
              routeCoordinates.push(interpolated[j]);
            }
          }

          routeCoordinates.push(coord);
          prevCoord = coord;
        }
      } else {
        // Backward direction
        let prevCoord = allCoordinates[startIndex];

        for (let i = startIndex - 1; i >= endIndex; i--) {
          const coord = allCoordinates[i];
          const distance = haversineDistance(
            prevCoord[1],
            prevCoord[0],
            coord[1],
            coord[0]
          );

          // If there's a large jump, add intermediate points
          if (distance > LARGE_JUMP_THRESHOLD_KM) {
            console.log(
              `Detected large jump of ${distance.toFixed(2)} km at index ${i}`
            );

            // Number of points to add is based on the jump distance
            const numPoints = Math.max(3, Math.ceil(distance / 0.5)); // At least 3, or one point every 500m
            const interpolated = interpolatePoints(prevCoord, coord, numPoints);

            // Add all except the first and last (which would be duplicates)
            for (let j = 1; j < interpolated.length - 1; j++) {
              routeCoordinates.push(interpolated[j]);
            }
          }

          routeCoordinates.push(coord);
          prevCoord = coord;
        }
      }

      // If end is not very close to the nearest point, add intermediate points
      if (minEndDistance > 0.2) {
        // 200 meters
        const numPoints = Math.ceil(minEndDistance / 0.2);
        const interpolated = interpolatePoints(
          allCoordinates[endIndex],
          endCoords,
          numPoints
        );
        // Add all except the first (which would be a duplicate)
        for (let i = 1; i < interpolated.length; i++) {
          routeCoordinates.push(interpolated[i]);
        }
      } else {
        // Add the exact end point
        routeCoordinates.push(endCoords);
      }

      // Validate the route - check for any remaining large jumps
      let validateCoordinates = [];
      let prevCoord = routeCoordinates[0];
      validateCoordinates.push(prevCoord);

      for (let i = 1; i < routeCoordinates.length; i++) {
        const coord = routeCoordinates[i];
        const distance = haversineDistance(
          prevCoord[1],
          prevCoord[0],
          coord[1],
          coord[0]
        );

        // If there's still a large jump, add more intermediate points
        if (distance > LARGE_JUMP_THRESHOLD_KM) {
          console.log(
            `Still found large jump of ${distance.toFixed(2)} km in validation`
          );

          // Add more points for smoother transition
          const numPoints = Math.max(3, Math.ceil(distance / 0.3)); // At least 3, or one point every 300m
          const interpolated = interpolatePoints(prevCoord, coord, numPoints);

          // Add all except the first (which would be a duplicate)
          for (let j = 1; j < interpolated.length; j++) {
            validateCoordinates.push(interpolated[j]);
          }
        } else {
          validateCoordinates.push(coord);
        }

        prevCoord = coord;
      }

      return {
        type: "LineString",
        coordinates: validateCoordinates,
      };
    } else {
      console.warn("Could not find start or end point in route");

      // Fallback - direct route with intermediate points
      const distance = haversineDistance(
        startCoords[1],
        startCoords[0],
        endCoords[1],
        endCoords[0]
      );

      let numPoints = 2; // Default to direct line
      if (distance > 1) {
        // More points for longer distances
        numPoints = Math.max(5, Math.ceil(distance / 0.5)); // At least 5 points, or one per 500m
      }

      return {
        type: "LineString",
        coordinates: interpolatePoints(startCoords, endCoords, numPoints),
      };
    }
  } catch (error) {
    console.error("Error extracting route segment:", error);

    // Fallback to a smoothed direct line if something goes wrong
    const distance = haversineDistance(
      startPoint.coordinates[1],
      startPoint.coordinates[0],
      endPoint.coordinates[1],
      endPoint.coordinates[0]
    );

    let numPoints = 2;
    if (distance > 0.5) {
      numPoints = Math.max(3, Math.ceil(distance / 0.5));
    }

    return {
      type: "LineString",
      coordinates: interpolatePoints(
        startPoint.coordinates,
        endPoint.coordinates,
        numPoints
      ),
    };
  }
}

/**
 * Calculate distance of a path in kilometers
 * @param {Object} path - GeoJSON LineString
 * @returns {number} Distance in kilometers
 */
function calculatePathDistance(path) {
  if (!path || !path.coordinates || path.coordinates.length < 2) {
    return 0;
  }

  try {
    // Use turf.js to calculate distance
    const line = turf.lineString(path.coordinates);
    return turf.length(line, { units: "kilometers" });
  } catch (error) {
    console.error("Error calculating path distance:", error);
    
    // Fallback manual calculation using Haversine formula
    let totalDistance = 0;
    for (let i = 0; i < path.coordinates.length - 1; i++) {
      const start = path.coordinates[i];
      const end = path.coordinates[i + 1];
      totalDistance += haversineDistance(start[1], start[0], end[1], end[0]);
    }
    return totalDistance;
  }
}

/**
 * Calculate Haversine distance between two points
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}