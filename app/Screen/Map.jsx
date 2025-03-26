import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useRouter } from 'expo-router';

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
const API_BASE_URL = 'http://192.168.75.112:5000/api';  

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

// Component for displaying badges
const Badge = ({ text, color, backgroundColor, icon }) => {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      {icon}
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
};

// Component for displaying individual leg items
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

// Component for displaying fare information
const FareInformationPanel = ({ hasDiscount }) => {
  return (
    <TouchableOpacity style={styles.infoButton}>
      <FontAwesome5 name="info-circle" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  );
};

// Map legend component
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
  const router = useRouter();

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
  const [showFareInfo, setShowFareInfo] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [optionsPanelHeight, setOptionsPanelHeight] = useState(
    Platform.OS === 'ios' ? height * 0.35 : height * 0.3
  );
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

    // Fix center calculation (was using minLng twice)
    setMapRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
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
    
        // Mock data for testing when API is not available
        const mockOptions = [
          {
            type: 'mixed',
            legs: [
              {
                type: 'walking',
                mode: 'walking',
                name: 'Walk to bus stop',
                distance: 0.5,
                path: {
                  type: 'LineString',
                  coordinates: [
                    [srcLng, srcLat],
                    [srcLng + 0.002, srcLat + 0.001]
                  ]
                }
              },
              {
                type: 'transit',
                mode: 'bus',
                name: 'Express Bus to Downtown',
                ref: '102',
                distance: 4.5,
                path: {
                  type: 'LineString',
                  coordinates: [
                    [srcLng + 0.002, srcLat + 0.001],
                    [destLng - 0.003, destLat - 0.002]
                  ]
                }
              },
              {
                type: 'walking',
                mode: 'walking',
                name: 'Walk to destination',
                distance: 0.3,
                path: {
                  type: 'LineString',
                  coordinates: [
                    [destLng - 0.003, destLat - 0.002],
                    [destLng, destLat]
                  ]
                }
              }
            ]
          },
          {
            type: 'driving',
            legs: [
              {
                type: 'driving',
                mode: 'driving',
                name: 'Drive to destination',
                distance: 5.2,
                path: {
                  type: 'LineString',
                  coordinates: [
                    [srcLng, srcLat],
                    [destLng, destLat]
                  ]
                }
              }
            ]
          }
        ];
        
        try {
          // Define API endpoint
          const API_URL = `${API_BASE_URL}/routes/commute/guide`;
          
          // Payload format based on API requirements
          const payload = {
            source_lat: srcLat,
            source_lon: srcLng,
            dest_lat: destLat,
            dest_lon: destLng,
            discount: hasDiscount
          };
          
          console.log('Sending payload:', payload);
          
          const response = await axios.post(API_URL, payload, {
            timeout: 10000 // 10 seconds timeout
          });
      
          if (!response.data || !response.data.success) {
            throw new Error(response.data?.message || 'Failed to fetch route data');
          }
          
          console.log('Enhancing routes from API...');
          const enhancedOptions = await enhanceRoutes(response.data.options || []);
          setCommuteOptions(enhancedOptions);
        } catch (apiError) {
          console.warn('API error, using mock data:', apiError);
          // Use mock data as fallback when API fails
          console.log('Enhancing mock routes...');
          const enhancedOptions = await enhanceRoutes(mockOptions);
          setCommuteOptions(enhancedOptions);
        }
    
        calculateMapRegion(
          commuteOptions,
          [srcLat, srcLng],
          [destLat, destLng]
        );
      } catch (err) {
        console.error('Error fetching commute guide:', err);
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
          onPress: () => router.replace('/Screen/Dashboard')  // Navigate to home using Expo Router
        },
        {
          text: 'Yes, leave a review',
          onPress: () => router.push('/Screen/Review')  // Navigate to review screen using Expo Router
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

  // Toggle options panel height for better map visibility
  const toggleOptionsPanel = () => {
    setOptionsPanelHeight(
      optionsPanelHeight > height * 0.2 
        ? height * 0.15 
        : Platform.OS === 'ios' ? height * 0.35 : height * 0.3
    );
  };

  // Render fare information modal
  const renderFareInfoModal = () => {
    if (!showFareInfo) return null;
    
    return (
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFareInfo(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Fare Information</Text>
          
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
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowFareInfo(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Main loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding the best routes...</Text>
      </SafeAreaView>
    );
  }

  // Error state
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

  // Calculate totals for selected option
  const selectedCommuteOption = commuteOptions[selectedOption] || {};
  const totalTime = calculateTotalTime(selectedCommuteOption);
  const totalDistance = selectedCommuteOption.totalDistance || 0;
  const totalFare = selectedCommuteOption.totalFare || 0;
  const transferCount = selectedCommuteOption.legs
    ? selectedCommuteOption.legs.filter(
        (leg) => leg.type === 'walking' && leg.name && leg.name.includes('Transfer')
      ).length
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Commute Guide</Text>
          {hasDiscount && (
            <Text style={styles.discountApplied}>Discounted rates applied</Text>
          )}
        </View>
        
        {!hasDiscount && (
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
            <Text style={styles.discountButtonText}>Apply Discount</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Map container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={mapRegion}
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
        
        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControl}
            onPress={() => setShowLegend(!showLegend)}
          >
            <MaterialIcons name="layers" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControl}
            onPress={() => setShowFareInfo(true)}
          >
            <MaterialIcons name="info-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControl}
            onPress={() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(mapRegion, 500);
              }
            }}
          >
            <MaterialIcons name="my-location" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Legend overlay */}
        {showLegend && (
          <View style={styles.legendContainer}>
            <Legend />
          </View>
        )}
        
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEndJourney}
          >
            <MaterialIcons name="check-circle" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>End Journey</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={generatePDF}
          >
            <FontAwesome5 name="file-pdf" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryActionText}>Save as PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Options panel */}
      <View style={[styles.optionsPanel, { height: optionsPanelHeight }]}>
        {/* Panel header with drag indicator */}
        <TouchableOpacity 
          style={styles.panelDragHandle}
          onPress={toggleOptionsPanel}
        >
          <View style={styles.dragIndicator} />
          
          {/* Summary info */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="schedule" size={16} color={COLORS.primary} />
              <Text style={styles.summaryText}>{formatTime(totalTime, true)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <MaterialIcons name="straighten" size={16} color={COLORS.primary} />
              <Text style={styles.summaryText}>{formatDistance(totalDistance)}</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <FontAwesome5 name="money-bill-wave" size={14} color={COLORS.primary} />
              <Text style={styles.summaryText}>{formatFare(totalFare)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Route options */}
        <View style={styles.options}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsScroll}
          >
            {commuteOptions.map((option, index) => (
              <TouchableOpacity
                key={`option-${index}`}
                style={[
                  styles.optionButton,
                  selectedOption === index && styles.selectedOptionButton
                ]}
                onPress={() => setSelectedOption(index)}
              >
                <Text style={[
                  styles.optionButtonText,
                  selectedOption === index && styles.selectedOptionText
                ]}>
                  Option {index + 1}
                </Text>
                <Text style={[
                  styles.optionButtonTime,
                  selectedOption === index && styles.selectedOptionText
                ]}>
                  {formatTime(calculateTotalTime(option), true)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Route details */}
        <ScrollView style={styles.routeDetails}>
          {selectedCommuteOption.legs && selectedCommuteOption.legs.map((leg, legIndex) => (
            <LegItem 
              key={`leg-${legIndex}`} 
              leg={leg} 
              getLegTime={getLegTime}
            />
          ))}
        </ScrollView>
      </View>
      
      {/* Fare info modal */}
      {renderFareInfoModal()}
    </SafeAreaView>
  );
};

// Optimized styles
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  discountApplied: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.8,
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
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapControl: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
  },
  legendContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legend: {},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  legendColor: {
    width: 14,
    height: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    width: width * 0.85,
    maxHeight: height * 0.7,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  fareInfoContent: {
    marginBottom: 16,
  },
  fareInfoRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  fareInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    width: 110,
  },
  fareInfoValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  fareInfoNote: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
  },
  fareInfoNoteText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  fareInfoNoteLabel: {
    fontWeight: '500',
    color: COLORS.primary,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 8,
  },
  secondaryAction: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryActionText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 8,
  },
  optionsPanel: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  panelDragHandle: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.greyDark,
    borderRadius: 2,
    marginBottom: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: 6,
  },
  summaryDivider: {
    height: 16,
    width: 1,
    backgroundColor: COLORS.greyDark,
  },
  options: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyDark,
  },
  optionsScroll: {
    paddingHorizontal: 12,
  },
  optionButton: {
    backgroundColor: COLORS.grey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
    marginRight: 10,
    alignItems: 'center',
  },
  selectedOptionButton: {
    backgroundColor: COLORS.primary,
  },
  optionButtonText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
  },
  optionButtonTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  selectedOptionText: {
    color: COLORS.white,
  },
  routeDetails: {
    flex: 1,
    padding: 12,
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
  legItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  legTimeline: {
    alignItems: 'center',
    width: 20,
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
    color: COLORS.text,
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