// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   SafeAreaView
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { MaterialIcons } from '@expo/vector-icons';
// import Toast from 'react-native-toast-message';

// function ForgotPassword({ navigation }) {
//   const [email, setEmail] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [submitted, setSubmitted] = useState(false);
  
//   // In a real app, you'd store this in a config file or use environment variables
//   const API_URL = "your-api-url";

//   const handleChange = (text) => {
//     setEmail(text);
//     setError('');
//   };

//   const validateForm = () => {
//     if (!email.trim()) {
//       setError('Email is required');
//       return false;
//     } else if (!/\S+@\S+\.\S+/.test(email)) {
//       setError('Invalid email format');
//       return false;
//     }
//     return true;
//   };

//   const showAlert = (title, message, type) => {
//     Toast.show({
//       type: type, // 'success', 'error', 'info'
//       text1: title,
//       text2: message,
//       position: 'bottom',
//       visibilityTime: 4000,
//       autoHide: true,
//     });
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const response = await fetch(`${API_URL}/auth/forgot-password`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email }),
//       });

//       const data = await response.json();
//       setLoading(false);

//       if (!response.ok) {
//         throw new Error(data.message || 'Failed to process request');
//       }

//       setSubmitted(true);
//       showAlert(
//         'Email Sent',
//         'Check your email for a password reset link',
//         'success'
//       );
//     } catch (error) {
//       setLoading(false);
//       showAlert('Error', error.message || 'Something went wrong. Please try again.', 'error');
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.keyboardAvoidView}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContainer}>
//           {/* Top gradient bar */}
//           <LinearGradient
//             colors={['#0b617e', '#1c8aad']}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 0 }}
//             style={styles.topBar}
//           />

//           {/* Decorative elements */}
//           <View style={[styles.decorativeCircle, styles.topLeftCircle]} />
//           <View style={[styles.decorativeCircle, styles.bottomRightCircle]} />

//           {/* Back button */}
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigation.navigate('Login')}
//           >
//             <MaterialIcons name="arrow-back-ios" size={20} color="#0b617e" />
//             <Text style={styles.backButtonText}>Back to Login</Text>
//           </TouchableOpacity>

//           <View style={styles.card}>
//             {/* Brand header */}
//             <View style={styles.brandHeader}>
//               <Text style={styles.brandTitle}>AI SaanKa</Text>
//               <Text style={styles.brandSubtitle}>
//                 Your transportation navigation assistant
//               </Text>
//             </View>

//             <View style={styles.cardContent}>
//               <Text style={styles.cardTitle}>Forgot Password</Text>

//               {!submitted ? (
//                 <>
//                   <Text style={styles.cardSubtitle}>
//                     Enter your email and we'll send you a link to reset your password.
//                   </Text>

//                   <View style={styles.formContainer}>
//                     <View style={styles.inputContainer}>
//                       <MaterialIcons
//                         name="email"
//                         size={20}
//                         color="#0b617e"
//                         style={styles.inputIcon}
//                       />
//                       <TextInput
//                         style={styles.input}
//                         placeholder="Email"
//                         placeholderTextColor="#999"
//                         keyboardType="email-address"
//                         autoCapitalize="none"
//                         value={email}
//                         onChangeText={handleChange}
//                       />
//                     </View>
//                     {error ? <Text style={styles.errorText}>{error}</Text> : null}

//                     <TouchableOpacity
//                       style={styles.submitButton}
//                       onPress={handleSubmit}
//                       disabled={loading}
//                     >
//                       {loading ? (
//                         <ActivityIndicator size="small" color="#fff" />
//                       ) : (
//                         <Text style={styles.submitButtonText}>Send Reset Link</Text>
//                       )}
//                     </TouchableOpacity>
//                   </View>
//                 </>
//               ) : (
//                 <View style={styles.successContainer}>
//                   <Text style={styles.successText}>
//                     A password reset link has been sent to your email.
//                   </Text>
//                   <Text style={styles.successSubtext}>
//                     Please check your inbox and follow the instructions.
//                   </Text>

//                   <TouchableOpacity
//                     style={styles.returnButton}
//                     onPress={() => navigation.navigate('Login')}
//                   >
//                     <Text style={styles.returnButtonText}>Return to Login</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}

