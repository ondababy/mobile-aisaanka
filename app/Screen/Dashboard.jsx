import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import * as Location from 'expo-location';
import { 
  MaterialIcons, 
  Ionicons, 
  FontAwesome5, 
  MaterialCommunityIcons,
  Feather
} from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Import Sidebar component
import Sidebar from '../Components/Sidebar';

// Define theme colors
const theme = {
  colors: {
    primary: '#0b617e',
    secondary: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#334155',
    textSecondary: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    lightGray: '#F1F5F9',
    border: '#E2E8F0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
  },
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 26,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
};

// Initial data structures
const initialWeatherData = {
  location: "",
  currentTemperature: 0,
  heatIndex: 0,
  humidity: 0,
  chanceOfRain: 0,
  rainIntensity: "",
  weatherCondition: "",
  forecast: [],
};

const initialTrafficData = {
  currentTrafficLevel: "",
  trafficScore: 0,
  estimatedDelays: "",
  roadConditions: "",
  majorAlerts: [],
  lastUpdated: "",
  historicalData: [],
  isReal: false,
};

const { width } = Dimensions.get('window');
// Make sidebar narrower in collapsed state for mobile
const DRAWER_COLLAPSED_WIDTH = 60;
// Reduce expanded width on mobile to save space
const DRAWER_EXPANDED_WIDTH = Platform.OS === 'ios' || Platform.OS === 'android' 
  ? width * 0.7 
  : width * 0.8;

