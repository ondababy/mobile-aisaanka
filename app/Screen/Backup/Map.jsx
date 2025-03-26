import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Buffer } from 'buffer';
import { lineString, along, length, bezierSpline } from '@turf/turf';

// Icons
import { 
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5
} from '@expo/vector-icons';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// API URLs
const OSRM_SERVICE_URL = 'https://router.project-osrm.org';
const API_BASE_URL = 'http://192.168.127.100:5000/api';  

// Theme colors
const COLORS = {
  primary: '#0b617e',
  primaryLight: '#3d96b4',
  primaryDark: '#074356',
  secondary: '#e74c3c',
  secondaryLight: '#ff7961',
  secondaryDark: '#ba000d',
  background: '#f5f5f5',
  white: '#ffffff',
  grey: '#f8f9fa',
  greyDark: '#e0e0e0',
  text: '#333333',
  textSecondary: '#757575',
  walking: '#3d96b4',
  driving: '#e74c3c',
  bus: '#f5a623',
  train: '#e74c3c',
  jeepney: '#2ecc71',
  default: '#9b59b6',
};

// Fare calculation constants for Philippine transportation
const FARE_MATRIX = {
  jeepney: {
    baseRate: 13,
    baseDistance: 4,
    additionalRatePerKm: 1.8,
    discountRate: 0.2,
  },
  bus: {
    ordinary: {
      baseRate: 15,
      baseDistance: 5,
      additionalRatePerKm: 2.65,
    },
    aircon: {
      baseRate: 17,
      baseDistance: 5,
      additionalRatePerKm: 3.0,
    },
    p2p: {
      baseRate: 50,
      flatRate: true,
    },
    discountRate: 0.2,
  },
  driving: {
    costPerKm: 15,
  },
};

// Mode icons mapping
const getModeIcon = (mode, size = 24, color = COLORS.primary) => {
  switch (mode) {
    case 'walking':
      return <MaterialIcons name="directions-walk" size={size} color={COLORS.walking} />;
    case 'driving':
    case 'car':
      return <MaterialIcons name="directions-car" size={size} color={COLORS.driving} />;
    case 'bus':
      return <MaterialIcons name="directions-bus" size={size} color={COLORS.bus} />;
    case 'train':
      return <MaterialIcons name="train" size={size} color={COLORS.train} />;
    case 'jeepney':
      return <MaterialCommunityIcons name="bus" size={size} color={COLORS.jeepney} />;
    default:
      return <MaterialIcons name="directions-transit" size={size} color={COLORS.default} />;
  }
};

/**
 * Calculate fare based on distance and mode of transportation
 */
const calculateFare = (
  mode,
  distance,
  busType = 'aircon',
  hasDiscount = false
) => {
  if (mode === 'walking') return 0;

  if (mode === 'driving') {
    return Math.round(distance * FARE_MATRIX.driving.costPerKm);
  }

  if (mode === 'jeepney') {
    let fare = FARE_MATRIX.jeepney.baseRate;

    if (distance > FARE_MATRIX.jeepney.baseDistance) {
      const additionalDistance = distance - FARE_MATRIX.jeepney.baseDistance;
      const additionalSegments = Math.ceil(additionalDistance);
      fare += additionalSegments * FARE_MATRIX.jeepney.additionalRatePerKm;
    }

    if (hasDiscount) {
      fare = fare * (1 - FARE_MATRIX.jeepney.discountRate);
    }

    return Math.ceil(fare);
  }

  if (mode === 'bus') {
    const busMatrix = FARE_MATRIX.bus[busType] || FARE_MATRIX.bus.aircon;

    if (busMatrix.flatRate) {
      const baseFare = busMatrix.baseRate;
      return hasDiscount
        ? Math.ceil(baseFare * (1 - FARE_MATRIX.bus.discountRate))
        : baseFare;
    }

    let fare = busMatrix.baseRate;

    if (distance > busMatrix.baseDistance) {
      const additionalDistance = distance - busMatrix.baseDistance;
      const additionalSegments = Math.ceil(additionalDistance);
      fare += additionalSegments * busMatrix.additionalRatePerKm;
    }

    if (hasDiscount) {
      fare = fare * (1 - FARE_MATRIX.bus.discountRate);
    }

    return Math.ceil(fare);
  }

  return 0;
};

