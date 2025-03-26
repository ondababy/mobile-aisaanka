import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback
} from 'react-native';
import { 
  Provider as PaperProvider, 
  Button, 
  Surface, 
  Card, 
  Title, 
  Paragraph, 
  Avatar, 
  Chip, 
  Divider, 
  Snackbar, 
  IconButton, 
  configureFonts,
  DefaultTheme,
  Badge,
  Portal, 
  Modal,
  Searchbar,
  Appbar
} from 'react-native-paper';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { router } from 'expo-router';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_MAPS_API_KEY = "AIzaSyA97iQhpD5yGyKeHxmPOkGMTM7cqmGcuS8";

// Define Metro Manila bounds
const metroManilaBounds = {
  north: 15.0,
  south: 14.0,
  west: 120.5,
  east: 121.5,
};

// Create theme based on React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0b617e',
    primaryLight: '#3d8195',
    primaryDark: '#064458',
    accent: '#f9a825',
    accentLight: '#fbc02d',
    accentDark: '#f57f17',
    background: '#f5f7f9',
    surface: '#ffffff',
    error: '#d32f2f',
    text: '#263238',
    disabled: '#455a64',
    placeholder: '#546e7a',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#f9a825',
  },
  fonts: configureFonts({
    default: {
      regular: {
        fontFamily: 'Poppins-Regular',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'Poppins-Medium',
        fontWeight: '500',
      },
      light: {
        fontFamily: 'Poppins-Light',
        fontWeight: '300',
      },
      thin: {
        fontFamily: 'Poppins-Thin',
        fontWeight: '100',
      },
    },
  }),
  roundness: 12,
};

// Custom StepIndicator component to replace Stepper
const StepIndicator = ({ steps, currentStep }) => {
  return (
    <View style={styles.stepContainer}>
      {steps.map((label, index) => (
        <View key={index} style={styles.stepWrapper}>
          <View 
            style={[
              styles.stepCircle, 
              currentStep >= index ? styles.activeStep : styles.inactiveStep
            ]}
          >
            {currentStep > index ? (
              <Icon name="check" size={16} color="#ffffff" />
            ) : (
              <Text style={currentStep >= index ? styles.activeStepText : styles.inactiveStepText}>
                {index + 1}
              </Text>
            )}
          </View>
          <Text style={[
            styles.stepLabel,
            currentStep >= index ? styles.activeStepLabel : styles.inactiveStepLabel
          ]}>
            {label}
          </Text>
          {index < steps.length - 1 && (
            <View 
              style={[
                styles.stepConnector, 
                currentStep > index ? styles.activeConnector : styles.inactiveConnector
              ]} 
            />
          )}
        </View>
      ))}
    </View>
  );
};

// Custom LocationCard component
const LocationCard = ({ 
  title, 
  icon, 
  address, 
  placeholder, 
  onPress, 
  isLoading,
  buttonText 
}) => {
  return (
    <Surface style={styles.locationCard}>
      <View style={styles.locationTitleContainer}>
        <Icon name={icon} size={22} color={theme.colors.primary} style={styles.locationIcon} />
        <Text style={styles.locationTitle}>{title}</Text>
      </View>
      <View style={styles.locationContent}>
        <View style={styles.addressContainer}>
          <Text style={address ? styles.addressText : styles.placeholderText}>
            {address || placeholder}
          </Text>
        </View>
        <Button
          mode="contained"
          icon={({size, color}) => (
            <Icon name={icon === 'place' ? 'search' : 'my-location'} size={size} color={color} />
          )}
          loading={isLoading}
          onPress={onPress}
          style={styles.locationButton}
          labelStyle={styles.buttonLabel}
        >
          {buttonText}
        </Button>
      </View>
    </Surface>
  );
};

// Main Home component
const Home = () => {
  const [currentAddress, setCurrentAddress] = useState("");
  const [currentCoordinates, setCurrentCoordinates] = useState(null);
  const [destination, setDestination] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [placesAutocompleteVisible, setPlacesAutocompleteVisible] = useState(false);
  
  const googlePlacesRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Screen dimensions for responsive design
  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 375;

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Update step based on current state
  useEffect(() => {
    if (currentCoordinates && destinationCoordinates) {
      setActiveStep(2);
    } else if (currentCoordinates) {
      setActiveStep(1);
    } else {
      setActiveStep(0);
    }
  }, [currentCoordinates, destinationCoordinates]);

  // Request location permission using Expo Location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocationError("Location permission denied. Please enable it in app settings.");
      return;
    }
    
    setIsLoading(true);
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      // Add a small delay before requesting location to ensure native bridge is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        maximumAge: 10000
      });
      
      const { latitude, longitude } = location.coords;
      setCurrentCoordinates({ lat: latitude, lng: longitude });
      
      // Use Google's Geocoding API to get address from coordinates
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
        );
        
        setIsLoading(false);
        setLocationLoading(false);
        
        if (response.data.results && response.data.results.length > 0) {
          setCurrentAddress(response.data.results[0].formatted_address);
          showSnackbar("Location found successfully!");
        } else {
          setCurrentAddress("Location not found");
          setLocationError("Unable to get your address. Please try again.");
        }
      } catch (error) {
        setIsLoading(false);
        setLocationLoading(false);
        setCurrentAddress("Failed to get address");
        setLocationError("Error getting address from coordinates.");
      }
    } catch (error) {
      setIsLoading(false);
      setLocationLoading(false);
      setCurrentAddress("Unable to fetch location");
      
      console.error("Location error:", error);
      
      let errorMessage = "Location error. Please try again.";
      if (error.message) {
        if (error.message.includes("denied")) {
          errorMessage = "Permission denied. Please enable location services.";
        } else if (error.message.includes("unavailable")) {
          errorMessage = "Position unavailable. Try again later.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Location request timed out. Please try again.";
        } else if (error.message.includes("NOBRIDGE")) {
          errorMessage = "Location services not initialized. Please wait a moment and try again.";
        }
      }
      
      setLocationError(errorMessage);
    }
  };

