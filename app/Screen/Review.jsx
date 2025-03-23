import React, { useState } from "react";
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const Review = () => {
  const [suggestion, setSuggestion] = useState("");
  const [issue, setIssue] = useState("");
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Function to handle form submission
  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please provide a star rating before submitting!", [
        { text: "OK", style: "cancel" },
      ]);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      Alert.alert("Review Submitted", "Thank you for your feedback!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      
      setSuggestion("");
      setIssue("");
      setRating(0);
    }, 800);
  };

  // Get rating text display
  const getRatingText = () => {
    if (rating === 0) return "Tap to rate";
    if (rating === 1) return "Poor";
    if (rating === 2) return "Fair";
    if (rating === 3) return "Good";
    if (rating === 4) return "Very Good";
    return "Excellent";
  };

  // Render individual star 
  const renderStar = (starValue) => (
    <TouchableOpacity 
      key={`star-${starValue}`}
      onPress={() => setRating(starValue)}
      style={styles.starButton}
    >
      <Icon 
        name={starValue <= rating ? "star" : "star-border"} 
        size={36} 
        color={starValue <= rating ? "#fbc02d" : "#e0e0e0"} 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f8f9fa" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={18} color="#0b617e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Feedback</Text>
        <View style={{width: 40}} />
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>How was your experience?</Text>
            <View style={styles.ratingContainer}>
              {renderStar(1)}
              {renderStar(2)}
              {renderStar(3)}
              {renderStar(4)}
              {renderStar(5)}
            </View>
            <Text style={styles.ratingText}>{getRatingText()}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />
          
          {/* Suggestions Section */}
          <View style={styles.inputSection}>
            <View style={styles.labelContainer}>
              <FontAwesome5 name="lightbulb" size={14} color="#0b617e" style={styles.inputIcon} />
              <Text style={styles.sectionLabel}>Suggestions for Improvement</Text>
            </View>
            <View style={styles.textInputWrapper}>
              <TextInput
                placeholder="Share your ideas on how we can improve..."
                placeholderTextColor="#9e9e9e"
                style={styles.textInput}
                multiline
                value={suggestion}
                onChangeText={setSuggestion}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Issue Section */}
          <View style={styles.inputSection}>
            <View style={styles.labelContainer}>
              <FontAwesome5 name="exclamation-circle" size={14} color="#0b617e" style={styles.inputIcon} />
              <Text style={styles.sectionLabel}>Report an Issue</Text>
            </View>
            <View style={styles.textInputWrapper}>
              <TextInput
                placeholder="Tell us about any problems you encountered..."
                placeholderTextColor="#9e9e9e"
                style={styles.textInput}
                multiline
                value={issue}
                onChangeText={setIssue}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || rating === 0) ? styles.submitButtonDisabled : null
            ]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <FontAwesome5 name="paper-plane" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  card: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 15,
  },
  starButton: {
    padding: 5,
    transform: [{scale: 1.1}],
  },
  ratingText: {
    marginTop: 5,
    fontSize: 15,
    color: "#757575",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputWrapper: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textInput: {
    minHeight: 120,
    padding: 15,
    fontSize: 15,
    color: "#333333",
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: "#0b617e",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#0b617e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#b0bec5",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginLeft: 8,
  },
});

export default Review;