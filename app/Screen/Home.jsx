import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, Dimensions, TextInput, FlatList, TouchableOpacity, Alert } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';

// HomeScreen component
const HomeScreen = ({ navigation }) => {
  const [count, setCount] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [location, setLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); 
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [isChoosingSource, setIsChoosingSource] = useState(false);
  const [isChoosingDestination, setIsChoosingDestination] = useState(false);
  const [userData, setUserData] = useState("");
  
  const mapViewRef = useRef(null);

  async function getData() {
    const token = await AsyncStorage.getItem("token");
    console.log(token);
    axios
      .post("http://192.168.1.59:5000/userdata", { token: token })
      .then(res => {
        console.log(res.data);
        setUserData(res.data.data);
      });
  }

  useEffect(() => {
    getData();
  }, []);
    
  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search for a location..."
          value={searchQuery}
        />
        {isDropdownVisible && (
          <FlatList
            data={locations}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => handleLocationSelect(item)}>
                <Text style={styles.dropdownText}>{item.description}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            style={styles.dropdown}
          />
        )}
      </View>

      <MapView
        ref={mapViewRef}
        style={styles.map}
        showsUserLocation={true}
      >
        {selectedLocation && (
          <Marker
            coordinate={selectedLocation}
            title="Selected Location"
            description="This is the location you selected"
          />
        )}

        {source && (
          <Marker
            coordinate={source}
            title={"Source"}
            pinColor={'green'}
            draggable={true}
            onDragEnd={e => setSource(e.nativeEvent.coordinate)}
          />
        )}

        {destination && (
          <Marker
            coordinate={destination}
            title={"Destination"}
            pinColor={'blue'}
            draggable={true}
            onDragEnd={e => setDestination(e.nativeEvent.coordinate)}
          />
        )}

        {source && destination && (
          <Polyline
            coordinates={[source, destination]}
            strokeColor="#000"
            strokeWidth={2}
          />
        )}
      </MapView>
        
      <View style={styles.buttonContainer}>
        <View style={styles.buttonGroup}>
          {source ? (
            <Button 
              title="Remove Source" 
              onPress={() => setSource(null)} />
          ) : (
            <Button
              title={isChoosingSource ? 'Please Choose Source' : "Choose Source"}
              onPress={() => setIsChoosingSource(true)}
            />
          )}
          {destination ? (
            <Button 
              title="Remove Destination" 
              onPress={() => setDestination(null)} />
          ) : (
            <Button
              title={isChoosingDestination ? 'Please Choose Destination' : "Choose Destination"}
              onPress={() => setIsChoosingDestination(true)}
            />
          )}
        </View>
      </View>

      <Button title="Go to Details" onPress={() => navigation.navigate('Details')} />
    </View>
  );
};

// Details Screen (add this screen)
const DetailsScreen = () => {
  return (
    <View style={styles.container}>
      <Text>Details Screen</Text>
    </View>
  );
};

// Create Drawer navigator
const Drawer = createDrawerNavigator();

// AppDrawer component (Drawer navigation)
const AppDrawer = () => (
  <Drawer.Navigator
    screenOptions={{
      drawerPosition: 'right', // Make the drawer appear on the right
    }}
  >
    <Drawer.Screen name="Home" component={HomeScreen} />
    <Drawer.Screen name="Details" component={DetailsScreen} /> {/* Add Details Screen */}
  </Drawer.Navigator>
);

// Main App Component (Navigation container only here)
export default function App() {
  return (
    <NavigationContainer>
      <AppDrawer /> {/* Wrap your drawer here inside a single NavigationContainer */}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBarContainer: { position: 'absolute', top: 10, left: 0, zIndex: 1, paddingHorizontal: 15 },
  searchBar: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, paddingLeft: 10, backgroundColor: 'white' },
  dropdown: { position: 'absolute', top: 40, left: 20, right: 20, backgroundColor: 'white', borderColor: 'gray', borderWidth: 2, borderRadius: 10, maxHeight: 50, zIndex: 5 },
  dropdownItem: { padding: 8 },
  dropdownText: { fontSize: 16 },
  map: { width: Dimensions.get('window').width, height: 450 },
  buttonContainer: { position: '', bottom: 20, left: 20, right: 20, paddingHorizontal: 15 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
});