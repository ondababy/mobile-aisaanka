import 'react-native-get-random-values';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
const GOOGLE_MAPS_API_KEY = 'AIzaSyA97iQhpD5yGyKeHxmPOkGMTM7cqmGcuS8'; // Replace with your actual key

// Metro Manila bounds for restricting searches
const metroManilaBounds = {
  north: 15.0,
  south: 14.0,
  west: 120.5,
  east: 121.5,
};

// Enhanced color palette (matching web version)
const colors = {
  primary: "#054e6f",
  primaryLight: "#0b617e",
  primaryDark: "#033d52",
  secondary: "#4FC3F7",
  accent: "#e53935",
  accentLight: "#ff6f60",
  background: "#f8fafc",
  cardBackground: "#ffffff",
  textPrimary: "#2c3e50",
  textSecondary: "#5d7285",
  border: "#e0e0e0",
  success: "#4caf50",
  warning: "#ff9800",
  info: "#2196f3",
  grey: "#f5f7fa",
};

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 380;

function Home() {
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentCoordinates, setCurrentCoordinates] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState("all");
  const destinationRef = useRef(null);
  
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // Set page loaded state with a small delay for animations
    setTimeout(() => {
      setPageLoaded(true);
    }, 100);
    
    // Check if user was previously inactive (from route params)
    if (route.params?.wasInactive) {
      Alert.alert(
        "Welcome Back!",
        "Your account is now active again.",
        [{ text: "OK" }]
      );
    }
    
    // Auto-get location on app load for better UX
    getCurrentLocation();
  }, [route.params]);

  const getCurrentLocation = async () => {
    setLoading(true);
  
    try {
      // Ask for permission to use location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please allow access to your location to use this feature.',
          [{ text: 'OK' }]
        );
        setCurrentAddress('Location permission denied');
        setLoading(false);
        return;
      }
  
      // Get current position
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High 
      });
      
      const { latitude, longitude } = location.coords;
      
      // Set coordinates immediately
      setCurrentCoordinates({ lat: latitude, lng: longitude });
  
      try {
        // Use Google Geocoding API to get address from coordinates
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        
        if (response.data.status === 'OK' && response.data.results[0]) {
          setCurrentAddress(response.data.results[0].formatted_address);
        } else {
          setCurrentAddress('Location not found');
          console.error('Geocoding error:', response.data.status);
        }
      } catch (error) {
        console.error('Error with geocoding:', error);
        setCurrentAddress('Error finding address');
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      Alert.alert(
        'Location Error',
        `Unable to get your location: ${error.message}`,
        [{ text: 'OK' }]
      );
      setCurrentAddress('Unable to fetch location');
    } finally {
      setLoading(false);
    }
  };

  const saveDestination = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        console.log('User not logged in - skipping destination save');
        return;
      }
      
      const API_URL = 'YOUR_API_URL'; // Replace with your actual API URL
      await axios.post(
        `${API_URL}/place/savePlace`,
        {
          destination,
          time: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error('Error saving destination:', error.response?.data || error.message);
    }
  };
  
  const goToMap = async () => {
    if (!currentCoordinates || !destinationCoordinates) {
      Alert.alert(
        'Missing Information',
        'Please select both a starting point and destination.',
        [{ text: 'OK' }]
      );
      return;
    }
  
    try {
      await saveDestination();
    } catch (error) {
      console.log('Failed to save destination, but continuing to map');
    }
  
    navigation.navigate('Map', {
      srcLat: currentCoordinates.lat,
      srcLng: currentCoordinates.lng,
      destLat: destinationCoordinates.lat,
      destLng: destinationCoordinates.lng,
      transportMode: selectedTransport
    });
  };

  // Transport mode chips component
  const TransportChip = ({ label, iconName, mode, isFontAwesome5 = false }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        selectedTransport === mode && styles.chipSelected
      ]}
      activeOpacity={0.7}
      onPress={() => setSelectedTransport(mode)}
    >
      {isFontAwesome5 ? (
        <FontAwesome5 
          name={iconName} 
          size={16} 
          color={selectedTransport === mode ? "#fff" : "rgba(255,255,255,0.9)"} 
        />
      ) : (
        <Icon 
          name={iconName} 
          size={16} 
          color={selectedTransport === mode ? "#fff" : "rgba(255,255,255,0.9)"} 
        />
      )}
      <Text 
        style={[
          styles.chipText,
          selectedTransport === mode && styles.chipTextSelected
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Feature card component
  const FeatureCard = ({ icon, title, description, useFA5 = false }) => {
    return (
      <View style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
          {useFA5 ? 
            <FontAwesome5 name={icon} size={28} color={colors.primaryLight} /> :
            <Icon name={icon} size={28} color={colors.primaryLight} />
          }
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <View style={styles.appContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>
                    <Text style={{ color: colors.secondary }}>AI</Text>SaanKa
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Your intelligent commute assistant for navigating Metro Manila with ease
                  </Text>

                  <View style={styles.chipsContainer}>
                    <TransportChip label="All" iconName="exchange" mode="all" />
                    <TransportChip label="Jeepney" iconName="bus" mode="jeepney" />
                    <TransportChip label="Bus" iconName="bus" mode="bus" />
                    <TransportChip label="Train" iconName="subway" mode="train" />
                    <TransportChip label="Tricycle" iconName="walking" mode="tricycle" isFontAwesome5={true} />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Route Form Card */}
            <View style={styles.routeFormContainer}>
              <Text style={styles.sectionTitle}>Find Your Route</Text>

              {/* Starting Point */}
              <View style={styles.locationSection}>
                <View style={styles.locationHeader}>
                  <View style={[styles.locationMarker, { backgroundColor: colors.primaryLight }]}>
                    <Text style={styles.locationMarkerText}>A</Text>
                  </View>
                  <Text style={styles.locationTitle}>Starting Point</Text>
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Icon name="map-marker" size={20} color={colors.primaryLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={currentAddress}
                      placeholder="Your current location"
                      editable={false}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={getCurrentLocation}
                    activeOpacity={0.7}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="location-arrow" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Connection line between points */}
              <View style={styles.connectionLineContainer}>
                <View style={styles.connectionLine} />
              </View>

              {/* Destination */}
              <View style={styles.locationSection}>
                <View style={styles.locationHeader}>
                  <View style={[styles.locationMarker, { backgroundColor: colors.accent }]}>
                    <Text style={styles.locationMarkerText}>B</Text>
                  </View>
                  <Text style={styles.locationTitle}>Destination</Text>
                </View>

                <View style={styles.googlePlacesContainer}>
                  <View style={styles.destinationInputWrapper}>
                    <Icon name="map-pin" size={20} color={colors.accent} style={styles.inputIcon} />
                    <View style={styles.customInputContainer}>
                      <TextInput
                        style={styles.destinationInput}
                        placeholder="Search for your destination"
                        value={destination}
                        onFocus={() => {
                          // When input is focused, navigate to a separate search screen
                          navigation.navigate('DestinationSearch', {
                            onSelect: (place, coords) => {
                              setDestination(place);
                              setDestinationCoordinates(coords);
                            },
                            bounds: metroManilaBounds,
                            apiKey: GOOGLE_MAPS_API_KEY
                          });
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.actionButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    (!currentCoordinates || !destinationCoordinates) && styles.actionButtonDisabled,
                  ]}
                  onPress={goToMap}
                  disabled={!currentCoordinates || !destinationCoordinates}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                  >
                    <FontAwesome5 name="route" size={20} color="white" style={styles.actionButtonIcon} />
                    <Text style={styles.actionButtonText}>View Route Options</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.featuresSection}>
              <View style={styles.featuresTitleContainer}>
                <Text style={styles.featuresSectionTitle}>Why Choose AISaanKa</Text>
                <View style={styles.titleUnderline} />
              </View>

              <View style={styles.featuresGrid}>
                <FeatureCard
                  icon="route"
                  title="Multi-Modal Routing"
                  description="Find the best combination of jeepneys, buses, trains, and other transport options for your journey"
                  useFA5={true}
                />
                <FeatureCard
                  icon="clock-o"
                  title="Real-Time Traffic"
                  description="Get accurate ETAs with live traffic conditions and transit delays to better plan your trips"
                />
                <FeatureCard
                  icon="map-marker"
                  title="Local Navigation"
                  description="Directions specifically optimized for Metro Manila's unique transportation network"
                />
                <FeatureCard
                  icon="mobile"
                  title="Mobile Friendly"
                  description="Access your routes and directions on any device, anywhere you go in the city"
                />
              </View>
            </View>
            
            {/* Testimonials Section */}
            <View style={styles.testimonialsSection}>
              <Text style={styles.testimonialsSectionTitle}>What Users Say</Text>
              <View style={styles.testimonialCard}>
                <View style={styles.testimonialHeader}>
                  <View style={styles.testimonialAvatar}>
                    <Icon name="user" size={24} color={colors.primaryLight} />
                  </View>
                  <View>
                    <Text style={styles.testimonialName}>Juan Dela Cruz</Text>
                    <Text style={styles.testimonialLocation}>Makati City</Text>
                  </View>
                  <View style={styles.testimonialRating}>
                    <Icon name="star" size={14} color="#FFD700" />
                    <Icon name="star" size={14} color="#FFD700" />
                    <Icon name="star" size={14} color="#FFD700" />
                    <Icon name="star" size={14} color="#FFD700" />
                    <Icon name="star" size={14} color="#FFD700" />
                  </View>
                </View>
                <Text style={styles.testimonialText}>
                  "This app has completely changed my daily commute. The multi-modal routes are spot on and I've saved so much time!"
                </Text>
              </View>
            </View>
            
            {/* Call To Action */}
            <View style={styles.ctaSection}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaTitle}>Ready to Transform Your Commute?</Text>
                <Text style={styles.ctaSubtitle}>
                  Plan your first journey now and experience the smartest way to navigate Metro Manila
                </Text>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
                  <Text style={styles.ctaButtonText}>Get Started</Text>
                  <Icon name="arrow-right" size={16} color={colors.primary} style={styles.ctaButtonIcon} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  customInputContainer: {
    flex: 1,
  },
  destinationInput: {
    height: 60,
    fontSize: 16,
    paddingHorizontal: 10,
  },
  heroSection: {
    width: '100%',
    overflow: 'hidden',
  },
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : StatusBar.currentHeight + 20,
    paddingBottom: 80,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroTitle: {
    fontSize: 46,
    fontWeight: '900',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: 'white',
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 35,
    paddingHorizontal: 15,
    lineHeight: 26,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 15,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#fff',
  },
  chipText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.primary,
  },
  routeFormContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    marginTop: -50,
    marginHorizontal: 16,
    padding: 24,
    elevation: 10,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 25,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryLight,
    alignSelf: 'flex-start',
  },
  locationSection: {
    marginBottom: 24,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  locationMarkerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    marginLeft: 0,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inputIcon: {
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  locationButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 6,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  connectionLineContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  connectionLine: {
    height: 60,
    width: 2,
    backgroundImage: `linear-gradient(to bottom, ${colors.primaryLight}, ${colors.accent})`,
    borderRadius: 1,
  },
  googlePlacesContainer: {
    zIndex: 10,
  },
  destinationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionButtonContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  actionButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonIcon: {
    marginRight: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  featuresSection: {
    marginTop: 40,
    paddingHorizontal: 16,
  },
  featuresTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  featuresSectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 2,
    marginTop: 8,
  },
  featuresGrid: {
    marginTop: 30,
  },
  featureCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    elevation: 6,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(230, 230, 230, 0.9)',
  },
  featureIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `rgba(11, 97, 126, 0.08)`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
    marginTop: -40,
    borderWidth: 5,
    borderColor: colors.cardBackground,
    elevation: 8,
    shadowColor: 'rgba(11, 97, 126, 0.3)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  testimonialsSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  testimonialsSectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  testimonialCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(230, 230, 230, 0.9)',
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testimonialAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `rgba(11, 97, 126, 0.1)`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testimonialName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  testimonialLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  testimonialRating: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  testimonialText: {
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
    marginTop: 5,
  },
  ctaSection: {
    marginTop: 30,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  ctaGradient: {
    padding: 30,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
  },
  ctaButtonIcon: {
    marginTop: 1,
  },
});

// Make sure to export the component as default
export default Home;