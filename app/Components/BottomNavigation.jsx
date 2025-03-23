import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

const BottomNavigation = ({ activeTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab based on the current path if not explicitly provided
  const determineActiveTab = () => {
    if (activeTab) return activeTab;
    
    if (pathname.includes('/Screen/Home')) return 'Home';
    if (pathname.includes('/Screen/About')) return 'About';
    if (pathname.includes('/Screen/Services')) return 'Services';
    if (pathname.includes('/Screen/Faq')) return 'Faqs';
    
    return 'Home'; // Default
  };
  
  const [currentTab, setCurrentTab] = useState(determineActiveTab());

  // Update the active tab if the pathname or activeTab prop changes
  useEffect(() => {
    setCurrentTab(determineActiveTab());
  }, [pathname, activeTab]);

  const tabs = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
    { name: 'About', icon: 'information-circle-outline', activeIcon: 'information-circle', route: '/Screen/About' },
    { name: 'Services', icon: 'briefcase-outline', activeIcon: 'briefcase', route: '/Screen/Services' },
    { name: 'Faqs', icon: 'help-circle-outline', activeIcon: 'help-circle', route: '/Screen/Faq' },
  ];

  const handleTabPress = (tab) => {
    setCurrentTab(tab.name);
    
    // Navigate using expo-router
    router.push(tab.route);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={[
            styles.tabButton,
            currentTab === tab.name && styles.activeTabButton
          ]}
          onPress={() => handleTabPress(tab)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === tab.name ? tab.activeIcon : tab.icon}
            size={24}
            color={currentTab === tab.name ? '#ffffff' : '#9e9e9e'}
          />
          <Text
            style={[
              styles.tabText,
              currentTab === tab.name && styles.activeTabText,
            ]}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default BottomNavigation;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 5,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Add shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    // Add elevation for Android
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    margin: 4,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#0b617e', 
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  tabText: {
    fontSize: 11,
    marginTop: 3,
    color: '#9e9e9e',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});