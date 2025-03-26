import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Platform,
  Modal,
  Alert,
  ScrollView,
  ToastAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '@env';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Placeholder component for the Sidebar (Navigation menu in React Native)
const SidebarPlaceholder = ({ navigation }) => {
  return null;
};

const History = ({ navigation }) => {
  const [travelHistory, setTravelHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    rating: '',
    sortBy: 'newest',
    timeframe: 'all',
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [serverConfigModalVisible, setServerConfigModalVisible] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(API_URL || '');

  // Save custom API URL to AsyncStorage
  const saveCustomApiUrl = async (url) => {
    try {
      await AsyncStorage.setItem('customApiUrl', url);
      console.log('Saved custom API URL:', url);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Server URL updated', ToastAndroid.SHORT);
      }
      return true;
    } catch (err) {
      console.error('Error saving custom API URL:', err);
      return false;
    }
  };

  // Get custom API URL from AsyncStorage
  const getCustomApiUrl = async () => {
    try {
      const url = await AsyncStorage.getItem('customApiUrl');
      if (url) {
        setCustomApiUrl(url);
        console.log('Retrieved custom API URL:', url);
        return url;
      }
      return API_URL;
    } catch (err) {
      console.error('Error getting custom API URL:', err);
      return API_URL;
    }
  };

  // Helper function to determine if we're using a local IP address
  const isLocalIpAddress = (url) => {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return (
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      );
    } catch (e) {
      return false;
    }
  };

  // Fetch user profile with better error handling
  const fetchUserProfile = async (token) => {
    setLoading(true);
    setError(null);
    
    // Get custom API URL if one exists
    const apiBaseUrl = await getCustomApiUrl();
    
    if (!apiBaseUrl) {
      setError('API URL is not configured. Please set a server URL.');
      setLoading(false);
      return;
    }
    
    try {
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      console.log('Using API URL:', apiBaseUrl);
      
      // Make the request with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const profileUrl = `${apiBaseUrl}/auth/profile`;
      console.log('Fetching profile from:', profileUrl);
      
      try {
        const profileResponse = await fetch(profileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Profile response status:', profileResponse.status);
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text();
          console.error('Profile error response:', errorText);
          
          if (profileResponse.status === 401) {
            throw new Error('Your session has expired. Please log in again.');
          } else {
            throw new Error(`Server error: ${profileResponse.status} - ${errorText || 'No details provided'}`);
          }
        }
        
        const profileData = await profileResponse.json();
        console.log('Profile data received:', profileData ? 'Data exists' : 'No data');
        
        setCurrentUser(profileData);
        const userId = profileData._id;
        
        if (!userId) {
          throw new Error('Could not determine user ID. Please log in again.');
        }
        
        // Now fetch travel history with the user ID
        await fetchTravelHistory(userId, token, apiBaseUrl);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Server request timed out. Please try again or check server status.');
        }
        
        throw error;
      }
      
    } catch (error) {
      console.error('Error loading user data:', error.message);
      let errorMsg = error.message;
      
      // Make the error message more user-friendly based on the error
      if (error.message.includes('Network request failed')) {
        if (isLocalIpAddress(apiBaseUrl)) {
          errorMsg = 'Cannot connect to the local server. Make sure the server is running and accessible on your network.';
        } else {
          errorMsg = 'Network request failed. Please check your internet connection and server status.';
        }
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  // Attempt to reconnect
  const tryReconnect = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        console.log('Attempting to reconnect...');
        fetchUserProfile(token);
      }
    } catch (err) {
      console.error('Error on reconnect attempt:', err);
    }
  };

  // Use useFocusEffect to refresh the data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchUserAndHistory = async () => {
        try {
          // Get auth token
          const token = await AsyncStorage.getItem('userToken');
          if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
          }
          
          console.log('Token retrieved:', token ? 'Token exists' : 'No token');
          
          await fetchUserProfile(token);
          
        } catch (error) {
          console.error('Error in useFocusEffect:', error.message);
          setError(error.message);
          setLoading(false);
        }
      };
      
      fetchUserAndHistory();
      
      return () => {
        // Clean up if needed
      };
    }, [])
  );
  
  const fetchTravelHistory = async (userId, token, apiBaseUrl) => {
    setLoading(true);
    try {
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const apiUrl = `${apiBaseUrl}/user/travel-history/${userId}`;
      console.log('Fetching travel history from:', apiUrl);
      
      // Use timeout for this request as well
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Travel history response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Travel history error response:', errorText);
          throw new Error(`Failed to fetch travel history: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Travel history data received:', data ? 'Data exists' : 'No data');
        
        if (!data || !Array.isArray(data.travelHistory)) {
          console.warn('Travel history data format unexpected:', JSON.stringify(data).slice(0, 200));
          
          // Handle the case where the API might return data in a different format
          // Try to extract travel history data from different possible structures
          let extractedHistory = [];
          
          if (data && typeof data === 'object') {
            if (Array.isArray(data)) {
              extractedHistory = data;
            } else if (data.travelHistory) {
              extractedHistory = Array.isArray(data.travelHistory) ? data.travelHistory : [data.travelHistory];
            } else if (data.data && Array.isArray(data.data)) {
              extractedHistory = data.data;
            } else if (data.results && Array.isArray(data.results)) {
              extractedHistory = data.results;
            }
          }
          
          console.log('Extracted history length:', extractedHistory.length);
          
          if (extractedHistory.length === 0) {
            setTravelHistory([]);
            setFilteredHistory([]);
          } else {
            // Use the extracted data
            const formattedData = formatTravelData(extractedHistory);
            setTravelHistory(formattedData);
            setFilteredHistory(formattedData);
          }
        } else {
          // The API returned data in the expected format
          const formattedData = formatTravelData(data.travelHistory);
          setTravelHistory(formattedData);
          setFilteredHistory(formattedData);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error('Server request timed out while fetching travel history.');
        }
        
        throw error;
      }
    } catch (err) {
      console.error('Error fetching travel history:', err.message);
      setError(err.message);
      setTravelHistory([]);
      setFilteredHistory([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format travel data consistently
  const formatTravelData = (data) => {
    return data.map(trip => ({
      id: trip._id || trip.id || Math.random().toString(36).substring(2, 11),
      place: trip.place || trip.placeName || trip.location || '',
      visitDate: trip.visitDate || trip.date || trip.createdAt || new Date().toISOString(),
      time: trip.time || trip.visitTime || '',
      createdAt: trip.createdAt || trip.createdDate || new Date().toISOString(),
      rating: trip.rating || 0,
      comments: trip.comments || trip.suggestion || trip.notes || '',
      placeDetails: trip.placeDetails || {
        name: trip.place || trip.placeName || trip.location || 'Unknown Location',
        address: trip.address || trip.placeAddress || '',
        category: trip.category || trip.placeCategory || '',
        images: Array.isArray(trip.images) ? trip.images : []
      },
      transportMode: trip.transportMode || trip.transport || ''
    }));
  };
  
  useEffect(() => {
    applyFilters();
  }, [travelHistory, searchQuery, filterOptions]);

  const handleMenuOpen = (item) => {
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const handleMenuClose = () => {
    setMenuVisible(false);
    setSelectedItem(null);
  };

  const handleDeleteTrip = async (tripId) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this travel record?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (!token) {
                throw new Error('Authentication token not found');
              }
              
              const apiBaseUrl = await getCustomApiUrl();
              
              const response = await fetch(`${apiBaseUrl}/user/travel-history/${tripId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Delete error response:', errorText);
                throw new Error("Failed to delete travel record");
              }
              
              // Remove the deleted item from the list
              setTravelHistory(travelHistory.filter(item => item.id !== tripId));
              handleMenuClose();
              
              // Show success message
              Alert.alert("Success", "Record deleted successfully");
            } catch (err) {
              console.error("Error deleting travel record:", err.message);
              setError(err.message);
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const applyFilters = () => {
    let filtered = [...travelHistory];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trip => 
        (trip.placeDetails?.name?.toLowerCase() || '').includes(query) || 
        (trip.place?.toLowerCase() || '').includes(query) ||
        (trip.placeDetails?.category?.toLowerCase() || '').includes(query) ||
        (trip.placeDetails?.address?.toLowerCase() || '').includes(query)
      );
    }

    // Apply rating filter
    if (filterOptions.rating) {
      filtered = filtered.filter(trip => 
        trip.rating === parseInt(filterOptions.rating)
      );
    }

    // Apply timeframe filter
    if (filterOptions.timeframe !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (filterOptions.timeframe) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(trip => {
        try {
          const tripDate = new Date(trip.visitDate || trip.time || trip.createdAt);
          return tripDate >= cutoffDate;
        } catch (e) {
          console.error('Date parsing error for trip:', trip);
          return true; // Include trips with invalid dates by default
        }
      });
    }

    // Apply sorting
    switch (filterOptions.sortBy) {
      case 'newest':
        filtered.sort((a, b) => {
          try {
            return new Date(b.visitDate || b.time || b.createdAt) - new Date(a.visitDate || a.time || a.createdAt);
          } catch (e) {
            return 0;
          }
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          try {
            return new Date(a.visitDate || a.time || a.createdAt) - new Date(b.visitDate || b.time || b.createdAt);
          } catch (e) {
            return 0;
          }
        });
        break;
      case 'rating-high':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating-low':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      default:
        break;
    }

    setFilteredHistory(filtered);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterOptions({
      rating: "",
      sortBy: "newest",
      timeframe: "all",
    });
  };

  // Format dates and times
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return "Unknown date";
    }
  };

  const formatRelativeTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays/7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays/30)} months ago`;
      return `${Math.floor(diffDays/365)} years ago`;
    } catch (e) {
      return "";
    }
  };

  // Simple network connectivity test
  const testConnectivity = async () => {
    try {
      // Attempt to fetch a small resource to test internet connectivity
      const testResponse = await fetch('https://www.google.com', { 
        method: 'HEAD',
        // Short timeout to quickly determine connectivity
        signal: AbortSignal.timeout(5000)
      });
      return testResponse.ok;
    } catch (error) {
      console.log('Connectivity test failed:', error);
      return false;
    }
  };

  // Filter pill/chip component
  const FilterChip = ({ label, onPress }) => (
    <TouchableOpacity
      style={styles.filterChip}
      onPress={onPress}
    >
      <Text style={styles.filterChipText}>{label}</Text>
      <Icon name="close" size={16} color="#0b617e" />
    </TouchableOpacity>
  );

  // Rating stars component
  const RatingStars = ({ rating }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? "star" : "star-border"}
          size={16}
          color="#f59e0b"
          style={{ marginRight: 2 }}
        />
      );
    }
    return <View style={styles.ratingContainer}>{stars}</View>;
  };

  // Renders each travel history item
  const renderTravelItem = ({ item }) => (
    <TouchableOpacity
      style={styles.travelCard}
      activeOpacity={0.7}
    >
      <View style={styles.travelCardHeader}>
        <Text style={styles.placeName}>{item.placeDetails?.name || item.place || "Unknown Location"}</Text>
        <Text style={styles.relativeTime}>{formatRelativeTime(item.visitDate || item.time || item.createdAt)}</Text>
      </View>
      
      <View style={styles.metadataRow}>
        <View style={styles.metadataItem}>
          <Icon name="event" size={16} color="#0b617e" />
          <Text style={styles.metadataText}>{formatDate(item.visitDate || item.time || item.createdAt)}</Text>
        </View>
        
        {item.transportMode && (
          <View style={styles.metadataItem}>
            <Icon name="directions-car" size={16} color="#0b617e" />
            <Text style={styles.metadataText}>{item.transportMode}</Text>
          </View>
        )}
        
        {item.rating > 0 && (
          <RatingStars rating={item.rating} />
        )}
      </View>
      
      {item.placeDetails?.address && (
        <View style={styles.addressRow}>
          <Icon name="location-on" size={16} color="#64748B" />
          <Text style={styles.addressText}>{item.placeDetails.address}</Text>
        </View>
      )}
      
      {item.comments && (
        <View style={styles.commentsRow}>
          <Icon name="comment" size={16} color="#64748B" />
          <Text style={styles.commentsText}>"{item.comments}"</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => handleMenuOpen(item)}
      >
        <Icon name="more-vert" size={24} color="#0b617e" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0b617e" />
          <Text style={styles.loadingText}>Loading your travel history...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Travel History</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          {/* For server connection issues, offer to configure server */}
          {(error.includes('connect to the local server') || 
            error.includes('Network request failed') || 
            error.includes('Server request timed out')) && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#0b617e', marginBottom: 12 }]}
              onPress={() => setServerConfigModalVisible(true)}
            >
              <Icon name="settings" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Configure Server</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={async () => {
              // Check connectivity before retry
              const isConnected = await testConnectivity();
              
              if (!isConnected) {
                Alert.alert(
                  "No Internet Connection",
                  "Please check your network settings and try again."
                );
                return;
              }
              
              const token = await AsyncStorage.getItem('userToken');
              if (currentUser?._id && token) {
                const apiBaseUrl = await getCustomApiUrl();
                fetchTravelHistory(currentUser._id, token, apiBaseUrl);
              } else {
                // If we don't have user ID or token, we need to refetch everything
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                  fetchUserProfile(token);
                } else {
                  setError('Your session has expired. Please log in again.');
                }
              }
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filteredHistory.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Icon name="travel-explore" size={44} color="#0b617e" />
          </View>
          
          <Text style={styles.emptyTitle}>No Travel History Found</Text>
          
          <Text style={styles.emptyMessage}>
            {searchQuery || filterOptions.rating || filterOptions.timeframe !== 'all' ? 
              "No trips match your current filters. Try adjusting your search criteria." : 
              "Start exploring new places with AI SaanKa to build your travel history."
            }
          </Text>
          
          {(searchQuery || filterOptions.rating || filterOptions.timeframe !== 'all') && (
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={handleClearFilters}
            >
              <Icon name="filter-list" size={18} color="#fff" />
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return (
      <>
        <View style={styles.tripCountContainer}>
          <Icon name="history" size={20} color="#0b617e" />
          <Text style={styles.tripCountText}>
            {filteredHistory.length} {filteredHistory.length === 1 ? 'trip' : 'trips'} found
          </Text>
        </View>
        
        <FlatList
          data={filteredHistory}
          renderItem={renderTravelItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Travel History</Text>
        <Text style={styles.headerSubtitle}>
          View and manage your past travels and experiences
        </Text>
        
        {/* Add server settings button in header */}
        <TouchableOpacity 
          style={styles.serverConfigButton}
          onPress={() => setServerConfigModalVisible(true)}
        >
          <Icon name="settings" size={20} color="#0b617e" />
        </TouchableOpacity>
      </View>

      {/* Search and filter section */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#0b617e" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places or categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#64748B"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#0b617e" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter-list" size={24} color="#0b617e" />
        </TouchableOpacity>
      </View>

      {/* Applied filters */}
      {(filterOptions.rating || filterOptions.timeframe !== 'all' || searchQuery) && (
        <View style={styles.appliedFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScrollView}>
            {filterOptions.rating && (
              <FilterChip 
                label={`${filterOptions.rating} Stars`}
                onPress={() => setFilterOptions({...filterOptions, rating: ""})} 
              />
            )}
            {filterOptions.timeframe !== 'all' && (
              <FilterChip 
                label={
                  filterOptions.timeframe === 'week' ? "This Week" :
                  filterOptions.timeframe === 'month' ? "This Month" : "This Year"
                }
                onPress={() => setFilterOptions({...filterOptions, timeframe: "all"})} 
              />
            )}
            {searchQuery && (
              <FilterChip 
                label={`Search: ${searchQuery}`}
                onPress={() => setSearchQuery("")} 
              />
            )}
          </ScrollView>
          
          {(filterOptions.rating || filterOptions.timeframe !== 'all' || searchQuery) && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={handleClearFilters}
            >
              <Icon name="filter-alt" size={16} color="#0b617e" />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#0b617e" />
              </TouchableOpacity>
            </View>
            
            {/* Filter content remains the same */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Rating</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption, 
                    filterOptions.rating === "" && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilterOptions({...filterOptions, rating: ""})}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                </TouchableOpacity>
                {[5, 4, 3, 2, 1].map(rating => (
                  <TouchableOpacity 
                    key={rating}
                    style={[
                      styles.filterOption, 
                      filterOptions.rating === rating.toString() && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilterOptions({...filterOptions, rating: rating.toString()})}
                  >
                    <Text style={styles.filterOptionText}>{rating} ★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Time Period</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "all", label: "All Time" },
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "year", label: "This Year" }
                ].map(option => (
                  <TouchableOpacity 
                    key={option.value}
                    style={[
                      styles.filterOption, 
                      filterOptions.timeframe === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilterOptions({...filterOptions, timeframe: option.value})}
                  >
                    <Text style={styles.filterOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "rating-high", label: "Highest Rated" },
                  { value: "rating-low", label: "Lowest Rated" }
                ].map(option => (
                  <TouchableOpacity 
                    key={option.value}
                    style={[
                      styles.filterOption, 
                      filterOptions.sortBy === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilterOptions({...filterOptions, sortBy: option.value})}
                  >
                    <Text style={styles.filterOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Options menu modal */}
      <Modal
        visible={menuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleMenuClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleMenuClose}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                if (selectedItem) handleDeleteTrip(selectedItem.id);
              }}
            >
              <Icon name="delete-outline" size={20} color="#f44336" />
              <Text style={styles.menuItemTextDelete}>Delete Record</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Server Configuration Modal */}
      <Modal
        visible={serverConfigModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setServerConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Server Configuration</Text>
              <TouchableOpacity onPress={() => setServerConfigModalVisible(false)}>
                <Icon name="close" size={24} color="#0b617e" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.serverConfigSection}>
              <Text style={styles.configLabel}>API Server URL</Text>
              <Text style={styles.configHelp}>
                Enter the full URL of your backend server including http:// or https://
              </Text>
              
              <TextInput
                style={styles.serverUrlInput}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                placeholder="e.g. http://192.168.1.100:5000/api"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {isLocalIpAddress(customApiUrl) && (
                <View style={styles.warningBox}>
                  <Icon name="warning" size={20} color="#f59e0b" style={{ marginRight: 8 }} />
                  <Text style={styles.warningText}>
                    You're using a local IP address. Make sure your device is on the same network as the server.
                  </Text>
                </View>
              )}
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.configButton, { backgroundColor: '#64748B' }]}
                  onPress={() => {
                    setCustomApiUrl(API_URL || '');
                    setServerConfigModalVisible(false);
                  }}
                >
                  <Text style={styles.configButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.configButton, { backgroundColor: '#0b617e' }]}
                  onPress={async () => {
                    // Validate URL format
                    try {
                      new URL(customApiUrl);
                      
                      const saved = await saveCustomApiUrl(customApiUrl);
                      if (saved) {
                        setServerConfigModalVisible(false);
                        
                        // Try to reconnect with the new URL
                        const token = await AsyncStorage.getItem('userToken');
                        if (token) {
                          fetchUserProfile(token);
                        }
                      }
                    } catch (e) {
                      Alert.alert(
                        "Invalid URL",
                        "Please enter a valid URL including http:// or https://"
                      );
                    }
                  }}
                >
                  <Text style={styles.configButtonText}>Save & Connect</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.troubleshootButton}
                onPress={() => {
                  // This would ideally open a network troubleshooting guide
                  Alert.alert(
                    "Troubleshooting Tips",
                    "1. Make sure your server is running\n" +
                    "2. If using a local IP, ensure your device is on the same network\n" +
                    "3. Try using your device's IP address instead of 'localhost'\n" +
                    "4. Check if your server port is open and accessible\n" +
                    "5. Verify that you included the full path (e.g., /api at the end)",
                    [{ text: "OK" }]
                  );
                }}
              >
                <Icon name="help-outline" size={16} color="#0b617e" style={{ marginRight: 4 }} />
                <Text style={styles.troubleshootText}>Troubleshooting Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#0b617e',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0b617e',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    opacity: 0.85,
    width: '90%',
  },
  serverConfigButton: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 97, 126, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(11, 97, 126, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    padding: 0,
  },
  filterButton: {
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    width: 48,
    height: 48,
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  filtersScrollView: {
    flex: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    color: '#0b617e',
    fontWeight: '500',
    marginRight: 6,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: '#0b617e',
    fontWeight: '600',
    marginLeft: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(11, 97, 126, 0.1)',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
    marginVertical: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0b617e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(11, 97, 126, 0.1)',
    marginVertical: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(11, 97, 126, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0b617e',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: '#0b617e',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  tripCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  tripCountText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#64748B',
    fontSize: 15,
  },
  listContainer: {
    paddingBottom: 20,
  },
  travelCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0b617e',
    elevation: 2,
    shadowColor: 'rgba(11, 97, 126, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  travelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  relativeTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontStyle: 'italic',
    backgroundColor: 'rgba(11, 97, 126, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 97, 126, 0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  commentsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  commentsText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    marginLeft: 8,
    flex: 1,
  },
  moreButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 97, 126, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemTextDelete: {
    fontSize: 16,
    marginLeft: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11, 97, 126, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
  },
  filterSection: {
    marginTop: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    borderRadius: 8,
    margin: 4,
  },
  filterOptionSelected: {
    backgroundColor: 'rgba(11, 97, 126, 0.2)',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#0b617e',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#0b617e',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Server configuration modal styles
  serverConfigSection: {
    marginTop: 16,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  configHelp: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  serverUrlInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#334155',
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  configButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  configButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  troubleshootButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
  },
  troubleshootText: {
    fontSize: 14,
    color: '#0b617e',
    fontWeight: '500',
  },
});

export default History;