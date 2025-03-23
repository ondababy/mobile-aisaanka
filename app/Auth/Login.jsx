import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome, Feather, MaterialIcons } from "@expo/vector-icons"; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import baseURL from "../../assets/common/baseUrl";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState({
    email: false,
    password: false
  });

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Fix URL to prevent double slashes
      let apiUrl = `${baseURL}/api/auth/login`;
      apiUrl = apiUrl.replace(/([^:])\/\//g, '$1/');
      console.log("Attempting login at URL:", apiUrl);

      const response = await axios.post(apiUrl, {
        email,
        password
      });

      console.log("Login response:", response.data);
      
      // Store authentication token
      await AsyncStorage.setItem("userToken", response.data.token);
      
      // Store user data
      await AsyncStorage.setItem("userData", JSON.stringify(response.data.user));
      
      // Navigate to main screen
      router.replace("../Screen/Dashboard");
    } catch (error) {
      console.error("Login error:", error);
      
      if (error.response) {
        // Specific error handling based on API response
        const { status, data } = error.response;
        
        if (status === 401) {
          if (data.redirect === "/verify-otp") {
            // User needs to verify email
            await AsyncStorage.setItem("userEmail", email);
            Alert.alert(
              "Email Not Verified",
              "Please verify your email with the OTP first.",
              [
                {
                  text: "OK",
                  onPress: () => router.push("/Auth/OTPVerification")
                }
              ]
            );
          } else {
            // Invalid credentials
            setError("Invalid email or password");
          }
        } else if (status === 403) {
          // User is banned
          setError("Your account has been banned. Please contact support.");
        } else {
          // Other server errors
          setError(data.message || "Login failed. Please try again.");
        }
      } else if (error.request) {
        // No response received
        setError("Network error. Please check your connection.");
      } else {
        // Request setup error
        setError("Failed to login. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToForgotPassword = () => {
    router.push("/Auth/ForgotPassword");
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={18} color="#0b617e" />
          </TouchableOpacity>

          <View style={styles.contentContainer}>
            {/* App Name with Icon */}
            <View style={styles.titleContainer}>
              <MaterialIcons name="location-pin" size={38} color="#0b617e" />
              <Text style={styles.appName}>Ai SaanKa?</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue</Text>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <FontAwesome name="exclamation-circle" size={16} color="#ff6b6b" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={[
                styles.inputContainer, 
                isFocused.email && styles.inputContainerFocused
              ]}>
                <FontAwesome name="envelope" size={18} color="#0b617e" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#9e9e9e"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onFocus={() => setIsFocused({...isFocused, email: true})}
                  onBlur={() => setIsFocused({...isFocused, email: false})}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError("");
                  }}
                />
                {email.length > 0 && (
                  <TouchableOpacity onPress={() => setEmail("")}>
                    <FontAwesome name="times-circle" size={18} color="#9e9e9e" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                isFocused.password && styles.inputContainerFocused
              ]}>
                <FontAwesome name="lock" size={18} color="#0b617e" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9e9e9e"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onFocus={() => setIsFocused({...isFocused, password: true})}
                  onBlur={() => setIsFocused({...isFocused, password: false})}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather 
                    name={showPassword ? "eye" : "eye-off"} 
                    size={18} 
                    color="#9e9e9e" 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={navigateToForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity 
                style={[
                  styles.signInButton,
                  (!email || !password || isLoading) && styles.disabledButton
                ]}
                onPress={handleSubmit} 
                disabled={!email || !password || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* OR Separator */}
            <View style={styles.separatorContainer}>
              <View style={styles.separator} />
              <Text style={styles.separatorText}>OR</Text>
              <View style={styles.separator} />
            </View>

            {/* Sign Up Link */}
            <TouchableOpacity 
              style={styles.signUpContainer} 
              onPress={() => router.push("/Auth/Register")}
            >
              <Text style={styles.signUpText}>
                Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By continuing you agree to{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  backButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 183, 30, 0.08)',
    marginTop: 15,
    marginBottom: 10,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0b617e',
    letterSpacing: 0.5,
    marginLeft: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#777777',
    marginBottom: 40,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    width: '100%',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eeeeee',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: '#0b617e',
    borderWidth: 1.5,
    backgroundColor: '#f8fff8',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#0b617e',
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#0b617e',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    height: 56,
  },
  disabledButton: {
    backgroundColor: '#c0c0c0',
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: '#eeeeee',
  },
  separatorText: {
    color: '#9e9e9e',
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 30,
  },
  signUpText: {
    fontSize: 15,
    color: '#555555',
  },
  signUpLink: {
    color: '#0b617e',
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#0b617e',
    fontWeight: '500',
  },
});