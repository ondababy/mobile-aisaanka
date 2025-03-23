import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Theme colors to match the web version
const theme = {
  colors: {
    primary: '#0b617e',
    secondary: '#1c8aad',
    background: '#f8fafc',
    paper: '#ffffff',
    success: '#10b981',
    info: '#0ea5e9',
    warning: '#f59e0b',
    error: '#ef4444',
    text: {
      primary: '#334155',
      secondary: '#64748b',
    },
  },
  spacing: (multiplier) => multiplier * 8,
  borderRadius: 12,
  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
};

// Profile Avatar Component
const ProfileAvatar = ({ name, size = 100, onEdit }) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={styles.avatarContainer}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
          {getInitials(name)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editAvatarButton}
        onPress={onEdit}
      >
        <Ionicons name="pencil" size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
};

// Chip Component
const Chip = ({ label, color, outlined = false, small = false }) => {
  const getColor = () => {
    switch (color) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'secondary':
        return theme.colors.secondary;
      default:
        return theme.colors.primary;
    }
  };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: outlined ? 'transparent' : getColor(),
          borderWidth: outlined ? 1 : 0,
          borderColor: getColor(),
          paddingVertical: small ? 4 : 6,
          paddingHorizontal: small ? 8 : 12,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          {
            color: outlined ? getColor() : 'white',
            fontSize: small ? 12 : 14,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

// Divider Component
const Divider = ({ style }) => {
  return <View style={[styles.divider, style]} />;
};

// Card Component
const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

// Profile Screen
const Profile = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // This would come from your environment config in a real app
  const API_URL = 'https://your-api-url.com/api';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('📡 Fetching user profile...');
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        throw new Error('No token found. Please log in again.');
      }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profile. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Profile Data:', data);
      setProfile(data);
      setEditData({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        password: '',
      });
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Current password is required to make changes');
      return;
    }

    if (
      editData.name === profile.name &&
      editData.username === profile.username &&
      editData.email === profile.email &&
      !editData.password
    ) {
      Alert.alert('Info', 'No changes were made to update');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      // Create payload with only the fields that have changed plus current password
      const payload = {
        currentPassword, // Always required
      };

      // Only include fields that have changed
      if (editData.name !== profile.name) payload.name = editData.name;
      if (editData.username !== profile.username)
        payload.username = editData.username;
      if (editData.email !== profile.email) payload.email = editData.email;

      // Only include newPassword if it's provided
      if (editData.password && editData.password.trim() !== '') {
        payload.newPassword = editData.password;
      }

      console.log(
        'Sending update request with fields:',
        Object.keys(payload)
          .filter((key) => key !== 'currentPassword' && key !== 'newPassword')
          .concat(payload.newPassword ? ['newPassword'] : [])
      );

      const response = await fetch(`${API_URL}/auth/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      // Update token if provided
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        console.log('Token updated');
      }

      // Update local state with the returned user data
      if (data.user) {
        setProfile(data.user);

        // Also update the edit data to match the new profile
        setEditData({
          name: data.user.name || '',
          username: data.user.username || '',
          email: data.user.email || '',
          password: '', // Always reset password field
        });
      } else {
        // If no user data is returned, refresh the profile data
        await fetchProfile();
      }

      setModalOpen(false);
      setCurrentPassword('');
      Alert.alert('Success', data.message || 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubText}>
            Please log in again to access your profile.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader} />
            
            <ProfileAvatar 
              name={profile.name} 
              onEdit={() => setModalOpen(true)} 
            />
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileUsername}>@{profile.username}</Text>
              
              <Chip 
                label={profile.role === 'admin' ? 'Administrator' : 'User'} 
                color={profile.role === 'admin' ? 'secondary' : 'primary'} 
                outlined
                small
              />
              
              <Divider style={styles.profileDivider} />
              
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>Account Status</Text>
                <Chip
                  label={profile.status || 'Active'}
                  color={
                    profile.status === 'active'
                      ? 'success'
                      : profile.status === 'banned'
                      ? 'error'
                      : 'warning'
                  }
                  small
                />
              </View>
              
              <Divider style={styles.profileDivider} />
              
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setModalOpen(true)}
              >
                <Ionicons name="pencil-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Contact Information Card */}
          <Card style={styles.contactCard}>
            <Text style={styles.cardTitle}>Contact Information</Text>
            
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
              <View style={styles.contactDetail}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{profile.email}</Text>
              </View>
            </View>
          </Card>

          {/* Profile Details Card */}
          <Card style={styles.detailsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Profile Details</Text>
            </View>

            {/* Personal Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Personal Information</Text>
              
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>{profile.name}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>{profile.username}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Email Address</Text>
                  <Text style={styles.detailValue}>{profile.email}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{profile.age || 'Not specified'}</Text>
                </View>
              </View>
            </View>

            {/* Account Security */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Account Security</Text>
              
              <View style={styles.securityItem}>
                <View>
                  <Text style={styles.detailLabel}>Password</Text>
                  <Text style={styles.detailValue}>••••••••••••</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setModalOpen(true)}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.securityItem}>
                <View>
                  <Text style={styles.detailLabel}>Account Verification</Text>
                  <Chip
                    label={profile.isVerified ? 'Verified' : 'Not Verified'}
                    color={profile.isVerified ? 'success' : 'warning'}
                    small
                  />
                </View>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Your Profile</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalOpen(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>
            
            <Divider style={styles.modalDivider} />
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(text) => setEditData({ ...editData, name: text })}
                  placeholder="Your full name"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={editData.username}
                  onChangeText={(text) => setEditData({ ...editData, username: text })}
                  placeholder="Your username"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={editData.email}
                  onChangeText={(text) => setEditData({ ...editData, email: text })}
                  keyboardType="email-address"
                  placeholder="Your email"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Password <Text style={styles.requiredStar}>*</Text></Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Enter current password"
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color={theme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHelper}>Required to confirm changes</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={editData.password}
                    onChangeText={(text) => setEditData({ ...editData, password: text })}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                  />
                  <TouchableOpacity
                    style={styles.visibilityToggle}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color={theme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHelper}>Leave blank to keep current password</Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !currentPassword && styles.saveButtonDisabled,
                ]}
                onPress={handleUpdateProfile}
                disabled={!currentPassword || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Profile Card
  profileCard: {
    position: 'relative',
    marginBottom: 16,
    paddingBottom: 16,
  },
  profileHeader: {
    height: 100,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.borderRadius,
    borderTopRightRadius: theme.borderRadius,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginTop: -50,
    position: 'relative',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontWeight: theme.fontWeight.bold,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileName: {
    fontSize: 22,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  profileUsername: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  profileDivider: {
    marginVertical: 16,
    width: '100%',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius / 2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    width: '100%',
  },
  editButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semiBold,
    marginLeft: 8,
  },
  // Contact Card
  contactCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.primary,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactDetail: {
    marginLeft: 16,
  },
  contactLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  // Details Card
  detailsCard: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.primary,
    marginLeft: 8,
  },
  detailSection: {
    backgroundColor: 'rgba(11, 97, 126, 0.04)',
    borderRadius: theme.borderRadius,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.primary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '50%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  changeButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius / 2,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changeButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: theme.borderRadius,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalDivider: {
    marginBottom: 16,
  },
  modalScrollView: {
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  requiredStar: {
    color: theme.colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  passwordContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  visibilityToggle: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  inputHelper: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontWeight: theme.fontWeight.medium,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: theme.fontWeight.semiBold,
  },
  // Loading and Error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: theme.borderRadius,
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: theme.fontWeight.semiBold,
    color: theme.colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: theme.fontWeight.semiBold,
    fontSize: 16,
  },
  // Common components
  card: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '100%',
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  chipLabel: {
    fontWeight: theme.fontWeight.medium,
  },
});

export default Profile;