// Detect bus type from name
const detectBusType = (busName) => {
  const lowerName = (busName || '').toLowerCase();
  if (lowerName.includes('p2p')) return 'p2p';
  if (lowerName.includes('airconditioned') || lowerName.includes('aircon'))
    return 'aircon';
  return 'ordinary';
};

function decodePolyline(encoded) {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat * 1e-5, lng * 1e-5]);
  }

  return coordinates;
}

// Helper function to generate a simplified path when OSRM fails
const generateSimplifiedPath = (start, end) => {
  try {
    const line = lineString([start, end]);
    const totalLength = length(line, { units: 'kilometers' });
    const numPoints = Math.max(5, Math.min(20, Math.ceil(totalLength * 3)));
    const points = [];
    points.push(start);

    for (let i = 1; i < numPoints - 1; i++) {
      const fraction = i / (numPoints - 1);
      const point = along(line, totalLength * fraction, { units: 'kilometers' })
        .geometry.coordinates;

      const maxOffset = 0.0005 / (totalLength || 1);
      point[0] += (Math.random() - 0.5) * maxOffset;
      point[1] += (Math.random() - 0.5) * maxOffset;

      points.push(point);
    }

    points.push(end);

    try {
      // Only use bezierSpline if available
      if (typeof bezierSpline === 'function') {
        const smoothedLine = bezierSpline(lineString(points), {
          resolution: 200,
        });
        return smoothedLine.geometry;
      }
    } catch (e) {
      console.warn('Bezier smoothing failed, using simplified path', e);
    }
    
    return {
      type: 'LineString',
      coordinates: points,
    };
  } catch (e) {
    console.warn('Error generating simplified path:', e);
    return {
      type: 'LineString',
      coordinates: [start, end],
    };
  }
};

// Format time from minutes or seconds
const formatTime = (time, isSeconds = false) => {
  const minutes = isSeconds ? time / 60 : time;

  if (!minutes && minutes !== 0) return 'Unknown';

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins} min`;
  return `${hours} hr ${mins} min`;
};

// Format distance
const formatDistance = (km) => {
  if (!km && km !== 0) return 'Unknown';

  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(1)} km`;
};

// Format fare
const formatFare = (fare) => {
  if (!fare && fare !== 0) return '';
  return `₱${fare.toFixed(2)}`;
};

const Badge = ({ text, color, backgroundColor, icon }) => {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      {icon}
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
};

