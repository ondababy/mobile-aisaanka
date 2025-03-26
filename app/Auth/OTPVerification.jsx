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
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Dimensions,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import axios from 'axios';
import baseURL from "../../assets/common/baseUrl";
import { LinearGradient } from "expo-linear-gradient";

// Main colors
const colors = {
  primary: "#0B617E",
  primaryLight: "#2B8BA6",
  primaryDark: "#074A61",
  white: "#FFFFFF",
  background: "#F7FAFD",
  inputBg: "#F5F8FC",
  border: "#E1E8EF",
  text: "#2C3E50",
  textLight: "#5D7285",
  textMuted: "#8896A6",
  error: "#E53935",
  success: "#2E7D32",
  shadow: "rgba(9, 66, 89, 0.16)"
};

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;

const OTPVerification = () => {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]); // 6-digit OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  
  // Animation values
  const successAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  
  // Create an array of refs for the OTP inputs
  const otpRefs = useRef([]);
  otpRefs.current = Array(6).fill().map((_, i) => otpRefs.current[i] || React.createRef());

  useEffect(() => {
    // Fade in animation when component mounts
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

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
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
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
      // If we receive a new value, update the OTP array
      if (value) {
        let newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        
        // Reset error on new input
        if (error) setError("");

        // Focus on the next input if the current one is filled
        if (index < 5) {
          otpRefs.current[index + 1].current.focus();
        }
      } else {
        // If the value is empty (user cleared it), update the OTP array
        let newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
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
      setError("Please enter all six digits of the verification code.");
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
      }
    } catch (error) {
      setLoading(false);
      
      if (error.response) {
        // Server responded with an error
        setError(error.response.data.message || "Invalid or expired verification code. Please try again.");
      } else if (error.request) {
        // No response received
        setError("Network error. Please check your connection and try again.");
      } else {
        // Request setup error
        setError("Failed to verify code. Please try again.");
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
        "Code Resent",
        "A new verification code has been sent to your email.",
        [{ text: "OK" }]
      );
    } catch (error) {
      setLoading(false);
      
      if (error.response) {
        setError(error.response.data.message || "Failed to resend verification code.");
      } else if (error.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Failed to resend verification code. Please try again.");
      }
      console.error("Resend OTP error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <FontAwesome name="arrow-left" size={16} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Verification</Text>
        <View style={{width: 40}} />
      </LinearGradient>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.contentContainer,
              {
                opacity: fadeIn,
                transform: [{ translateY: slideUp }]
              }
            ]}
          >
            {/* Success Animation */}
            {verificationSuccess && (
              <Animated.View style={[
                styles.successContainer,
                {
                  opacity: successAnim,
                  transform: [{
                    scale: successAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1]
                    })
                  }]
                }
              ]}>
                <View style={styles.successIconContainer}>
                  <Feather name="check-circle" size={65} color={colors.primary} />
                </View>
                <Text style={styles.successText}>Verification Successful!</Text>
                <Text style={styles.successSubtext}>Redirecting you to login...</Text>
              </Animated.View>
            )}
            
            {!verificationSuccess && (
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={styles.title}>Verify Your Email</Text>
                  <Text style={styles.subtitle}>
                    Please enter the 6-digit code sent to:
                  </Text>
                  <Text style={styles.emailText}>{email}</Text>
                </View>

                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.inputWrapper}>
                      <TextInput
                        ref={otpRefs.current[index]}
                        style={[
                          styles.otpInput,
                          digit ? styles.otpInputFilled : {},
                          error && !digit ? styles.otpInputError : {}
                        ]}
                        value={digit}
                        onChangeText={(value) => handleChange(index, value)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        keyboardType="numeric"
                        maxLength={1}
                      />
                    </View>
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={18} color={colors.error} style={styles.errorIcon} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity 
                  style={[
                    styles.verifyButton,
                    (loading || otp.some(digit => digit === "")) && styles.buttonDisabled
                  ]}
                  onPress={handleSubmit} 
                  disabled={loading || otp.some(digit => digit === "")}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[(loading || otp.some(digit => digit === "")) ? colors.textLight : colors.primaryDark, 
                            (loading || otp.some(digit => digit === "")) ? colors.textLight : colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Code</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Didn't receive the code? 
                  </Text>
                  {canResend ? (
                    <TouchableOpacity 
                      onPress={handleResendOtp} 
                      disabled={loading}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.resendButton}>Resend Code</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.countdownText}>
                      Resend in {countdown}s
                    </Text>
                  )}
                </View>
                
                <View style={styles.infoContainer}>
                  <Feather name="info" size={16} color={colors.primary} style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    Please check your spam folder if you don't see the code in your inbox.
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: Platform.OS === 'ios' ? 110 : 90,
    paddingTop: Platform.OS === 'ios' ? 50 : 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 30,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 7,
    alignItems: "center",
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    width: "100%",
    paddingHorizontal: isSmallScreen ? 5 : 10,
  },
  inputWrapper: {
    marginHorizontal: isSmallScreen ? 3 : 5,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  otpInput: {
    width: isSmallScreen ? 42 : 46,
    height: isSmallScreen ? 54 : 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
    backgroundColor: colors.inputBg,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: "rgba(11, 97, 126, 0.06)",
  },
  otpInputError: {
    borderColor: colors.error,
    backgroundColor: "rgba(229, 57, 53, 0.05)",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 57, 53, 0.08)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 22,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(229, 57, 53, 0.2)",
  },
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  verifyButton: {
    width: "100%",
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 6,
  },
  gradientButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 22,
  },
  resendText: {
    fontSize: 15,
    color: colors.textLight,
    marginRight: 5,
  },
  resendButton: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "700",
  },
  countdownText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  // Success animation styles
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    width: '90%',
    maxWidth: 380,
    padding: 40,
    borderRadius: 24,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 28,
    backgroundColor: 'rgba(11, 97, 126, 0.08)',
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  successText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  successSubtext: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(11, 97, 126, 0.06)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(11, 97, 126, 0.1)",
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
    lineHeight: 18,
  }
});

export default OTPVerification;