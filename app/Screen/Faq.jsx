import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "../Components/BottomNavigation"; // Import the Bottom Navigation component

const { width, height } = Dimensions.get("window");

// Accordion component for FAQ items
const AccordionItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleAccordion = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const bodyHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 150], // Adjust based on content
  });

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={toggleAccordion}
        activeOpacity={0.8}
      >
        <Text style={styles.accordionQuestion}>{question}</Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#0b617e"
        />
      </TouchableOpacity>
      <Animated.View
        style={[styles.accordionBody, { height: bodyHeight }]}
      >
        <Text style={styles.accordionAnswer}>{answer}</Text>
      </Animated.View>
    </View>
  );
};

export default function FAQScreen() {
  const router = useRouter();

  // FAQ data
  const faqData = [
    {
      category: "General Questions",
      questions: [
        {
          question: "What is AI SaanKa?",
          answer: "AI SaanKa? is an AI-driven mobility platform designed to optimize urban travel through predictive route planning, real-time location tracking, and sustainable transportation solutions.",
        },
        {
          question: "How does AI SaanKa? improve urban mobility?",
          answer: "The platform leverages real-time data, machine learning, and predictive analytics to reduce congestion, enhance travel efficiency, and provide smarter commuting options.",
        },
        {
          question: "Is AI SaanKa? available in all cities?",
          answer: "Currently, AI SaanKa? is being deployed in select urban areas. Expansion plans are in progress to bring the service to more cities.",
        },
      ],
    },
    {
      category: "Features & Functionality",
      questions: [
        {
          question: "How does predictive traffic analysis work?",
          answer: "The platform analyzes historical and real-time traffic data to forecast congestion patterns and suggest the most efficient routes.",
        },
        {
          question: "Can AI SaanKa? provide real-time traffic updates?",
          answer: "Yes, users receive live updates through SMS, email, and app notifications to stay informed about road conditions and traffic changes.",
        },
        {
          question: "What is dynamic route planning?",
          answer: "Dynamic route planning automatically adjusts your suggested route based on live traffic data, road closures, and unforeseen incidents.",
        },
      ],
    },
    {
      category: "User Experience & Customization",
      questions: [
        {
          question: "Can I personalize my travel preferences?",
          answer: "Yes, users can set preferred routes, receive notifications based on their commute time, and customize their experience within the app.",
        },
        {
          question: "How do notifications work?",
          answer: "AI SaanKa? prioritizes notifications based on urgency. Frequent commuters receive updates on their regular routes, while occasional users get alerts relevant to their journeys.",
        },
        {
          question: "Is AI SaanKa? accessible to people with disabilities?",
          answer: "The platform is designed with accessibility in mind, offering voice-assisted navigation, text-to-speech options, and other assistive features.",
        },
      ],
    },
    {
      category: "Sustainability & Impact",
      questions: [
        {
          question: "How does AI SaanKa? contribute to sustainability?",
          answer: "By optimizing routes and reducing idle time, AI SaanKa? lowers fuel consumption, decreases emissions, and promotes eco-friendly transportation choices.",
        },
        {
          question: "Does AI SaanKa? integrate with public transport?",
          answer: "Yes, it provides real-time public transport schedules and suggests multi-modal travel options, including buses, trains, and shared mobility services.",
        },
      ],
    },
    {
      category: "Security & Privacy",
      questions: [
        {
          question: "How is my data protected?",
          answer: "AI SaanKa? uses encryption and secure cloud storage to ensure user data privacy. Personal information is never shared without consent.",
        },
        {
          question: "Do I need to create an account to use AI SaanKa?",
          answer: "While basic features are accessible without an account, creating one allows for personalized recommendations and enhanced functionalities.",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.mainHeading}>FREQUENTLY ASKED QUESTIONS</Text>
            <Text style={styles.subHeading}>
              Find answers to common questions about AI SaanKa? and how it can transform your urban travel experience.
            </Text>
          </View>
          
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircleSmall} />
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* FAQ Categories */}
        {faqData.map((category, index) => (
          <View key={index} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            
            <View style={styles.questionsContainer}>
              {category.questions.map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  question={faq.question} 
                  answer={faq.answer} 
                />
              ))}
            </View>
          </View>
        ))}
        
        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            {/* Branding Section */}
            <View style={styles.brandingSection}>
              <Text style={styles.footerTitle}>AI SaanKa?</Text>
              <Text style={styles.footerDescription}>
                AI-powered mapping platform provides real-time traffic insights,
                predictive routes, and accurate ETAs for seamless navigation.
                With smart search, turn-by-turn guidance, and instant alerts, we
                ensure a fast and hassle-free travel experience.
              </Text>
            </View>
            
            <View style={styles.footerLinksContainer}>
              <View style={styles.footerLinksColumn}>
                <Text style={styles.footerLinksTitle}>Quick Links</Text>
                <TouchableOpacity onPress={() => router.push('/Screen/About')}>
                  <Text style={styles.footerLink}>About</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/Screen/Faq')}>
                  <Text style={styles.footerLink}>FAQ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/Screen/Services')}>
                  <Text style={styles.footerLink}>Services</Text>
                </TouchableOpacity>
              </View>
              
              {/* Resources */}
              <View style={styles.footerLinksColumn}>
                <Text style={styles.footerLinksTitle}>Resources</Text>
                <Text style={styles.footerLink}>Help Center</Text>
                <Text style={styles.footerLink}>Community</Text>
                <Text style={styles.footerLink}>Partners</Text>
              </View>
            </View>
          </View>
          
          {/* Copyright */}
          <View style={styles.copyright}>
            <Text style={styles.copyrightText}>
              © 2025 AISaanKa. All rights reserved.
            </Text>
            <Text style={styles.copyrightText}>
              Designed and Developed by AISaanKa Team. Made with passion for a smoother commute.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Navigation - Removed the navigation prop */}
      <BottomNavigation activeTab="Faqs" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 70, // Added padding for bottom navigation
  },
  
  // Header Section
  headerSection: {
    minHeight: height * 0.4,
    padding: 24,
    paddingTop: 40,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0b617e',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  subHeading: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 10,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    right: -150,
    top: '10%',
    zIndex: 1,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(11, 97, 126, 0.03)',
    left: -50,
    bottom: '10%',
    zIndex: 1,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#0b617e',
    marginVertical: 30,
    width: '90%',
    alignSelf: 'center',
    opacity: 0.3,
  },
  
  // Category Section
  categorySection: {
    padding: 16,
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0b617e',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionsContainer: {
    marginBottom: 8,
  },
  
  // Accordion Styles
  accordionContainer: {
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0bacf',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f7f7f7',
  },
  accordionQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b617e',
    width: '90%',
  },
  accordionBody: {
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  accordionAnswer: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    paddingBottom: 16,
  },
  
  // Footer
  footer: {
    backgroundColor: '#0b617e',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 20,
    marginTop: 20,
  },
  footerContent: {
    marginBottom: 30,
  },
  brandingSection: {
    marginBottom: 30,
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  footerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  footerLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  footerLinksColumn: {
    width: '45%',
  },
  footerLinksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  downloadSection: {
    alignItems: 'center',
  },
  footerDownloadButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    marginTop: 8,
  },
  footerDownloadText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  footerButtonIcon: {
    marginLeft: 8,
  },
  copyright: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 20,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 5,
  },
});