const LegItem = ({ leg, getLegTime }) => {
  const lineColor = leg.mode ? COLORS[leg.mode] || COLORS.default : COLORS.default;
  
  return (
    <View style={styles.legItem}>
      <View style={styles.legTimeline}>
        <View style={[styles.legDot, { backgroundColor: lineColor }]} />
        <View style={[styles.legLine, { backgroundColor: lineColor }]} />
      </View>
      <View style={styles.legContent}>
        <View style={styles.legHeader}>
          <View style={styles.legInfo}>
            {getModeIcon(leg.mode)}
            <Text style={styles.legMode}>
              {leg.type === 'transit'
                ? leg.ref
                  ? `${leg.mode.toUpperCase()} ${leg.ref}`
                  : leg.mode.toUpperCase()
                : leg.name}
            </Text>
          </View>
          <Text style={styles.legTime}>{formatTime(getLegTime(leg), true)}</Text>
        </View>
        
        {leg.type === 'transit' && (
          <Text style={styles.legName}>{leg.name}</Text>
        )}
        
        <View style={styles.legDetails}>
          <Text style={styles.legDistance}>{formatDistance(leg.distance)}</Text>
          {leg.fare > 0 && (
            <Text style={styles.legFare}>{formatFare(leg.fare)}</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const FareInformationPanel = ({ hasDiscount }) => {
  return (
    <View style={styles.fareInfoPanel}>
      <Text style={styles.fareInfoTitle}>Fare Information</Text>
      
      <View style={styles.fareInfoContent}>
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Jeepney:</Text>
          <Text style={styles.fareInfoValue}>₱13 first 4km + ₱1.80/km after</Text>
        </View>
        
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Bus (Ordinary):</Text>
          <Text style={styles.fareInfoValue}>₱15 first 5km + ₱2.65/km after</Text>
        </View>
        
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Bus (Aircon):</Text>
          <Text style={styles.fareInfoValue}>₱17 first 5km + ₱3.00/km after</Text>
        </View>
        
        <View style={styles.fareInfoRow}>
          <Text style={styles.fareInfoLabel}>Bus (P2P):</Text>
          <Text style={styles.fareInfoValue}>Flat rate (varies by route)</Text>
        </View>
        
        <View style={styles.fareInfoNote}>
          <Text style={styles.fareInfoNoteText}>
            <Text style={styles.fareInfoNoteLabel}>Note: </Text>
            {hasDiscount
              ? '20% discount applied for Student/Senior/PWD'
              : 'Student/Senior/PWD discounts available'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const Legend = () => {
  const modes = [
    { mode: 'walking', label: 'Walking' },
    { mode: 'driving', label: 'Driving' },
    { mode: 'bus', label: 'Bus' },
    { mode: 'train', label: 'Train' },
    { mode: 'jeepney', label: 'Jeepney' }
  ];
  
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>Legend</Text>
      
      {modes.map(({ mode, label }) => (
        <View key={mode} style={styles.legendItem}>
          <View 
            style={[
              styles.legendColor, 
              { 
                backgroundColor: COLORS[mode],
                ...(mode === 'walking' ? { 
                  height: 0, 
                  borderWidth: 1, 
                  borderColor: COLORS[mode],
                  borderStyle: 'dashed' 
                } : {})
              }
            ]} 
          />
          <Text style={styles.legendLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
};

const Map = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const mapRef = useRef(null);

  // Extract route params with default values
  const { 
    srcLat: rawSrcLat = 0, 
    srcLng: rawSrcLng = 0, 
    destLat: rawDestLat = 0, 
    destLng: rawDestLng = 0, 
    hasDiscount = false 
  } = route.params || {};
  
  // Parse coordinates to ensure they are numbers
  const srcLat = parseFloat(rawSrcLat);
  const srcLng = parseFloat(rawSrcLng);
  const destLat = parseFloat(rawDestLat);
  const destLng = parseFloat(rawDestLng);
  
  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commuteOptions, setCommuteOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [mapRegion, setMapRegion] = useState({
    latitude: srcLat || 14.5995, // Default to Manila if no coordinates
    longitude: srcLng || 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });

  // Helper function to enhance a leg with OSRM
  const enhanceLegWithOSRM = async (leg) => {
    if (leg.path && leg.path.coordinates && leg.path.coordinates.length === 2) {
      let profile = 'foot';
      let useAlternateRoute = true;

      if (leg.mode === 'driving' || leg.mode === 'car') {
        profile = 'driving';
        useAlternateRoute = false;
      } else if (leg.mode === 'bike' || leg.mode === 'cycling') {
        profile = 'bike';
      }

      const start = leg.path.coordinates[0];
      const end = leg.path.coordinates[1];
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

      try {
        const response = await axios.get(
          `${OSRM_SERVICE_URL}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&alternatives=${useAlternateRoute}&steps=true`
        );

        if (
          response.data &&
          response.data.routes &&
          response.data.routes.length > 0
        ) {
          const routeIndex =
            useAlternateRoute && response.data.routes.length > 1 ? 1 : 0;

          leg.path = response.data.routes[routeIndex].geometry;

          if (response.data.routes[routeIndex].distance) {
            leg.distance = response.data.routes[routeIndex].distance / 1000;
          }

          if (response.data.routes[routeIndex].duration) {
            leg.duration = response.data.routes[routeIndex].duration;
          }
        }
      } catch (error) {
        console.warn(`Street-aware routing failed for leg:`, error);
        leg.path = generateSimplifiedPath(
          leg.path.coordinates[0],
          leg.path.coordinates[1]
        );
      }
    }
  };

  // Simplified enhanceRoutes function without traffic data
  const enhanceRoutes = async (options) => {
    try {
      console.log('Enhancing routes for', options.length, 'options');
      const enhancedOptions = [...options];

      // Process each option
      for (let i = 0; i < enhancedOptions.length; i++) {
        const option = enhancedOptions[i];

        if (!option.legs) {
          console.log(`Option ${i} has no legs, skipping`);
          continue;
        }

        // Process each leg
        for (let j = 0; j < option.legs.length; j++) {
          const leg = option.legs[j];

          // Enhance leg with OSRM if needed
          if (
            leg.path &&
            leg.path.coordinates &&
            leg.path.coordinates.length === 2
          ) {
            await enhanceLegWithOSRM(leg);
          }

          // Calculate fare for all legs
          if (leg.type === 'transit') {
            const busType = leg.mode === 'bus' ? detectBusType(leg.name) : null;
            leg.fare = calculateFare(
              leg.mode,
              leg.distance,
              busType,
              hasDiscount
            );
          } else {
            leg.fare = calculateFare(leg.mode, leg.distance);
          }
        }

        // Calculate overall metrics for the option
        if (option.legs.length > 0) {
          option.totalDistance = option.legs.reduce(
            (total, leg) => total + leg.distance,
            0
          );

          option.totalFare = option.legs.reduce(
            (total, leg) => total + (leg.fare || 0),
            0
          );
        }
      }

      return enhancedOptions;
    } catch (error) {
      console.error('Error enhancing routes:', error);
      return options;
    }
  };

  // Get estimated time for a leg
  const getLegTime = (leg) => {
    if (leg.duration) {
      return leg.duration;
    }

    const speeds = {
      walking: 5,
      driving: 40,
      car: 40,
      bus: 20,
      train: 30,
      jeepney: 15,
      default: 10,
    };

    let speed = speeds[leg.mode] || speeds.default;
    const timeHours = leg.distance / speed;
    return timeHours * 3600;
  };

  // Calculate total time for an option
  const calculateTotalTime = (option) => {
    if (!option || !option.legs) return 0;

    if (option.duration) {
      return option.duration;
    }

    const totalSeconds = option.legs.reduce((total, leg) => {
      return total + getLegTime(leg);
    }, 0);

    const transferCount = option.legs.filter(
      (leg) => leg.type === 'walking' && leg.name && leg.name.includes('Transfer')
    ).length;

    return totalSeconds + transferCount * 300;
  };

  // Calculate bounds for the map to fit all routes
  const calculateMapRegion = (options, source, destination) => {
    if (!options || !options.length) {
      setMapRegion({
        latitude: (source[0] + destination[0]) / 2,
        longitude: (source[1] + destination[1]) / 2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
      return;
    }

    let minLat = Math.min(source[0], destination[0]);
    let maxLat = Math.max(source[0], destination[0]);
    let minLng = Math.min(source[1], destination[1]);
    let maxLng = Math.max(source[1], destination[1]);

    options.forEach((option) => {
      if (option.legs) {
        option.legs.forEach((leg) => {
          if (leg.path && leg.path.coordinates) {
            leg.path.coordinates.forEach((coord) => {
              minLat = Math.min(minLat, coord[1]);
              maxLat = Math.max(maxLat, coord[1]);
              minLng = Math.min(minLng, coord[0]);
              maxLng = Math.max(maxLng, coord[0]);
            });
          }
        });
      }
    });

    // Add padding
    const latPadding = (maxLat - minLat) * 0.2;
    const lngPadding = (maxLng - minLng) * 0.2;

    setMapRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + minLng) / 2,
      latitudeDelta: (maxLat - minLat) + latPadding,
      longitudeDelta: (maxLng - minLng) + lngPadding
    });

    // Animate map to new region
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + latPadding,
        longitudeDelta: (maxLng - minLng) + lngPadding
      }, 1000);
    }
  };

  useEffect(() => {
    const fetchMap = async () => {
      try {
        // Added check for valid coordinates
        if (isNaN(srcLat) || isNaN(srcLng) || isNaN(destLat) || isNaN(destLng)) {
          setError('Missing or invalid coordinates');
          setLoading(false);
          return;
        }
    
        setLoading(true);
        console.log('Requesting route data from API...');
        console.log('Source:', srcLat, srcLng);
        console.log('Destination:', destLat, destLng);
    
        // Define API endpoint - adjust this based on your backend requirements
        // Try direct path - this should match your actual backend API endpoint structure
        const API_URL = 'http:192.168.127.100:5000/api/routes/commute/guide';
        
        // Try alternative payload format based on API requirements
        // The 400 error suggests the server expects a different format
        const payload = {
          source_lat: srcLat,  // Try source_lat instead of srcLat
          source_lon: srcLng,  // Try source_lon instead of srcLng
          dest_lat: destLat,   // Try dest_lat instead of destLat
          dest_lon: destLng,   // Try dest_lon instead of destLng
          discount: hasDiscount // Try discount instead of hasDiscount
        };
        
        console.log('Sending payload:', payload);
        
        const response = await axios.post(API_URL, payload);
    
        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Failed to fetch route data');
        }
    
        console.log('Enhancing routes...');
        const enhancedOptions = await enhanceRoutes(response.data.options || []);
    
        console.log('Enhanced options:', enhancedOptions);
    
        setCommuteOptions(enhancedOptions);
        calculateMapRegion(
          enhancedOptions,
          [srcLat, srcLng],
          [destLat, destLng]
        );
      } catch (err) {
        console.error('Error fetching commute guide:', err);
        // Log more detailed error information
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log('Error data:', err.response.data);
          console.log('Error status:', err.response.status);
          console.log('Error headers:', err.response.headers);
        } else if (err.request) {
          // The request was made but no response was received
          console.log('Error request:', err.request);
        }
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [srcLat, srcLng, destLat, destLng, hasDiscount]);

  const handleEndJourney = () => {
    Alert.alert(
      'Thank You!',
      'Would you like to leave a review?',
      [
        {
          text: 'No, thanks',
          style: 'cancel',
          onPress: () => navigation.navigate('Home')
        },
        {
          text: 'Yes, leave a review',
          onPress: () => navigation.navigate('Review')
        }
      ]
    );
  };

  const generatePDF = async () => {
    if (!commuteOptions || commuteOptions.length === 0) {
      Alert.alert('Error', 'No route data available to generate PDF');
      return;
    }

    try {
      const selectedRoute = commuteOptions[selectedOption];
      const totalTime = calculateTotalTime(selectedRoute);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      
      // Generate HTML content for the PDF
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
              .header { background-color: #0b617e; color: white; padding: 15px; margin: -20px -20px 20px -20px; }
              .header h1 { margin: 0; font-size: 18px; }
              .header p { margin: 5px 0 0 0; font-size: 10px; opacity: 0.8; }
              h2 { color: #0b617e; font-size: 16px; margin-top: 25px; }
              .summary-box { background-color: #f0f5fa; border: 1px solid #0b617e; border-radius: 5px; padding: 15px; margin-bottom: 20px; }
              .summary-row { display: flex; margin-bottom: 8px; }
              .summary-label { font-weight: bold; width: 120px; }
              .discount-note { font-style: italic; color: #0b617e; font-size: 12px; margin-top: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th { background-color: #0b617e; color: white; padding: 8px; text-align: center; font-size: 12px; }
              td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
              tr:nth-child(even) { background-color: #f0f5fa; }
              .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #999; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Commute Journey Details</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <h2>Journey Summary</h2>
            <p><strong>Origin:</strong> ${srcLat.toFixed(4)}, ${srcLng.toFixed(4)}</p>
            <p><strong>Destination:</strong> ${destLat.toFixed(4)}, ${destLng.toFixed(4)}</p>
            
            <div class="summary-box">
              <div class="summary-row">
                <div class="summary-label">Total Distance:</div>
                <div>${formatDistance(selectedRoute.totalDistance || 0)}</div>
              </div>
              <div class="summary-row">
                <div class="summary-label">Total Time:</div>
                <div>${formatTime(totalTime, true)}</div>
              </div>
              <div class="summary-row">
                <div class="summary-label">Total Fare:</div>
                <div>${formatFare(selectedRoute.totalFare || 0)}</div>
              </div>
              <div class="summary-row">
                <div class="summary-label">Transfers:</div>
                <div>${selectedRoute.legs
                  ? selectedRoute.legs.filter(
                      (leg) =>
                        leg.type === 'walking' && leg.name && leg.name.includes('Transfer')
                    ).length
                  : 0}</div>
              </div>
              ${hasDiscount ? '<p class="discount-note">* Student/Senior/PWD discount applied to fare calculation</p>' : ''}
            </div>
            
            <h2>Journey Steps</h2>
            <table>
              <tr>
                <th>#</th>
                <th>Mode</th>
                <th>Description</th>
                <th>Distance</th>
                <th>Duration</th>
                <th>Fare</th>
              </tr>
              ${selectedRoute.legs.map((leg, index) => {
                const mode = leg.mode
                  ? leg.mode.charAt(0).toUpperCase() + leg.mode.slice(1)
                  : '';
                  
                return `
                  <tr>
                    <td style="text-align: center">${index + 1}</td>
                    <td style="text-align: center">${mode}</td>
                    <td>${leg.name || ''}</td>
                    <td style="text-align: center">${formatDistance(leg.distance || 0)}</td>
                    <td style="text-align: center">${formatTime(getLegTime(leg), true)}</td>
                    <td style="text-align: center">${formatFare(leg.fare || 0)}</td>
                    </tr>
                `;
              }).join('')}
            </table>
            
            <div class="footer">
              <p>Generated by Commute Guide - Page 1</p>
            </div>
          </body>
        </html>
      `;
      
      // Create a PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });
      
      // Share the PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Download Journey Details',
        UTI: 'com.adobe.pdf',
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  };

  // Render polylines for the selected commute option
  const renderRoutePolylines = () => {
    if (!commuteOptions || !commuteOptions.length) return null;
    
    const option = commuteOptions[selectedOption];
    if (!option || !option.legs) return null;
    
    return option.legs.map((leg, legIndex) => {
      if (!leg.path || !leg.path.coordinates) return null;
      
      const coordinates = leg.path.coordinates.map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      
      const color = COLORS[leg.mode] || COLORS.default;
      
      return (
        <Polyline
          key={`leg-${legIndex}`}
          coordinates={coordinates}
          strokeColor={color}
          strokeWidth={leg.type === 'walking' ? 3 : 6}
          strokePattern={leg.type === 'walking' ? [10, 5] : null}
          zIndex={legIndex}
        />
      );
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding the best routes...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <MaterialIcons name="error-outline" size={48} color={COLORS.secondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('Map', {
            srcLat, srcLng, destLat, destLng, hasDiscount
          })}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Commute Guide</Text>
          <Text style={styles.headerSubtitle}>Finding the best routes for your journey</Text>
        </View>
        {hasDiscount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>Discounted rates applied</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.discountButton}
            onPress={() => 
              navigation.replace('Map', {
                srcLat, 
                srcLng, 
                destLat, 
                destLng, 
                hasDiscount: true
              })
            }
          >
            <Text style={styles.discountButtonText}>Apply student/senior/PWD discount</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            region={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            toolbarEnabled={false}
          >
            {/* Source marker */}
            <Marker 
              coordinate={{
                latitude: srcLat,
                longitude: srcLng
              }}
              pinColor="blue"
              title="Source"
            />
            
            {/* Destination marker */}
            <Marker 
              coordinate={{
                latitude: destLat,
                longitude: destLng
              }}
              pinColor="red"
              title="Destination"
            />
            
            {/* Route polylines */}
            {renderRoutePolylines()}
          </MapView>
          
          {/* Map overlays */}
          <View style={styles.mapOverlays}>
            <Legend />
            <FareInformationPanel hasDiscount={hasDiscount} />
          </View>
          
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleEndJourney}
            >
              <FontAwesome5 name="check-circle" size={20} color="white" />
              <Text style={styles.primaryButtonText}>End Journey</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={generatePDF}
            >
              <FontAwesome5 name="file-pdf" size={20} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Options panel */}
        <View style={styles.optionsPanel}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Route Options</Text>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={styles.locationText}>
                Source: {srcLat.toFixed(4)}, {srcLng.toFixed(4)}
              </Text>
            </View>
            <View style={styles.locationInfo}>
              <MaterialIcons name="place" size={16} color={COLORS.secondary} />
              <Text style={styles.locationText}>
                Destination: {destLat.toFixed(4)}, {destLng.toFixed(4)}
              </Text>
            </View>
          </View>
          
          <ScrollView style={styles.optionsList}>
            {commuteOptions.length === 0 ? (
              <View style={styles.noOptions}>
                <Text style={styles.noOptionsText}>No route options found</Text>
              </View>
            ) : (
              commuteOptions.map((option, index) => {
                const totalTime = calculateTotalTime(option);
                const transferCount = option.legs ? 
                  option.legs.filter(leg => leg.type === 'walking' && leg.name && leg.name.includes('Transfer')).length : 0;
                
                return (
                  <TouchableOpacity
                    key={`option-${index}`}
                    style={[
                      styles.optionItem,
                      selectedOption === index && styles.selectedOption
                    ]}
                    onPress={() => setSelectedOption(index)}
                  >
                    <View style={styles.optionHeader}>
                      <View style={styles.optionType}>
                        {option.type === 'driving' ? (
                          <MaterialIcons name="directions-car" size={20} color={COLORS.primary} />
                        ) : option.type === 'jeepney' ? (
                          <MaterialCommunityIcons name="bus" size={20} color={COLORS.jeepney} />
                        ) : option.type === 'walking' ? (
                          <MaterialIcons name="directions-walk" size={20} color={COLORS.walking} />
                        ) : (
                          <MaterialIcons name="directions-transit" size={20} color={COLORS.primary} />
                        )}
                        <Text style={styles.optionTypeText}>
                          {option.type === 'driving'
                            ? 'Driving'
                            : option.type === 'jeepney'
                            ? 'Jeepney'
                            : option.type === 'walking'
                            ? 'Walking'
                            : `Option ${index + 1}`}
                        </Text>
                      </View>
                      <View style={styles.optionTime}>
                        <MaterialIcons name="schedule" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.optionTimeText}>{formatTime(totalTime, true)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.optionDetails}>
                      <Text style={styles.optionDistance}>{formatDistance(option.totalDistance)}</Text>
                      {transferCount > 0 && (
                        <Badge 
                          text={`${transferCount} transfer`}
                          color={COLORS.bus}
                          backgroundColor="rgba(245, 166, 35, 0.1)"
                          icon={<MaterialIcons name="transfer-within-a-station" size={12} color={COLORS.bus} />}
                        />
                      )}
                    </View>
                    
                    {option.totalFare > 0 && (
                      <View style={styles.optionFare}>
                        <Badge 
                          text={`Total Fare: ${formatFare(option.totalFare)}`}
                          color={COLORS.primary}
                          backgroundColor="rgba(11, 97, 126, 0.1)"
                          icon={<FontAwesome5 name="money-bill-wave" size={12} color={COLORS.primary} />}
                        />
                      </View>
                    )}
                    
                    <View style={styles.legsTimeline}>
                      {option.legs && option.legs.map((leg, legIndex) => (
                        <LegItem 
                          key={`leg-${legIndex}`} 
                          leg={leg} 
                          getLegTime={getLegTime}
                          isLast={legIndex === option.legs.length - 1}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  discountBadge: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  discountButton: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  discountButtonText: {
    color: COLORS.white,
    fontSize: 12,
  },
  content: {
    flex: 1,
    flexDirection: Platform.OS === 'ios' ? 'column-reverse' : 'column',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlays: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 200,
  },
  legend: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 16,
    height: 4,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fareInfoPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fareInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  fareInfoContent: {
    // Content styles
  },
  fareInfoRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  fareInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    marginRight: 4,
  },
  fareInfoValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fareInfoNote: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  fareInfoNoteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fareInfoNoteLabel: {
    fontWeight: '500',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  optionsPanel: {
    height: Platform.OS === 'ios' ? height * 0.4 : height * 0.35,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: Platform.OS === 'ios' ? 16 : 0,
    borderTopRightRadius: Platform.OS === 'ios' ? 16 : 0,
    overflow: 'hidden',
  },
  optionsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
    backgroundColor: COLORS.grey,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  optionsList: {
    flex: 1,
  },
  noOptions: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  noOptionsText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  optionItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
    padding: 12,
  },
  selectedOption: {
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
  optionTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTimeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
  },
  optionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionDistance: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  optionFare: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  legsTimeline: {
    marginTop: 12,
  },
  legItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  legTimeline: {
    alignItems: 'center',
    width: 24,
  },
  legDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  legLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  legContent: {
    flex: 1,
    marginLeft: 8,
  },
  legHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  legInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legMode: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  legTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  legName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 30,
    marginTop: 2,
  },
  legDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginLeft: 30,
  },
  legDistance: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  legFare: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
  },
});

export default Map;