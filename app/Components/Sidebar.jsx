import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// Import icons
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5
} from '@expo/vector-icons';

// Define theme colors
const THEME = {
  colors: {
    primary: '#0b617e',
    primaryDark: '#084d64',
    primaryLight: '#1a8cad',
    secondary: '#546e7a',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#2c3e50',
    textSecondary: '#546e7a',
    border: '#e0e0e0',
    divider: '#f0f0f0',
    success: '#4caf50',
    highlight: '#e7f3f7',
    lightRed: '#ffebee',
    danger: '#e53935',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    circle: 9999,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

const { width, height } = Dimensions.get('window');
// Make sidebar smaller on mobile - 70% of screen width instead of 80%
const DRAWER_EXPANDED_WIDTH = Platform.OS === 'ios' || Platform.OS === 'android' 
  ? width * 0.7  // 70% on mobile
  : width * 0.8; // 80% on web/other platforms

// Make collapsed sidebar narrower
const DRAWER_COLLAPSED_WIDTH = 60; // Reduced from 80

const Sidebar = ({ isExpanded = false, onToggle }) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLogoutPressed, setIsLogoutPressed] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  
  // Animated values
  const widthAnim = React.useRef(new Animated.Value(isExpanded ? DRAWER_EXPANDED_WIDTH : DRAWER_COLLAPSED_WIDTH)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current; // For overlay
  const arrowRotateAnim = React.useRef(new Animated.Value(expanded ? 1 : 0)).current; // For arrow rotation

  // Navigation menu items with updated routes
  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <MaterialIcons name="dashboard" size={24} color={THEME.colors.secondary} />, 
      route: 'Screen/Dashboard',
      activeIcon: <MaterialIcons name="dashboard" size={24} color={THEME.colors.primary} />
    },
    { 
      text: 'Home', 
      icon: <Ionicons name="home-outline" size={24} color={THEME.colors.secondary} />, 
      route: 'Screen/Home',
      activeIcon: <Ionicons name="home" size={24} color={THEME.colors.primary} />
    },
    { 
      text: 'Profile', 
      icon: <Ionicons name="person-outline" size={24} color={THEME.colors.secondary} />, 
      route: 'Screen/Profile',
      activeIcon: <Ionicons name="person" size={24} color={THEME.colors.primary} />
    },
    { 
      text: 'Travel History', 
      icon: <MaterialCommunityIcons name="history" size={24} color={THEME.colors.secondary} />, 
      route: 'Screen/History',
      activeIcon: <MaterialCommunityIcons name="history" size={24} color={THEME.colors.primary} />
    },
  ];

  useEffect(() => {
    // Get user info from AsyncStorage
    const getUserInfo = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
      } catch (error) {
        console.log('Error getting user info', error);
      }
    };
    
    getUserInfo();
  }, []);

  useEffect(() => {
    // Animate drawer width when expanded state changes
    Animated.timing(widthAnim, {
      toValue: expanded ? DRAWER_EXPANDED_WIDTH : DRAWER_COLLAPSED_WIDTH,
      duration: 250, // Slightly faster animation
      useNativeDriver: false,
    }).start();
    
    // Animate overlay opacity
    Animated.timing(opacityAnim, {
      toValue: expanded ? 0.5 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    
    // Animate arrow rotation
    Animated.timing(arrowRotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    
    // Notify parent component
    if (onToggle) {
      onToggle(expanded);
    }
  }, [expanded, widthAnim, opacityAnim, arrowRotateAnim, onToggle]);

  const toggleDrawer = () => {
    // Optional haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setExpanded(!expanded);
  };

  const handleOverlayPress = () => {
    if (expanded) {
      setExpanded(false);
    }
  };

  const handleLogout = async () => {
    setIsLogoutPressed(true);
    setLoading(true);
    
    try {
      // Optional haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Clear user data from AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('redirectPath');
      
      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.log('Error logging out', error);
    } finally {
      setLoading(false);
      setIsLogoutPressed(false);
    }
  };

  const isActive = (routeName) => {
    // Handle path matching for improved navigation
    const currentRoute = route.name;
    return currentRoute === routeName || (currentRoute.includes('/') && routeName.includes('/') && 
      currentRoute.split('/')[1] === routeName.split('/')[1]);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const navigateTo = (routeName) => {
    // Optional haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    // Use router.push instead of navigate
    navigation.push(routeName);
    
    // Auto-close sidebar after navigation on mobile
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      setExpanded(false);
    }
  };

  // Compute arrow rotation based on expanded state
  const arrowRotate = arrowRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  return (
    <>
      {/* Background overlay when sidebar is expanded - helps with focusing on sidebar */}
      {Platform.OS !== 'web' && (
        <Animated.View 
          style={[
            styles.overlay,
            { 
              opacity: opacityAnim,
              // Only show/register touches when sidebar is expanded
              pointerEvents: expanded ? 'auto' : 'none'
            }
          ]}
          onTouchEnd={handleOverlayPress}
        />
      )}

      <Animated.View 
        style={[
          styles.container,
          { 
            width: widthAnim,
            // Add translateX animation for a slide-in effect on mobile
            transform: [
              { translateX: widthAnim.interpolate({
                  inputRange: [DRAWER_COLLAPSED_WIDTH, DRAWER_EXPANDED_WIDTH],
                  outputRange: [0, 0],
                  extrapolate: 'clamp'
                })
              }
            ]
          }
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header with profile info */}
          <View style={[
            styles.header,
            // Reduce header height for mobile in collapsed state
            !expanded && Platform.OS !== 'web' && { height: 120 }
          ]}>
            {/* Arrow toggle button */}
            <Animated.View style={[
              styles.toggleButtonContainer,
              // Move button to right side when expanded
              expanded ? styles.toggleButtonExpanded : styles.toggleButtonCollapsed
            ]}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={toggleDrawer}
                hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
              >
                <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
                  <MaterialIcons 
                    name="keyboard-arrow-left" 
                    size={26} 
                    color={THEME.colors.primary} 
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>

            {/* Avatar with online indicator */}
            <View style={styles.avatarContainer}>
              {userInfo?.avatar ? (
                <Image 
                  source={{ uri: userInfo.avatar }} 
                  style={[
                    styles.avatar,
                    { width: expanded ? 60 : 40, height: expanded ? 60 : 40 }
                  ]} 
                />
              ) : (
                <LinearGradient
                  colors={[THEME.colors.primary, THEME.colors.primaryDark]}
                  style={[
                    styles.avatarPlaceholder,
                    { width: expanded ? 60 : 40, height: expanded ? 60 : 40 }
                  ]}
                >
                  <Text style={[
                    styles.avatarText,
                    !expanded && { fontSize: THEME.fontSize.md }
                  ]}>
                    {getInitials(userInfo?.name || 'User')}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.onlineIndicator} />
            </View>

            {/* User info - only visible when expanded */}
            {expanded && (
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userInfo?.name || 'User'}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{userInfo?.role || 'user'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Navigation menu */}
          <View style={styles.menuContainer}>
            {expanded && (
              <Text style={styles.sectionTitle}>NAVIGATION</Text>
            )}

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.text}
                  style={[
                    styles.menuItem,
                    isActive(item.route) && styles.activeMenuItem,
                    { justifyContent: expanded ? 'flex-start' : 'center' }
                  ]}
                  onPress={() => navigateTo(item.route)}
                  activeOpacity={0.7}
                >
                  {isActive(item.route) && (
                    <View style={styles.activeIndicator} />
                  )}
                  
                  <View style={styles.iconContainer}>
                    {isActive(item.route) ? item.activeIcon : item.icon}
                  </View>
                  
                  {expanded && (
                    <Text style={[
                      styles.menuText,
                      isActive(item.route) && styles.activeMenuText
                    ]}>
                      {item.text}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Enhanced Logout button */}
            {expanded ? (
              // Expanded state - full button with text
              <LinearGradient
                colors={isLogoutPressed ? ['#d32f2f', '#b71c1c'] : ['#e53935', '#c62828']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.logoutGradientContainer}
              >
                <TouchableOpacity
                  style={styles.logoutButtonExpanded}
                  onPress={handleLogout}
                  disabled={loading}
                  activeOpacity={0.7}
                  onPressIn={() => setIsLogoutPressed(true)}
                  onPressOut={() => setIsLogoutPressed(false)}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="exit-to-app" size={22} color="#FFFFFF" />
                      <Text style={styles.logoutTextExpanded}>Logout</Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              // Collapsed state - circular button
              <View style={styles.logoutButtonCollapsedContainer}>
                <TouchableOpacity
                  style={[
                    styles.logoutButtonCollapsed,
                    isLogoutPressed && styles.logoutButtonCollapsedPressed
                  ]}
                  onPress={handleLogout}
                  disabled={loading}
                  activeOpacity={0.7}
                  onPressIn={() => setIsLogoutPressed(true)}
                  onPressOut={() => setIsLogoutPressed(false)}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="exit-to-app" size={22} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 100,
  },
  container: {
    height: '100%',
    backgroundColor: THEME.colors.background,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.divider,
    zIndex: 200,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 3, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 150, // Reduced from 180
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.md,
    position: 'relative',
  },
  toggleButtonContainer: {
    position: 'absolute',
    width: 36,
    height: 36,
    zIndex: 10,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: THEME.borderRadius.circle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toggleButtonExpanded: {
    top: THEME.spacing.md,
    right: THEME.spacing.md - 8, // Position at right side when expanded
  },
  toggleButtonCollapsed: {
    top: THEME.spacing.md,
    right: -18, // Position it just outside the sidebar when collapsed
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: THEME.spacing.md,
  },
  avatar: {
    borderRadius: THEME.borderRadius.circle,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarPlaceholder: {
    borderRadius: THEME.borderRadius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: THEME.borderRadius.circle,
    backgroundColor: THEME.colors.success,
    borderWidth: 1.5,
    borderColor: THEME.colors.background,
    position: 'absolute',
    bottom: 2,
    right: 2,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userInfo: {
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  userName: {
    fontWeight: THEME.fontWeight.semibold,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: THEME.colors.surface,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: THEME.borderRadius.md,
    marginTop: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  roleText: {
    textTransform: 'uppercase',
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    letterSpacing: 1,
    color: THEME.colors.textSecondary,
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: THEME.spacing.sm,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    letterSpacing: 1.2,
    paddingLeft: THEME.spacing.sm,
    opacity: 0.7,
  },
  scrollContent: {
    paddingTop: THEME.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: THEME.colors.highlight,
    borderColor: THEME.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    width: 3,
    height: '50%',
    backgroundColor: THEME.colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
    marginLeft: THEME.spacing.sm,
  },
  activeMenuText: {
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
  },
  // Enhanced logout styles
  logoutGradientContainer: {
    borderRadius: THEME.borderRadius.md,
    marginTop: THEME.spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoutButtonExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
  },
  logoutTextExpanded: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: '#FFFFFF',
    marginLeft: THEME.spacing.md,
    letterSpacing: 0.5,
  },
  logoutButtonCollapsedContainer: {
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
  },
  logoutButtonCollapsed: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.circle,
    backgroundColor: THEME.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.2)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoutButtonCollapsedPressed: {
    backgroundColor: '#b71c1c', // Darker red when pressed
  },
});

export default Sidebar;