//               <View style={styles.footer}>
//                 <Text style={styles.footerText}>
//                   Remember your password?{' '}
//                   <Text
//                     style={styles.footerLink}
//                     onPress={() => navigation.navigate('Login')}
//                   >
//                     Sign In
//                   </Text>
//                 </Text>
//               </View>
//             </View>
//           </View>

//           <Text style={styles.copyright}>
//             © {new Date().getFullYear()} AI SaanKa. All rights reserved.
//           </Text>
//         </ScrollView>
//       </KeyboardAvoidingView>
//       <Toast ref={(ref) => Toast.setRef(ref)} />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   keyboardAvoidView: {
//     flex: 1,
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     position: 'relative',
//     paddingHorizontal: 20,
//     paddingBottom: 30,
//   },
//   topBar: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: 8,
//   },
//   decorativeCircle: {
//     position: 'absolute',
//     borderRadius: 250,
//     backgroundColor: 'rgba(11, 97, 126, 0.03)',
//   },
//   topLeftCircle: {
//     width: 500,
//     height: 500,
//     top: -100,
//     left: -100,
//   },
//   bottomRightCircle: {
//     width: 300,
//     height: 300,
//     bottom: -50,
//     right: -50,
//   },
//   backButton: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     zIndex: 10,
//   },
//   backButtonText: {
//     color: '#0b617e',
//     fontSize: 16,
//     marginLeft: 4,
//   },
//   card: {
//     marginTop: 80,
//     marginBottom: 20,
//     borderRadius: 16,
//     backgroundColor: '#FFFFFF',
//     shadowColor: 'rgba(11, 97, 126, 0.08)',
//     shadowOffset: { width: 0, height: 10 },
//     shadowOpacity: 1,
//     shadowRadius: 25,
//     elevation: 5,
//     borderWidth: 1,
//     borderColor: 'rgba(11, 97, 126, 0.1)',
//     overflow: 'hidden',
//   },
//   brandHeader: {
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(11, 97, 126, 0.1)',
//     padding: 20,
//     alignItems: 'center',
//   },
//   brandTitle: {
//     fontSize: 28,
//     fontWeight: '700',
//     letterSpacing: 1,
//     color: '#0b617e',
//   },
//   brandSubtitle: {
//     marginTop: 8,
//     fontSize: 14,
//     color: '#666',
//   },
//   cardContent: {
//     padding: 24,
//   },
//   cardTitle: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 10,
//     color: '#0b617e',
//     textAlign: 'center',
//   },
//   cardSubtitle: {
//     fontSize: 14,
//     marginBottom: 24,
//     color: '#666',
//     textAlign: 'center',
//   },
//   formContainer: {
//     marginTop: 10,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     height: 50,
//     paddingHorizontal: 12,
//     marginBottom: 5,
//   },
//   inputIcon: {
//     marginRight: 10,
//   },
//   input: {
//     flex: 1,
//     height: 50,
//     color: '#333',
//     fontSize: 16,
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 12,
//     marginBottom: 20,
//     marginLeft: 5,
//   },
//   submitButton: {
//     backgroundColor: '#0b617e',
//     borderRadius: 8,
//     height: 54,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 20,
//     shadowColor: 'rgba(11, 97, 126, 0.15)',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 1,
//     shadowRadius: 10,
//     elevation: 4,
//   },
//   submitButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   successContainer: {
//     alignItems: 'center',
//     paddingVertical: 16,
//   },
//   successText: {
//     fontSize: 16,
//     marginBottom: 8,
//     color: '#333',
//     textAlign: 'center',
//   },
//   successSubtext: {
//     fontSize: 14,
//     marginBottom: 18,
//     color: '#666',
//     textAlign: 'center',
//   },
//   returnButton: {
//     borderWidth: 1,
//     borderColor: '#0b617e',
//     borderRadius: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//   },
//   returnButtonText: {
//     color: '#0b617e',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   footer: {
//     marginTop: 30,
//     alignItems: 'center',
//   },
//   footerText: {
//     fontSize: 14,
//     color: '#666',
//   },
//   footerLink: {
//     color: '#0b617e',
//     fontWeight: '600',
//   },
//   copyright: {
//     fontSize: 12,
//     color: '#666',
//     textAlign: 'center',
//     marginTop: 16,
//     marginBottom: 10,
//   },
// });

// export default ForgotPassword;


import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const ForgotPassword = () => {
  return (
    <View>
      <Text>ForgotPassword</Text>
    </View>
  )
}

export default ForgotPassword

const styles = StyleSheet.create({})