function Dashboard({ navigation }) {
  // Original dashboard state
  const [weatherData, setWeatherData] = useState(initialWeatherData);
  const [trafficData, setTrafficData] = useState(initialTrafficData);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [userLocation, setUserLocation] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState({
    weather: new Date(),
    traffic: new Date(),
  });
  const [refreshing, setRefreshing] = useState(false);
  
  // Sidebar state - default to closed for mobile
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  
  // Animation values
  const contentMargin = useRef(new Animated.Value(DRAWER_COLLAPSED_WIDTH)).current;
  const contentScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // For handling scroll view references 
  const scrollViewRef = useRef(null);

  // Handle sidebar toggle
  const handleSidebarToggle = (isExpanded) => {
    setSidebarExpanded(isExpanded);
    setOverlayVisible(isExpanded);
    
    // On mobile, use overlay and scaling for better space usage
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Animated.parallel([
        // Slightly scale down content when sidebar is open
        Animated.timing(contentScale, {
          toValue: isExpanded ? 0.92 : 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Fade in/out overlay
        Animated.timing(overlayOpacity, {
          toValue: isExpanded ? 0.5 : 0,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // On larger screens, push content to the side
      Animated.timing(contentMargin, {
        toValue: isExpanded ? DRAWER_EXPANDED_WIDTH : DRAWER_COLLAPSED_WIDTH,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  // Close sidebar when clicking overlay
  const handleOverlayPress = () => {
    if (sidebarExpanded) {
      setSidebarExpanded(false);
      handleSidebarToggle(false);
    }
  };

  // Initial data loading on component mount
  useEffect(() => {
    console.log("🚀 Dashboard initialized");
    getUserLocation();
  }, []);

  // Fetch data when coordinates are available
  useEffect(() => {
    if (userCoords) {
      console.log("📍 User coordinates updated, fetching fresh data");
      fetchWeatherData(userCoords);
      fetchTrafficData(userCoords);
    }
  }, [userCoords]);

  // Set up auto-refresh intervals
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    console.log("🔄 Setting up auto-refresh...");

    // Refresh weather data every 15 minutes
    const weatherRefreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing weather data...");
      if (userCoords) {
        fetchWeatherData(userCoords);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Refresh traffic data every 5 minutes
    const trafficRefreshInterval = setInterval(() => {
      console.log("🔄 Auto-refreshing traffic data...");
      if (userCoords) {
        fetchTrafficData(userCoords);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up intervals on component unmount
    return () => {
      clearInterval(weatherRefreshInterval);
      clearInterval(trafficRefreshInterval);
    };
  }, [userCoords, autoRefreshEnabled]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getUserLocation().then(() => {
      if (userCoords) {
        Promise.all([
          fetchWeatherData(userCoords),
          fetchTrafficData(userCoords)
        ]).then(() => {
          setRefreshing(false);
        });
      } else {
        setRefreshing(false);
      }
    });
  }, [userCoords]);

  // Get user's current location using expo-location
  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    console.log("🔍 Attempting to get user location...");

    try {
      // Request permission first
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log("⚠️ Location permission denied");
        setLocationError("Unable to access your location. Using default location.");
        setLocationLoading(false);
        setUserCoords({ lat: 14.5995, lng: 120.9842 });
        setUserLocation("Manila, Philippines");
        console.log("⚠️ Using default location: Manila, Philippines");
        return;
      }
      
      // Get current position
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      console.log("📍 User coordinates obtained:", { latitude, longitude });
      setUserCoords({ lat: latitude, lng: longitude });
      
      // Reverse geocode to get address
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        if (geocode && geocode.length > 0) {
          const address = geocode[0];
          console.log("🏙️ Geocoding result:", address);
          
          // Format a nice address string
          let locationName;
          
          if (address.city) {
            if (address.district) {
              locationName = `${address.district}, ${address.city}`;
            } else {
              locationName = address.city;
            }
          } else if (address.region) {
            locationName = address.region;
          } else {
            locationName = "Philippines";
          }
          
          console.log("📍 Formatted location name:", locationName);
          setUserLocation(locationName);
        } else {
          // Fallback
          setUserLocation("Philippines");
        }
      } catch (error) {
        console.error("❌ Error in reverse geocoding:", error);
        setUserLocation("Philippines");
      }
      
      setLocationLoading(false);
    } catch (error) {
      console.error("❌ Error getting location:", error);
      setLocationError("Unable to access your location. Using default location.");
      setLocationLoading(false);
      setUserCoords({ lat: 14.5995, lng: 120.9842 });
      setUserLocation("Manila, Philippines");
      console.log("⚠️ Using default location: Manila, Philippines");
    }
    
    return Promise.resolve(); // For chaining in onRefresh
  };

  // Fetch real-time weather data from OpenMeteo API
  const fetchWeatherData = async (coords) => {
    try {
      setWeatherLoading(true);
      console.log("☁️ Fetching weather data from OpenMeteo API...");

      // Using OpenMeteo API - completely free and open-source weather data
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=1`,
        {
          timeout: 10000,
        }
      );

      const data = response.data;
      if (!data || !data.current) {
        throw new Error("Invalid weather data received");
      }

      console.log("🌤️ OpenMeteo API response received:", data);

      // Process current weather data
      const current = data.current;

      // Map weather code to conditions
      const weatherConditions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow fall",
        73: "Moderate snow fall",
        75: "Heavy snow fall",
        77: "Snow grains",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
      };
      const weatherCondition =
        weatherConditions[current.weather_code] || "Unknown";
      console.log(
        "☀️ Current weather condition:",
        weatherCondition,
        "code:",
        current.weather_code
      );

      // Determine chance of rain
      let chanceOfRain = 0;
      if (data.hourly && data.hourly.precipitation_probability) {
        // Get the precipitation probability for current hour
        const currentHour = new Date().getHours();
        chanceOfRain = data.hourly.precipitation_probability[currentHour];
        console.log("💧 Current chance of rain:", chanceOfRain + "%");
      }

      // Determine rain intensity based on current precipitation
      let rainIntensity = "None";
      if (current.precipitation) {
        const rainAmount = current.precipitation; // mm per hour
        if (rainAmount < 0.5) {
          rainIntensity = "None";
        } else if (rainAmount < 2.5) {
          rainIntensity = "Light";
        } else if (rainAmount < 7.6) {
          rainIntensity = "Moderate";
        } else if (rainAmount < 50) {
          rainIntensity = "Heavy";
        } else {
          rainIntensity = "Violent";
        }
        console.log(
          "🌧️ Current precipitation:",
          current.precipitation,
          "mm/h -",
          rainIntensity
        );
      }

      // Format forecast for next few hours
      const hourlyForecast = [];
      if (data.hourly) {
        const currentHour = new Date().getHours();

        for (let i = 0; i < 5; i++) {
          const hourIndex = currentHour + i;
          if (hourIndex < data.hourly.time.length) {
            const date = new Date(data.hourly.time[hourIndex]);
            const hours = date.getHours();
            const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
            const ampm = hours >= 12 ? "PM" : "AM";

            hourlyForecast.push({
              time: i === 0 ? "Now" : `${formattedHours}${ampm}`,
              temp: Math.round(data.hourly.temperature_2m[hourIndex]),
              condition:
                weatherConditions[data.hourly.weather_code[hourIndex]] ||
                "Unknown",
              rainChance: data.hourly.precipitation_probability[hourIndex],
            });
          }
        }
        console.log("📅 Hourly forecast processed:", hourlyForecast);
      }

      // Construct the complete weather data
      const formattedWeatherData = {
        location: userLocation,
        currentTemperature: Math.round(current.temperature_2m),
        heatIndex: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        chanceOfRain: chanceOfRain,
        rainIntensity: rainIntensity,
        weatherCondition: weatherCondition,
        forecast: hourlyForecast,
        lastUpdated: new Date().toLocaleTimeString(),
        windSpeed: current.wind_speed_10m || 0,
      };

      console.log("✅ Weather data formatted and ready:", formattedWeatherData);
      setWeatherData(formattedWeatherData);
      setWeatherLoading(false);
      setLastUpdated((prev) => ({ ...prev, weather: new Date() }));
    } catch (error) {
      console.error("❌ Error fetching weather data:", error);
      setWeatherLoading(false);
      console.log("⚠️ Using default weather data due to API error");
    }
    
    return Promise.resolve(); // For chaining with onRefresh
  };

  // Generate simulated traffic data
  const fetchTrafficData = async (coords) => {
    try {
      setTrafficLoading(true);
      console.log("🚗 Starting to fetch traffic data...");

      // Generate historical traffic data based on time of day (for the line chart)
      const generateHistoricalData = () => {
        const currentHour = new Date().getHours();
        const data = [];

        // Create 12 hours of data points (past 6 hours and next 6 hours)
        for (let i = -6; i <= 6; i++) {
          const hour = (currentHour + i + 24) % 24; // Ensure positive hours
          const hourLabel =
            hour >= 12
              ? `${hour === 12 ? 12 : hour % 12}PM`
              : `${hour === 0 ? 12 : hour}AM`;

          // Create a realistic traffic pattern that peaks during rush hours
          let baseScore;

          if (hour >= 7 && hour <= 9) {
            // Morning rush hour
            baseScore = 70 + Math.random() * 20;
          } else if (hour >= 16 && hour <= 19) {
            // Evening rush hour
            baseScore = 75 + Math.random() * 20;
          } else if (hour >= 10 && hour <= 15) {
            // Midday
            baseScore = 40 + Math.random() * 20;
          } else if (hour >= 20 && hour <= 23) {
            // Evening
            baseScore = 30 + Math.random() * 15;
          } else {
            // Late night/early morning
            baseScore = 10 + Math.random() * 15;
          }

          // Current hour is actual score, others are simulated
          const score = Math.round(baseScore);

          data.push({
            time: hourLabel,
            score: score,
            current: i === 0,
          });
        }

        return data;
      };
      
      // Determine traffic level and score
      const currentHour = new Date().getHours();
      let trafficLevel, trafficScore;
      
      if (currentHour >= 7 && currentHour <= 9) {
        // Morning rush hour
        trafficLevel = "Heavy";
        trafficScore = Math.floor(Math.random() * 30) + 70; // 70-100
      } else if (currentHour >= 16 && currentHour <= 19) {
        // Evening rush hour
        trafficLevel = "Heavy";
        trafficScore = Math.floor(Math.random() * 30) + 70; // 70-100
      } else if (currentHour >= 10 && currentHour <= 15) {
        // Midday
        trafficLevel = "Moderate";
        trafficScore = Math.floor(Math.random() * 30) + 40; // 40-70
      } else {
        // Late night/early morning
        trafficLevel = "Light";
        trafficScore = Math.floor(Math.random() * 30) + 10; // 10-40
      }

      // Determine estimated delays based on traffic score
      let estimatedDelays;
      if (trafficScore > 80) {
        estimatedDelays = "30+ minutes";
      } else if (trafficScore > 60) {
        estimatedDelays = "20-30 minutes";
      } else if (trafficScore > 40) {
        estimatedDelays = "10-20 minutes";
      } else if (trafficScore > 20) {
        estimatedDelays = "5-10 minutes";
      } else {
        estimatedDelays = "No significant delays";
      }

      // Process road conditions based on weather
      const roadConditions =
        weatherData.weatherCondition &&
        (weatherData.weatherCondition.toLowerCase().includes("rain") ||
          weatherData.weatherCondition.toLowerCase().includes("drizzle") ||
          weatherData.weatherCondition.toLowerCase().includes("shower"))
          ? `Wet roads due to ${weatherData.weatherCondition.toLowerCase()}`
          : "Normal road conditions";
      
      // Generate major alerts
      const majorAlerts = [
        {
          location: "EDSA",
          condition: "Usual congestion",
          delay: "15 min",
        },
        {
          location: "C5 Road",
          condition: "Moderate traffic",
          delay: "10 min",
        },
        {
          location: userLocation.split(",")[0] || "Local area",
          condition: "Light traffic",
          delay: "5 min",
        },
      ];

      // Create the traffic data object
      const trafficData = {
        currentTrafficLevel: trafficLevel,
        trafficScore,
        estimatedDelays,
        roadConditions,
        majorAlerts,
        lastUpdated: new Date().toLocaleTimeString(),
        historicalData: generateHistoricalData(),
        isReal: false, // This is simulated data
      };

      console.log("✅ Traffic data ready:", trafficData);
      setTrafficData(trafficData);
      setLastUpdated((prev) => ({ ...prev, traffic: new Date() }));
      setTrafficLoading(false);

    } catch (error) {
      console.error("❌ Error generating traffic data:", error);
      
      // Use basic fallback traffic data
      const fallbackTrafficData = {
        currentTrafficLevel: "Moderate",
        trafficScore: 50,
        estimatedDelays: "5-15 minutes",
        roadConditions: "Normal road conditions",
        majorAlerts: [
          {
            location: "EDSA",
            condition: "Usual congestion",
            delay: "15 min",
          },
          {
            location: "C5 Road",
            condition: "Moderate traffic",
            delay: "10 min",
          },
          {
            location: "Local area",
            condition: "Light traffic",
            delay: "5 min",
          },
        ],
        lastUpdated: new Date().toLocaleTimeString(),
        historicalData: Array(12)
          .fill(0)
          .map((_, i) => ({
            time: `${i}:00`,
            score: Math.floor(Math.random() * 70) + 30,
            current: i === new Date().getHours(),
          })),
        isReal: false,
      };

      setTrafficData(fallbackTrafficData);
      setLastUpdated((prev) => ({ ...prev, traffic: new Date() }));
      setTrafficLoading(false);
    }
    
    return Promise.resolve(); // For chaining in onRefresh
  };

  // Helper to determine traffic color
  const getTrafficColor = (score) => {
    if (score > 70) return theme.colors.error; // Red for heavy traffic
    if (score > 40) return theme.colors.warning; // Orange for moderate
    return theme.colors.success; // Green for light
  };

  // Format time since last update
  const formatLastUpdated = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin === 1) return "1 minute ago";
    if (diffMin < 60) return `${diffMin} minutes ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour === 1) return "1 hour ago";
    return `${diffHour} hours ago`;
  };
  
  // Weather icon mapper
  const getWeatherIcon = (condition) => {
    if (!condition) return <Ionicons name="partly-sunny" size={42} color="#F59E0B" />;
    
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      return <Ionicons name="sunny" size={42} color="#F59E0B" />;
    } else if (conditionLower.includes('partly cloudy') || conditionLower.includes('mainly clear')) {
      return <Ionicons name="partly-sunny" size={42} color="#F59E0B" />;
    } else if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
      return <Ionicons name="cloudy" size={42} color="#64748B" />;
    } else if (conditionLower.includes('fog')) {
      return <MaterialCommunityIcons name="weather-fog" size={42} color="#94A3B8" />;
    } else if (
      conditionLower.includes('drizzle') || 
      conditionLower.includes('rain') || 
      conditionLower.includes('shower')
    ) {
      return <Ionicons name="rainy" size={42} color="#3B82F6" />;
    } else if (conditionLower.includes('snow')) {
      return <Ionicons name="snow" size={42} color="#E2E8F0" />;
    } else if (conditionLower.includes('thunder')) {
      return <Ionicons name="thunderstorm" size={42} color="#6366F1" />;
    } else {
      return <Ionicons name="partly-sunny" size={42} color="#F59E0B" />;
    }
  };
  
  // Get forecast icon (smaller version)
  const getForecastIcon = (condition) => {
    if (!condition) return <Ionicons name="partly-sunny" size={24} color="#F59E0B" />;
    
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      return <Ionicons name="sunny" size={24} color="#F59E0B" />;
    } else if (conditionLower.includes('partly cloudy') || conditionLower.includes('mainly clear')) {
      return <Ionicons name="partly-sunny" size={24} color="#F59E0B" />;
    } else if (conditionLower.includes('cloudy') || conditionLower.includes('overcast')) {
      return <Ionicons name="cloudy" size={24} color="#64748B" />;
    } else if (conditionLower.includes('fog')) {
      return <MaterialCommunityIcons name="weather-fog" size={24} color="#94A3B8" />;
    } else if (
      conditionLower.includes('drizzle') || 
      conditionLower.includes('rain') || 
      conditionLower.includes('shower')
    ) {
      return <Ionicons name="rainy" size={24} color="#3B82F6" />;
    } else if (conditionLower.includes('snow')) {
      return <Ionicons name="snow" size={24} color="#E2E8F0" />;
    } else if (conditionLower.includes('thunder')) {
      return <Ionicons name="thunderstorm" size={24} color="#6366F1" />;
    } else {
      return <Ionicons name="partly-sunny" size={24} color="#F59E0B" />;
    }
  };

  return (
    <View style={styles.rootContainer}>
      {/* Background overlay when sidebar is expanded (mobile only) */}
      {(Platform.OS === 'ios' || Platform.OS === 'android') && (
        <Animated.View 
          style={[
            styles.overlay,
            { 
              opacity: overlayOpacity,
              // Only show/register touches when sidebar is expanded
              pointerEvents: sidebarExpanded ? 'auto' : 'none'
            }
          ]}
          onTouchEnd={handleOverlayPress}
        />
      )}

      {/* Sidebar Component */}
      <View style={styles.sidebarContainer}>
        <Sidebar isExpanded={sidebarExpanded} onToggle={handleSidebarToggle} />
      </View>

      {/* Main Content */}
      {(Platform.OS === 'ios' || Platform.OS === 'android') ? (
        // Mobile Layout - Scale the content when sidebar is open
        <Animated.View 
          style={[
            styles.mainContainer,
            { 
              transform: [{ scale: contentScale }],
              // Add a small margin to account for collapsed sidebar
              marginLeft: DRAWER_COLLAPSED_WIDTH,
            }
          ]}
        >
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {/* Header Section */}
              <LinearGradient
                colors={['#0b617e', '#1a8cad']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>WELCOME TO AISAANKA</Text>
                    <View style={styles.headerSubtitleContainer}>
                      <View style={styles.statusDot} />
                      <Text style={styles.headerSubtitle}>Your AI-Powered Commuting Guide</Text>
                    </View>
                    <View style={styles.headerDescriptionContainer}>
                      <Text style={styles.headerDescription}>
                        Access real-time weather and traffic data for your current location in Metro Manila. 
                        Plan your commute smarter with accurate, up-to-date information.
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Weather Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="sunny" size={22} color={theme.colors.warning} />
                    <Text style={styles.cardTitle}>Weather Information</Text>
                    {weatherLoading && (
                      <ActivityIndicator size="small" color={theme.colors.primary} style={{marginLeft: 8}} />
                    )}
                  </View>
                  
                  <View style={styles.chipContainer}>
                    <Text style={styles.dataSourceChip}>Real-time Data</Text>
                  </View>
                </View>

                {locationError && (
                  <View style={styles.alertContainer}>
                    <Ionicons name="warning" size={20} color={theme.colors.warning} />
                    <Text style={styles.alertText}>{locationError}</Text>
                  </View>
                )}

                {locationLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : weatherLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : (
                  <>
                    <View style={styles.locationContainer}>
                      <Text style={styles.sectionLabel}>Current Location</Text>
                      <View style={styles.locationRow}>
                        <MaterialIcons name="location-on" size={16} color={theme.colors.primary} />
                        <Text style={styles.locationText}>{userLocation || "Detecting location..."}</Text>
                        <TouchableOpacity 
                          style={styles.refreshButton} 
                          onPress={getUserLocation}
                          disabled={locationLoading}
                        >
                          <MaterialIcons name="refresh" size={16} color={theme.colors.secondary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.weatherMainContainer}>
                      <View style={styles.weatherMainLeft}>
                        {getWeatherIcon(weatherData.weatherCondition)}
                        <View style={styles.temperatureContainer}>
                          <Text style={styles.temperatureText}>{weatherData.currentTemperature}°C</Text>
                          <Text style={styles.feelsLikeText}>Feels like {weatherData.heatIndex}°C</Text>
                        </View>
                      </View>
                      
                      <View style={styles.weatherMainRight}>
                        <View style={styles.weatherDetail}>
                          <MaterialCommunityIcons name="weather-cloudy" size={16} color={theme.colors.secondary} />
                          <Text style={styles.weatherDetailLabel}>Weather Condition</Text>
                          <Text style={styles.weatherDetailValue}>{weatherData.weatherCondition}</Text>
                        </View>
                        
                        <View style={styles.weatherDetail}>
                          <MaterialCommunityIcons name="water-percent" size={16} color={theme.colors.info} />
                          <Text style={styles.weatherDetailLabel}>Humidity</Text>
                          <Text style={styles.weatherDetailValue}>{weatherData.humidity}%</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.rainfallContainer}>
                      <View style={styles.rainfallHeader}>
                        <Ionicons name="water" size={16} color={theme.colors.info} />
                        <Text style={styles.rainfallLabel}>Chance of Rainfall: </Text>
                        <Text style={styles.rainfallValue}>{weatherData.chanceOfRain}%</Text>
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View style={[
                          styles.progressBar, 
                          { 
                            width: `${weatherData.chanceOfRain}%`, 
                            backgroundColor: weatherData.chanceOfRain > 70 
                              ? theme.colors.info 
                              : weatherData.chanceOfRain > 40 
                                ? '#60A5FA' 
                                : '#93C5FD' 
                          }
                        ]} />
                      </View>
                    </View>

                    {weatherData.chanceOfRain > 50 && (
                      <View style={styles.alertInfoContainer}>
                        <Ionicons name="information-circle" size={20} color={theme.colors.info} />
                        <Text style={styles.alertInfoText}>
                          <Text style={{fontWeight: theme.fontWeights.bold}}>Rainfall Alert: </Text>
                          {weatherData.rainIntensity} rain expected. Don't forget your umbrella!
                        </Text>
                      </View>
                    )}

                    <View style={styles.forecastContainer}>
                      <Text style={styles.forecastTitle}>Forecast Next Few Hours</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.forecastScrollContent}
                      >
                        {weatherData.forecast.map((item, index) => (
                          <View 
                            key={index} 
                            style={[
                              styles.forecastItem, 
                              index === 0 ? styles.forecastItemCurrent : null
                            ]}
                          >
                            <Text style={[styles.forecastTime, index === 0 ? styles.forecastTimeCurrent : null]}>
                              {item.time}
                            </Text>
                            {getForecastIcon(item.condition)}
                            <Text style={styles.forecastTemp}>{item.temp}°C</Text>
                            <View style={styles.forecastRainChance}>
                              <Ionicons name="water" size={12} color={theme.colors.info} />
                              <Text style={styles.forecastRainText}>{item.rainChance}%</Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>

                    <Text style={styles.lastUpdatedText}>
                      Updated: {formatLastUpdated(lastUpdated.weather)}
                    </Text>
                  </>
                )}
              </View>

              {/* Traffic Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleContainer}>
                    <MaterialIcons 
                      name="traffic" 
                      size={22} 
                      color={getTrafficColor(trafficData.trafficScore)} 
                    />
                    <Text style={styles.cardTitle}>Traffic Conditions</Text>
                    {trafficLoading && (
                      <ActivityIndicator size="small" color={theme.colors.primary} style={{marginLeft: 8}} />
                    )}
                  </View>
                  
                  <View style={styles.chipContainer}>
                    <Text style={[
                      styles.dataSourceChip, 
                      trafficData.isReal ? styles.dataSourceReal : styles.dataSourceEstimated
                    ]}>
                      {trafficData.isReal ? "Real-time Data" : "Estimated Data"}
                    </Text>
                  </View>
                </View>

                {locationLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : trafficLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                  </View>
                ) : (
                  <>
                    <View style={styles.trafficMainContainer}>
                      <View style={styles.trafficMainLeft}>
                        <View style={[
                          styles.trafficAvatar, 
                          { backgroundColor: getTrafficColor(trafficData.trafficScore) }
                        ]}>
                          <MaterialIcons name="directions-car" size={24} color="#FFF" />
                        </View>
                        <View style={styles.trafficLevelContainer}>
                          <Text style={styles.trafficLevelText}>{trafficData.currentTrafficLevel}</Text>
                          <Text style={styles.trafficDelayText}>
                            Delays: 
                            <Text style={[
                              styles.trafficDelayValue,
                              { color: getTrafficColor(trafficData.trafficScore) }
                            ]}>
                              {' '}{trafficData.estimatedDelays}
                            </Text>
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.trafficMainRight}>
                        <Text style={styles.roadConditionsLabel}>Road Conditions</Text>
                        <Text style={styles.roadConditionsValue}>{trafficData.roadConditions}</Text>
                      </View>
                    </View>

                    <View style={styles.trafficScoreContainer}>
                      <Text style={styles.trafficScoreLabel}>
                        Traffic Score: 
                        <Text style={{ color: getTrafficColor(trafficData.trafficScore) }}>
                          {' '}{trafficData.trafficScore}/100
                        </Text>
                      </Text>
                      
                      {/* Traffic chart */}
                      <View style={styles.trafficChartContainer}>
                        {trafficData.historicalData && trafficData.historicalData.length > 0 && (
                          <LineChart
                            data={{
                              labels: trafficData.historicalData.map(item => item.time),
                              datasets: [
                                {
                                  data: trafficData.historicalData.map(item => item.score)
                                }
                              ]
                            }}
                            // Make chart slightly narrower on mobile to accommodate smaller sidebar
                            width={(width - (Platform.OS === 'ios' || Platform.OS === 'android' ? 70 : 40))}
                            height={160}
                            yAxisSuffix=""
                            yAxisInterval={1}
                            chartConfig={{
                              backgroundColor: '#FFF',
                              backgroundGradientFrom: '#FFF',
                              backgroundGradientTo: '#FFF',
                              decimalPlaces: 0,
                              color: (opacity = 1) => getTrafficColor(trafficData.trafficScore),
                              labelColor: (opacity = 1) => theme.colors.secondary,
                              style: {
                                borderRadius: 16
                              },
                              propsForDots: {
                                r: "4",
                                strokeWidth: "2",
                                stroke: getTrafficColor(trafficData.trafficScore)
                              }
                            }}
                            bezier
                            style={styles.trafficChart}
                          />
                        )}
                      </View>
                      
                      <View style={styles.trafficLegendContainer}>
                        <View style={styles.trafficLegendItem}>
                          <View style={[styles.trafficLegendColor, { backgroundColor: theme.colors.success }]} />
                          <Text style={styles.trafficLegendText}>Light</Text>
                        </View>
                        <View style={styles.trafficLegendItem}>
                        <View style={[styles.trafficLegendColor, { backgroundColor: theme.colors.warning }]} />
                          <Text style={styles.trafficLegendText}>Moderate</Text>
                        </View>
                        <View style={styles.trafficLegendItem}>
                          <View style={[styles.trafficLegendColor, { backgroundColor: theme.colors.error }]} />
                          <Text style={styles.trafficLegendText}>Heavy</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <Text style={styles.alertsTitle}>Major Traffic Alerts</Text>
                    
                    {trafficData.majorAlerts.map((alert, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.alertItem,
                          index % 2 === 0 ? styles.alertItemEven : styles.alertItemOdd
                        ]}
                      >
                        <View style={styles.alertItemContent}>
                          <Text style={styles.alertLocationText}>{alert.location}</Text>
                          <Text style={styles.alertConditionText}>{alert.condition}</Text>
                        </View>
                        <View style={[
                          styles.alertDelayChip,
                          alert.delay.includes("30") || parseInt(alert.delay) >= 30
                            ? styles.alertDelayHigh
                            : alert.delay.includes("15") || parseInt(alert.delay) >= 15
                              ? styles.alertDelayMedium
                              : styles.alertDelayLow
                        ]}>
                          <Text style={[
                            styles.alertDelayText,
                            alert.delay.includes("30") || parseInt(alert.delay) >= 30
                              ? styles.alertDelayTextHigh
                              : alert.delay.includes("15") || parseInt(alert.delay) >= 15
                                ? styles.alertDelayTextMedium
                                : styles.alertDelayTextLow
                          ]}>
                            {alert.delay}
                          </Text>
                        </View>
                      </View>
                    ))}
                    
                    <Text style={styles.lastUpdatedText}>
                      Updated: {formatLastUpdated(lastUpdated.traffic)}
                    </Text>
                  </>
                )}
              </View>
              
              {/* Auto-refresh Indicator - Positioned higher on mobile for better visibility */}
              <View style={styles.autoRefreshContainer}>
                <View style={styles.autoRefreshChip}>
                  <MaterialIcons name="schedule" size={12} color="#FFF" />
                  <Text style={styles.autoRefreshText}>Auto-refreshing</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.bottomSpacer} />
          </SafeAreaView>
        </Animated.View>
      ) : (
        // Desktop Layout - Push content to the side
        <Animated.View style={[
          styles.mainContainer,
          { marginLeft: contentMargin }
        ]}>
          <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {/* Header Section */}
              <LinearGradient
                colors={['#0b617e', '#1a8cad']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>WELCOME TO AISAANKA</Text>
                    <View style={styles.headerSubtitleContainer}>
                      <View style={styles.statusDot} />
                      <Text style={styles.headerSubtitle}>Your AI-Powered Commuting Guide</Text>
                    </View>
                    <View style={styles.headerDescriptionContainer}>
                      <Text style={styles.headerDescription}>
                        Access real-time weather and traffic data for your current location in Metro Manila. 
                        Plan your commute smarter with accurate, up-to-date information.
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Weather and Traffic cards - same as mobile */}
              {/* ... Same content as above ... */}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Root container layout
  rootContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 100,
  },
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 200,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  // Header styles
  headerGradient: {
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  headerContent: {
    padding: theme.spacing.xl,
    position: 'relative',
  },
  headerTextContainer: {
    width: '100%',
  },
  headerTitle: {
    fontSize: Platform.OS === 'ios' || Platform.OS === 'android' 
      ? theme.fontSizes.xl 
      : theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.heavy,
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: 'rgba(255,255,255,0.95)',
  },
  headerDescriptionContainer: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.3)',
    paddingLeft: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  headerDescription: {
    fontSize: theme.fontSizes.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
  // Card styles
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  chipContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dataSourceChip: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
    color: '#FFF',
    backgroundColor: theme.colors.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dataSourceReal: {
    backgroundColor: theme.colors.success,
  },
  dataSourceEstimated: {
    backgroundColor: theme.colors.secondary,
  },
  // Loading and alerts
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    minHeight: 150,
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  alertText: {
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSizes.md,
    flex: 1,
  },
  // Location section
  locationContainer: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text,
    marginLeft: 4,
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  // Weather main info
  weatherMainContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  weatherMainLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  temperatureContainer: {
    marginLeft: theme.spacing.sm,
  },
  temperatureText: {
    fontSize: Platform.OS === 'ios' || Platform.OS === 'android' 
      ? theme.fontSizes.xl 
      : theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
  },
  feelsLikeText: {
    fontSize: theme.fontSizes.sm,
    color: '#F97316',
    fontWeight: theme.fontWeights.medium,
  },
  weatherMainRight: {
    flex: 1,
    justifyContent: 'center',
  },
  weatherDetail: {
    marginBottom: theme.spacing.sm,
  },
  weatherDetailLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  weatherDetailValue: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
  },
  // Rainfall section
  rainfallContainer: {
    marginBottom: theme.spacing.md,
  },
  rainfallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rainfallLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  rainfallValue: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Weather alert
  alertInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.12)',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  alertInfoText: {
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSizes.sm,
    flex: 1,
  },
  // Forecast section
  forecastContainer: {
    marginBottom: theme.spacing.md,
  },
  forecastTitle: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  forecastScrollContent: {
    paddingVertical: theme.spacing.xs,
  },
  forecastItem: {
    width: Platform.OS === 'ios' || Platform.OS === 'android' ? 70 : 75,
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
  },
  forecastItemCurrent: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  forecastTime: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  forecastTimeCurrent: {
    color: theme.colors.info,
  },
  forecastTemp: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold,
    color: theme.colors.text,
    marginVertical: 4,
  },
  forecastRainChance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastRainText: {
    fontSize: theme.fontSizes.xs,
    marginLeft: 2,
    fontWeight: theme.fontWeights.medium,
  },
  // Traffic main info
  trafficMainContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  trafficMainLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trafficAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  trafficLevelContainer: {
    justifyContent: 'center',
  },
  trafficLevelText: {
    fontSize: Platform.OS === 'ios' || Platform.OS === 'android' 
      ? theme.fontSizes.lg 
      : theme.fontSizes.xl,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
  },
  trafficDelayText: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  trafficDelayValue: {
    fontWeight: theme.fontWeights.medium,
  },
  trafficMainRight: {
    flex: 1,
    justifyContent: 'center',
  },
  roadConditionsLabel: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  roadConditionsValue: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.text,
    marginTop: 4,
  },
  // Traffic score and chart
  trafficScoreContainer: {
    marginBottom: theme.spacing.md,
  },
  trafficScoreLabel: {
    fontSize: theme.fontSizes.sm,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  trafficChartContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },
  trafficChart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
  },
  trafficLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  trafficLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trafficLegendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  trafficLegendText: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  // Traffic alerts
  alertsTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.sm,
  },
  alertItemEven: {
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.5)',
  },
  alertItemOdd: {
    backgroundColor: 'transparent',
  },
  alertItemContent: {
    flex: 1,
  },
  alertLocationText: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold,
    color: theme.colors.text,
  },
  alertConditionText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  alertDelayChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertDelayLow: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  alertDelayMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  alertDelayHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  alertDelayText: {
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.semibold,
  },
  alertDelayTextLow: {
    color: theme.colors.info,
  },
  alertDelayTextMedium: {
    color: theme.colors.warning,
  },
  alertDelayTextHigh: {
    color: theme.colors.error,
  },
  // Auto-refresh indicator - positioned higher for better mobile visibility
  autoRefreshContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' || Platform.OS === 'android' ? 30 : 20,
    right: Platform.OS === 'ios' || Platform.OS === 'android' ? 15 : 20,
    zIndex: 1000,
  },
  autoRefreshChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  autoRefreshText: {
    color: '#FFF',
    fontSize: theme.fontSizes.xs,
    fontWeight: theme.fontWeights.medium,
    marginLeft: 4,
  },
  // Utils
  lastUpdatedText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
  },
  bottomSpacer: {
    height: 60,
  },
});

export default Dashboard;