const goToMap = async () => {
  if (!currentCoordinates || !destinationCoordinates) {
    setLocationError("Please select both starting point and destination.");
    return;
  }

  // Save destination to history before navigating
  try {
    await saveDestination();
    showSnackbar("Calculating your route...");
    
    setTimeout(() => {
      router.push({
        pathname: '/Screen/Map',
        params: {
          srcLat: currentCoordinates.lat,
          srcLng: currentCoordinates.lng,
          destLat: destinationCoordinates.lat,
          destLng: destinationCoordinates.lng
        }
      });
    }, 1000); // Small delay for user feedback
  } catch (error) {
    console.error("Failed to save destination, but continuing navigation", error);
    // Navigate anyway even if saving fails
    router.push({
      pathname: '/Screen/Map',
      params: {
        srcLat: currentCoordinates.lat,
        srcLng: currentCoordinates.lng,
        destLat: destinationCoordinates.lat,
        destLng: destinationCoordinates.lng
      }
    });
  }
};

  // Save destination to history
  const saveDestination = async () => {
    try {
      if (!destination) {
        return false;
      }
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log("User not logged in, skipping save destination");
        return false;
      }
      
      console.log("Saving destination:", {
        place: destination,
        coordinates: destinationCoordinates,
        time: Date.now()
      });
      
      // Make API call to save the place with correct field names
      const apiUrl = Platform.OS === 'ios' 
        ? 'YOUR_IOS_API_URL' // Replace with your actual API URL
        : 'YOUR_ANDROID_API_URL'; // Replace with your actual API URL
      
      const response = await axios.post(
        `${apiUrl}/place/savePlace`, 
        {
          place: destination,
          destination: destination,
          coordinates: destinationCoordinates,
          time: Date.now()
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log("Destination saved successfully:", response.data);
      return true;
    } catch (error) {
      console.error("Error saving destination:", error.response?.data || error.message);
      return false;
    }
  };
  
  // Show snackbar with message
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Steps for the progress indicator
  const steps = [
    'Set your location', 
    'Choose destination', 
    'View route'
  ];
  
  // Handle when user selects a place from Google Places Autocomplete
  const handlePlaceSelect = (data, details = null) => {
    if (details) {
      setDestination(details.formatted_address || data.description);
      setDestinationCoordinates({
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
      });
      showSnackbar("Destination selected!");
      
      // Dismiss keyboard after selection
      Keyboard.dismiss();
    }
  };

  // Main render
  return (
    <PaperProvider theme={theme}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.mainContainer}>
          {/* Card Section (This will not scroll to avoid virtualized list nesting issues) */}
          <Animated.View 
            style={[styles.contentContainer, { opacity: fadeAnim }]}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.headerContainer}>
                  <Avatar.Icon 
                    size={60} 
                    icon="map-marker-path" 
                    style={styles.avatar}
                    color="#ffffff"
                  />
                  
                  <Title style={styles.title}>
                    Plan Your Perfect Journey
                  </Title>
                  
                  <Paragraph style={styles.subtitle}>
                    Find the optimal route to your destination with real-time traffic updates
                  </Paragraph>
                  
                  <StepIndicator 
                    steps={steps} 
                    currentStep={activeStep} 
                  />
                </View>
                
                {/* Location Error Alert */}
                {locationError && (
                  <Surface style={styles.errorContainer}>
                    <View style={styles.errorContent}>
                      <Icon name="error-outline" size={24} color={theme.colors.error} />
                      <Text style={styles.errorText}>{locationError}</Text>
                    </View>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => setLocationError(null)}
                    />
                  </Surface>
                )}
                
                {/* Current Location Section */}
                <View style={styles.sectionContainer}>
                  <LocationCard
                    title="Your Location"
                    icon="my-location"
                    address={currentAddress}
                    placeholder="Click button to get your current location"
                    onPress={getCurrentLocation}
                    isLoading={locationLoading}
                    buttonText="Get My Location"
                  />
                </View>
                
                {/* Destination Section */}
                <View style={styles.sectionContainer}>
                  <View style={styles.locationTitleContainer}>
                    <Icon name="place" size={22} color={theme.colors.primary} style={styles.locationIcon} />
                    <Text style={styles.locationTitle}>Your Destination</Text>
                  </View>
                  
                  <Surface style={styles.destinationContainer}>
                    {/* We need to handle the GooglePlacesAutocomplete properly so it doesn't nest virtualized lists */}
                    <GooglePlacesAutocomplete
                      ref={googlePlacesRef}
                      placeholder="Enter your destination"
                      onPress={handlePlaceSelect}
                      fetchDetails={true}
                      query={{
                        key: GOOGLE_MAPS_API_KEY,
                        language: 'en',
                        components: 'country:ph',
                      }}
                      styles={{
                        container: {
                          flex: 0,
                        },
                        textInputContainer: {
                          borderRadius: theme.roundness,
                          backgroundColor: 'transparent',
                        },
                        textInput: {
                          height: 50,
                          borderRadius: theme.roundness,
                          backgroundColor: '#fff',
                          borderWidth: 1,
                          borderColor: '#e0e0e0',
                          fontSize: 16,
                          paddingHorizontal: 15,
                        },
                        predefinedPlacesDescription: {
                          color: theme.colors.primary,
                        },
                        listView: {
                          borderRadius: theme.roundness,
                          overflow: 'hidden',
                          position: 'absolute',
                          top: 50, // Height of the input
                          left: 0,
                          right: 0,
                          zIndex: 10,
                          backgroundColor: 'white',
                          borderWidth: 1,
                          borderColor: '#e0e0e0',
                        },
                        row: {
                          backgroundColor: '#FFFFFF',
                          padding: 13,
                        },
                      }}
                      onFail={(error) => console.error(error)}
                      enablePoweredByContainer={false}
                      // This is important - make the list display properly
                      keyboardShouldPersistTaps="handled"
                      listViewDisplayed={undefined}  // Let the component decide when to show the dropdown
                      renderRightButton={() => 
                        destination ? (
                          <TouchableOpacity 
                            onPress={() => {
                              setDestination("");
                              setDestinationCoordinates(null);
                              googlePlacesRef.current?.setAddressText("");
                            }}
                            style={styles.clearButton}
                          >
                            <Icon name="close" size={20} color="#757575" />
                          </TouchableOpacity>
                        ) : null
                      }
                    />
                  </Surface>
                </View>
                
                {/* Navigate Button */}
                <View style={styles.buttonContainer}>
                  <Button
                    mode="contained"
                    icon={({size, color}) => (
                      <Icon name="directions" size={size} color={color} />
                    )}
                    onPress={goToMap}
                    disabled={!currentCoordinates || !destinationCoordinates || isLoading}
                    style={[styles.navigateButton, { backgroundColor: theme.colors.accent }]}
                    labelStyle={styles.navigateButtonLabel}
                    contentStyle={styles.navigateButtonContent}
                  >
                    Find My Route
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={styles.snackbar}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </PaperProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  mainContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 550, // Similar to Container maxWidth
    alignSelf: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  cardContent: {
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    backgroundColor: '#0b617e',
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0b617e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#546e7a',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeStep: {
    backgroundColor: '#0b617e',
    elevation: 2,
  },
  inactiveStep: {
    backgroundColor: '#e0e0e0',
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  activeStepLabel: {
    color: '#0b617e',
    fontWeight: '600',
  },
  inactiveStepLabel: {
    color: '#757575',
  },
  activeStepText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  inactiveStepText: {
    color: '#757575',
    fontWeight: 'bold',
  },
  stepConnector: {
    position: 'absolute',
    height: 3,
    width: '100%',
    top: 16,
    left: '50%',
    zIndex: -1,
  },
  activeConnector: {
    backgroundColor: '#0b617e',
  },
  inactiveConnector: {
    backgroundColor: '#e0e0e0',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 8,
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0b617e',
  },
  locationIcon: {
    marginRight: 8,
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  locationContent: {
    flexDirection: 'column',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressText: {
    fontSize: 16,
    color: '#263238',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  locationButton: {
    borderRadius: 12,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  destinationContainer: {
    borderRadius: 12,
    padding: 0,
    overflow: 'visible', // Changed to visible to allow dropdown to show
    elevation: 2,
    minHeight: 50, // Minimum height for the input
    zIndex: 1, // Ensure it's above other elements
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginRight: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  navigateButton: {
    paddingVertical: 8,
    elevation: 4,
    width: '70%',
  },
  navigateButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  navigateButtonContent: {
    height: 48,
  },
  snackbar: {
    bottom: 20,
  },
});

export default Home;