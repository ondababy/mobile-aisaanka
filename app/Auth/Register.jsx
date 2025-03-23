import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import baseURL from "../../assets/common/baseUrl";

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  
  // Validation states
  const [fullNameVerify, setFullNameVerify] = useState(false);
  const [usernameVerify, setUsernameVerify] = useState(false);
  const [emailVerify, setEmailVerify] = useState(false);
  const [ageVerify, setAgeVerify] = useState(false);
  const [categoryVerify, setCategoryVerify] = useState(false);
  const [genderVerify, setGenderVerify] = useState(false);
  const [passwordVerify, setPasswordVerify] = useState(false);
  const [confirmPasswordVerify, setConfirmPasswordVerify] = useState(false);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Categories from your User model
  const categoryOptions = ["Student", "Daily Commuter", "Tourist"];
  
  // Gender options from your model
  const genderOptions = ["Male", "Female", "Prefer Not To Say"];

  async function handleSubmit() {
    if (!isSignUpEnabled) return;
    
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      // Create user object matching your model schema
      const userData = {
        name: fullName,          // maps to name in your model
        username: username,      // maps to username in your model
        email: email,           // maps to email in your model
        age: parseInt(age, 10),  // maps to age in your model
        category: category,      // maps to category in your model
        gender: gender,         // maps to gender in your model
        password: password,      // maps to password in your model
      };

      console.log("Submitting registration data:", {...userData, password: "****"});
      
      // Log the full URL for debugging - remove any double slashes
      let fullUrl = `${baseURL}/api/auth/signup`;
      // Fix any double slashes in the URL (except after http:)
      fullUrl = fullUrl.replace(/([^:])\/\//g, '$1/');
      console.log("Attempting to register at URL:", fullUrl);
      
      // Send registration request to your backend
      const response = await axios.post(fullUrl, userData);
      
      console.log("Registration successful:", response.data);
      
      // Store email in AsyncStorage for OTP verification
      try {
        await AsyncStorage.setItem("userEmail", email);
        console.log("Email stored for OTP verification:", email);
      } catch (storageError) {
        console.error("Failed to store email:", storageError);
      }
      
      // Show success message
      Alert.alert(
        "Registration Successful",
        "Account created successfully! Please verify your email with the OTP.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/Auth/OTPVerification")
          }
        ]
      );
      
    } catch (error) {
      console.error("Registration error:", error);
      
      // Handle different error types
      if (error.response) {
        // Server responded with an error status
        setErrorMessage(error.response.data.message || "Registration failed. Please try again.");
        Alert.alert("Registration Failed", error.response.data.message || "Please check your information and try again.");
      } else if (error.request) {
        // Request made but no response received
        setErrorMessage("Network error. Please check your connection and try again.");
        Alert.alert("Connection Error", "Unable to connect to server. Please check your internet connection.");
      } else {
        // Something else happened
        setErrorMessage("An unexpected error occurred. Please try again.");
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  function handleFullName(value) {
    setFullName(value);
    setFullNameVerify(value.length > 1);
  }

  function handleUsername(value) {
    setUsername(value);
    setUsernameVerify(value.length >= 4 && value.length <= 10); // Max 10 per your model
  }

  function handleEmail(value) {
    setEmail(value);
    setEmailVerify(/^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(value));
  }

  function handleAge(value) {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    setAge(numericValue);
    
    // Validate age per your model (min 1, max 120)
    const ageNum = parseInt(numericValue, 10);
    setAgeVerify(ageNum >= 1 && ageNum <= 120);
  }

  function handleCategory(value) {
    setCategory(value);
    setCategoryVerify(true);
    setShowCategoryDropdown(false);
  }
  
  function handleGender(value) {
    setGender(value);
    setGenderVerify(true);
    setShowGenderDropdown(false);
  }

  function handlePassword(value) {
    setPassword(value);
    const isValid = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/.test(value);
    setPasswordVerify(isValid);
    
    // Update confirm password verification when password changes
    if (confirmPassword) {
      setConfirmPasswordVerify(confirmPassword === value);
    }
  }
  
  function handleConfirmPassword(value) {
    setConfirmPassword(value);
    setConfirmPasswordVerify(value === password);
  }

  const isSignUpEnabled = fullNameVerify && usernameVerify && emailVerify && 
    ageVerify && categoryVerify && genderVerify && passwordVerify && confirmPasswordVerify;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#0b617e" />
          </TouchableOpacity>
          
          <View style={styles.contentContainer}>
            {/* Title Section */}
            <View style={styles.headerContainer}>
              <View style={styles.titleDecorator} />
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Fill in your details to get started</Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.formContainer}>
              {/* Full Name Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[
                  styles.inputContainer,
                  fullName.length > 0 && !fullNameVerify && styles.inputError
                ]}>
                  <FontAwesome name="user" size={18} color="#0b617e" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Your full name"
                    placeholderTextColor="#9e9e9e"
                    style={styles.input}
                    onChangeText={handleFullName}
                    value={fullName}
                  />
                  {fullName.length > 0 && (
                    fullNameVerify ? (
                      <Feather name="check-circle" color="#0b617e" size={18} />
                    ) : (
                      <Feather name="x-circle" color="#ff6b6b" size={18} />
                    )
                  )}
                </View>
                {fullName.length > 0 && !fullNameVerify && (
                  <Text style={styles.errorText}>
                    Name should be more than 1 character
                  </Text>
                )}
              </View>

              {/* Username Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={[
                  styles.inputContainer,
                  username.length > 0 && !usernameVerify && styles.inputError
                ]}>
                  <FontAwesome name="at" size={18} color="#0b617e" style={styles.inputIcon} />
                  <TextInput
                    placeholder="4-10 characters"
                    placeholderTextColor="#9e9e9e"
                    style={styles.input}
                    autoCapitalize="none"
                    onChangeText={handleUsername}
                    value={username}
                    maxLength={10}
                  />
                  {username.length > 0 && (
                    usernameVerify ? (
                      <Feather name="check-circle" color="#0b617e" size={18} />
                    ) : (
                      <Feather name="x-circle" color="#ff6b6b" size={18} />
                    )
                  )}
                </View>
                {username.length > 0 && !usernameVerify && (
                  <Text style={styles.errorText}>
                    Username should be 4-10 characters
                  </Text>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  email.length > 0 && !emailVerify && styles.inputError
                ]}>
                  <Feather name="mail" size={18} color="#0b617e" style={styles.inputIcon} />
                  <TextInput
                    placeholder="example@domain.com"
                    placeholderTextColor="#9e9e9e"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={handleEmail}
                    value={email}
                  />
                  {email.length > 0 && (
                    emailVerify ? (
                      <Feather name="check-circle" color="#0b617e" size={18} />
                    ) : (
                      <Feather name="x-circle" color="#ff6b6b" size={18} />
                    )
                  )}
                </View>
                {email.length > 0 && !emailVerify && (
                  <Text style={styles.errorText}>
                    Please enter a valid email address
                  </Text>
                )}
              </View>

              {/* Two-column layout for Age and Gender */}
              <View style={styles.twoColumnContainer}>
                {/* Age Input */}
                <View style={[styles.inputWrapper, styles.halfColumn]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <View style={[
                    styles.inputContainer,
                    age.length > 0 && !ageVerify && styles.inputError
                  ]}>
                    <Feather name="user" size={18} color="#0b617e" style={styles.inputIcon} />
                    <TextInput
                      placeholder="1-120"
                      placeholderTextColor="#9e9e9e"
                      style={styles.input}
                      keyboardType="numeric"
                      maxLength={3}
                      onChangeText={handleAge}
                      value={age}
                    />
                    {age.length > 0 && (
                      ageVerify ? (
                        <Feather name="check-circle" color="#0b617e" size={18} />
                      ) : (
                        <Feather name="x-circle" color="#ff6b6b" size={18} />
                      )
                    )}
                  </View>
                  {age.length > 0 && !ageVerify && (
                    <Text style={styles.errorText}>
                      Age: 1-120
                    </Text>
                  )}
                </View>

                {/* Gender Dropdown */}
                <View style={[styles.inputWrapper, styles.halfColumn]}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TouchableOpacity 
                    style={[
                      styles.inputContainer, 
                      styles.dropdownContainer
                    ]}
                    onPress={() => setShowGenderDropdown(true)}
                  >
                    <Feather name="users" size={18} color="#0b617e" style={styles.inputIcon} />
                    <Text style={gender ? styles.input : styles.placeholderText}>
                      {gender || "Select gender"}
                    </Text>
                    <Feather name="chevron-down" size={18} color="#0b617e" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category Dropdown */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity 
                  style={[
                    styles.inputContainer, 
                    styles.dropdownContainer
                  ]}
                  onPress={() => setShowCategoryDropdown(true)}
                >
                  <Feather name="tag" size={18} color="#0b617e" style={styles.inputIcon} />
                  <Text style={category ? styles.input : styles.placeholderText}>
                    {category || "Select your category"}
                  </Text>
                  <Feather name="chevron-down" size={18} color="#0b617e" />
                </TouchableOpacity>
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  password.length > 0 && !passwordVerify && styles.inputError
                ]}>
                  <Feather name="lock" size={18} color="#0b617e" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Min 6 chars with number & capital"
                    placeholderTextColor="#9e9e9e"
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    onChangeText={handlePassword}
                    value={password}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color={password.length > 0 ? (passwordVerify ? "#0b617e" : "#ff6b6b") : "#9e9e9e"}
                    />
                  </TouchableOpacity>
                </View>
                {password.length > 0 && !passwordVerify && (
                  <Text style={styles.errorText}>
                    Must contain uppercase, lowercase, number & 6+ chars
                  </Text>
                )}
              </View>
              
              {/* Confirm Password Input */}
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  confirmPassword.length > 0 && !confirmPasswordVerify && styles.inputError
                ]}>
                  <Feather name="lock" size={18} color="#0b617e" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Re-enter your password"
                    placeholderTextColor="#9e9e9e"
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={handleConfirmPassword}
                    value={confirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Feather
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={18}
                      color={confirmPassword.length > 0 ? (confirmPasswordVerify ? "#0b617e" : "#ff6b6b") : "#9e9e9e"}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !confirmPasswordVerify && (
                  <Text style={styles.errorText}>
                    Passwords do not match
                  </Text>
                )}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signUpButton,
                  !isSignUpEnabled && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!isSignUpEnabled || isLoading}
              >
                {isLoading ? (
                  <Text style={styles.signUpButtonText}>Creating Account...</Text>
                ) : (
                  <>
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                    <Feather name="arrow-right" size={20} color="#ffffff" style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>
                Already have an account?{' '}
                <Text 
                  style={styles.signInLink}
                  onPress={() => router.push("/auth/login")}
                >
                  Sign In
                </Text>
              </Text>
            </View>

            {/* Terms Text */}
            <Text style={styles.termsText}>
              By continuing you agree to{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowCategoryDropdown(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={styles.modalDivider} />
            {categoryOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionItem,
                  index === categoryOptions.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => handleCategory(option)}
              >
                <Text style={[
                  styles.optionText,
                  category === option && { color: '#0b617e', fontWeight: '600' }
                ]}>
                  {option}
                </Text>
                {category === option && (
                  <Feather name="check" size={20} color="#0b617e" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gender Dropdown Modal */}
      <Modal
        visible={showGenderDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenderDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={() => setShowGenderDropdown(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <View style={styles.modalDivider} />
            {genderOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionItem,
                  index === genderOptions.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => handleGender(option)}
              >
                <Text style={[
                  styles.optionText,
                  gender === option && { color: '#0b617e', fontWeight: '600' }
                ]}>
                  {option}
                </Text>
                {gender === option && (
                  <Feather name="check" size={20} color="#0b617e" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 183, 30, 0.08)',
    marginTop: 15,
    marginBottom: 10,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
    paddingVertical: 15,
  },
  titleDecorator: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0b617e',
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444444',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  dropdownContainer: {
    backgroundColor: '#f8f8f8',
  },
  placeholderText: {
    flex: 1,
    fontSize: 15,
    color: '#9e9e9e',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfColumn: {
    width: '48%', // Slightly less than half to account for gap
  },
  signUpButton: {
    flexDirection: 'row',
    backgroundColor: '#0b617e',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#c0c0c0',
    shadowOpacity: 0,
    elevation: 0,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  testButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  testButtonText: {
    color: '#0b617e',
    fontSize: 14,
  },
  signInContainer: {
    marginVertical: 24,
  },
  signInText: {
    fontSize: 15,
    color: '#555555',
  },
  signInLink: {
    color: '#0b617e',
    fontWeight: '600',
  },
  termsText: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  termsLink: {
    color: '#0b617e',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    padding: 20,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
  },
});