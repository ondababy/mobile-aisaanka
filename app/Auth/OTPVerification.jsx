import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import axios from 'axios';
import baseURL from "../../assets/common/baseUrl";

const OTPVerification = () => {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]); // 6-digit OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  // Animation value for success animation
  const successAnim = useRef(new Animated.Value(0)).current;
  
  // Create an array of refs for the OTP inputs
  const otpRefs = useRef([]);
  otpRefs.current = Array(6).fill().map((_, i) => otpRefs.current[i] || React.createRef());

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("userEmail");
        if (storedEmail) {
          setEmail(storedEmail);
          console.log("Email loaded from storage:", storedEmail);
        } else {
          console.log("No email found in storage, redirecting to register");
          router.replace("/Auth/Register");
        }
      } catch (err) {
        console.error("Error fetching email from storage:", err);
        router.replace("/Auth/Register");
      }
    };
    fetchEmail();
  }, [router]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);
  
  // Success animation
  useEffect(() => {
    if (verificationSuccess) {
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Navigate to login after animation completes
        router.replace("/Auth/Login");
      });
    }
  }, [verificationSuccess, successAnim, router]);

  const handleChange = (index, value) => {
    if (/^[0-9]?$/.test(value)) {
      let newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Focus on the next input if the current one is filled
      if (value !== "" && index < 5) {
        otpRefs.current[index + 1].current.focus();
      }
    }
  };
  
  // Handle backspace to move to previous input
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      otpRefs.current[index - 1].current.focus();
    }
  };

  const handleSubmit = async () => {
    if (otp.some((digit) => digit === "")) {
      setError("Please enter all six digits.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fix URL to prevent double slashes
      let apiUrl = `${baseURL}/api/auth/verify-otp`;
      apiUrl = apiUrl.replace(/([^:])\/\//g, '$1/');
      console.log("Verifying OTP at URL:", apiUrl);
      
      const response = await axios.post(apiUrl, {
        email,
        otp: otp.join("")
      });

      console.log("OTP verification response:", response.data);
      setLoading(false);

      if (response.status === 200) {
        // Show success animation
        setVerificationSuccess(true);
        
        // We don't need to navigate here as the animation effect will handle it
      }
    } catch (error) {
      setLoading(false);
      
      if (error.response) {
        // Server responded with an error
        setError(error.response.data.message || "Invalid or expired OTP. Please try again.");
      } else if (error.request) {
        // No response received
        setError("Network error. Please check your connection.");
      } else {
        // Request setup error
        setError("Failed to verify OTP. Please try again.");
      }
      console.error("OTP verification error:", error);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setError("");
  
    try {
      // Fix URL to prevent double slashes
      let apiUrl = `${baseURL}/api/auth/resend-otp`;
      apiUrl = apiUrl.replace(/([^:])\/\//g, '$1/');
      console.log("Resending OTP to URL:", apiUrl);
      
      const response = await axios.post(apiUrl, { email });
      console.log("Resend OTP response:", response.data);
      
      setLoading(false);
      setCanResend(false);
      setCountdown(60);
  
      // Show success message
      Alert.alert(
        "OTP Resent",
        "A new OTP has been sent to your email.",
        [{ text: "OK" }]
      );
    } catch (error) {
      setLoading(false);
      
      if (error.response) {
        setError(error.response.data.message || "Failed to resend OTP.");
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to resend OTP. Please try again.");
      }
      console.error("Resend OTP error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={18} color="#06b71e" />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          {/* Logo */}
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* Success Animation */}
          {verificationSuccess && (
            <Animated.View style={[
              styles.successContainer,
              {
                opacity: successAnim,
                transform: [{
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}>
              <View style={styles.successIconContainer}>
                <Feather name="check-circle" size={60} color="#06b71e" />
              </View>
              <Text style={styles.successText}>Verification Successful!</Text>
            </Animated.View>
          )}
          
          {!verificationSuccess && (
            <>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit OTP sent to{"\n"}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={otpRefs.current[index]}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : {},
                      index === 0 ? { marginLeft: 0 } : {}
                    ]}
                    value={digit}
                    onChangeText={(value) => handleChange(index, value)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                  />
                ))}
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={18} color="#ff6b6b" style={styles.errorIcon} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.verifyButton, loading && styles.buttonLoading]}
                onPress={handleSubmit} 
                disabled={loading || otp.some(digit => digit === "")}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code? 
                </Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.resendButton}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>
                    Resend in {countdown}s
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 183, 30, 0.1)',
    zIndex: 10,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#06b71e",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#757575",
    marginBottom: 40,
    textAlign: "center",
    lineHeight: 24,
  },
  emailText: {
    fontWeight: "bold",
    color: "#333333",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    width: "100%",
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    color: "#06b71e",
    backgroundColor: "#f8f8f8",
    marginHorizontal: 6,
  },
  otpInputFilled: {
    borderColor: "#06b71e",
    backgroundColor: "rgba(6, 183, 30, 0.05)",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
  },
  verifyButton: {
    backgroundColor: "#06b71e",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#06b71e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonLoading: {
    backgroundColor: "#89d991",
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  resendText: {
    fontSize: 15,
    color: "#757575",
    marginRight: 5,
  },
  resendButton: {
    fontSize: 15,
    color: "#06b71e",
    fontWeight: "600",
  },
  countdownText: {
    fontSize: 15,
    color: "#06b71e",
    fontWeight: "600",
  },
  // Success animation styles
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#06b71e",
  }
});

export default OTPVerification;