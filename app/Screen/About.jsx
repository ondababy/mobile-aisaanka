import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "../Components/BottomNavigation"; // Import the Bottom Navigation component

const { width, height } = Dimensions.get("window");

export default function AboutScreen() {
  const router = useRouter();
  const currentPath = usePathname();

  const handleNavigation = (route) => {
    router.push(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section 1 - Introduction */}
        <View style={styles.introSection}>
          <View style={styles.introTextContainer}>
            <Text style={styles.mainHeading}>
              Revolutionizing Urban Mobility with AI
            </Text>
            <Text style={styles.subHeading}>
              AI SaanKa? is your ultimate solution for smarter, faster, and
              greener urban travel.
            </Text>
          </View>
          
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircleSmall} />
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 2 - Our Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Our Features</Text>
          
          <View style={styles.featureRow}>
            {/* Feature Icon Card */}
            <View style={styles.featureIconCard}>
              <View style={styles.iconCircle}>
                <Feather name="activity" size={40} color="#0b617e" />
              </View>
              <Text style={styles.iconTitle}>Real-time Traffic Analysis</Text>
            </View>
            
            {/* Feature Description Card */}
            <View style={styles.featureDescriptionCard}>
              <View style={styles.featureItem}>
                <Text style={styles.featureItemTitle}>✔ Predict Traffic Patterns</Text>
                <Text style={styles.featureItemDesc}>
                  Our AI algorithms analyze real-time data to forecast traffic
                  congestion and suggest optimal routes.
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Text style={styles.featureItemTitle}>✔ Provide Real-Time Updates</Text>
                <Text style={styles.featureItemDesc}>
                  Stay informed with instant notifications about accidents,
                  road closures, and alternative routes.
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Text style={styles.featureItemTitle}>✔ Enable Dynamic Route Planning</Text>
                <Text style={styles.featureItemDesc}>
                  Adjust your travel plans on-the-fly based on current road
                  conditions.
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Text style={styles.featureItemTitle}>✔ Smart Notifications & Alerts</Text>
                <Text style={styles.featureItemDesc}>
                  Receive personalized alerts via SMS, email, or app
                  notifications.
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Section 3 - Why It Matters */}
        <View style={styles.mattersSection}>
          <Text style={styles.sectionTitle}>Why It Matters</Text>
          
          <View style={styles.mattersRow}>
            {/* Environmental Impact Card */}
            <View style={styles.mattersCard}>
              <Text style={styles.mattersCardTitle}>🌎 Environmental Impact</Text>
              <Text style={styles.mattersCardDesc}>
                AI SaanKa? helps reduce carbon footprints by optimizing
                routes and promoting eco-friendly travel.
              </Text>
            </View>
            
            {/* Accessibility Card */}
            <View style={styles.accessibilityCard}>
              <View style={styles.iconCircle}>
                <Feather name="map" size={40} color="#0b617e" />
              </View>
              <Text style={styles.iconTitle}>Increased Accessibility</Text>
              <Text style={styles.accessibilityDesc}>
                Our platform bridges the gap between riders and available
                transportation options, enhancing connectivity in urban areas.
              </Text>
            </View>
          </View>
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Additional Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Additional Benefits</Text>
          
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitCard}>
              <View style={styles.smallIconCircle}>
                <Feather name="clock" size={28} color="#0b617e" />
              </View>
              <Text style={styles.benefitTitle}>Time Savings</Text>
              <Text style={styles.benefitDesc}>
                Save valuable time with optimized routes and traffic predictions
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <View style={styles.smallIconCircle}>
                <Feather name="dollar-sign" size={28} color="#0b617e" />
              </View>
              <Text style={styles.benefitTitle}>Cost Effective</Text>
              <Text style={styles.benefitDesc}>
                Reduce fuel consumption and transportation costs
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <View style={styles.smallIconCircle}>
                <Feather name="shield" size={28} color="#0b617e" />
              </View>
              <Text style={styles.benefitTitle}>Enhanced Safety</Text>
              <Text style={styles.benefitDesc}>
                Real-time hazard alerts and safer route recommendations
              </Text>
            </View>
            
            <View style={styles.benefitCard}>
              <View style={styles.smallIconCircle}>
                <Feather name="smile" size={28} color="#0b617e" />
              </View>
              <Text style={styles.benefitTitle}>Reduced Stress</Text>
              <Text style={styles.benefitDesc}>
                Enjoy a more predictable and pleasant commuting experience
              </Text>
            </View>
          </View>
        </View>
        
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
      
      {/* UPDATE: Using the BottomNavigation component correctly */}
      <BottomNavigation activeTab="About" />
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
  
  // Introduction Section
  introSection: {
    minHeight: height * 0.7,
    padding: 24,
    paddingTop: 40,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  introTextContainer: {
    maxWidth: '85%',
    zIndex: 2,
  },
  mainHeading: {
    fontSize: 38,
    fontWeight: '800',
    color: '#0b617e',
    lineHeight: 46,
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 18,
    color: '#444',
    lineHeight: 28,
    marginBottom: 30,
  },
  downloadButton: {
    backgroundColor: '#6281dc',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(11, 97, 126, 0.05)',
    right: -100,
    top: '40%',
    zIndex: 1,
  },
  decorativeCircleSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(11, 97, 126, 0.03)',
    right: 50,
    top: '20%',
    zIndex: 1,
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#0b617e',
    marginVertical: 40,
    width: '90%',
    alignSelf: 'center',
    opacity: 0.3,
  },
  
  // Features Section
  featuresSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0b617e',
    textAlign: 'center',
    marginBottom: 30,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureRow: {
    marginBottom: 20,
  },
  featureIconCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e0bacf',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(11, 97, 126, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b617e',
    textAlign: 'center',
  },
  featureDescriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e0bacf',
  },
  featureItem: {
    marginBottom: 16,
  },
  featureItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b617e',
    marginBottom: 6,
  },
  featureItemDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  
  // Why It Matters Section
  mattersSection: {
    padding: 24,
  },
  mattersRow: {
    marginBottom: 20,
  },
  mattersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e0bacf',
  },
  mattersCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b617e',
    marginBottom: 10,
  },
  mattersCardDesc: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  accessibilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e0bacf',
  },
  accessibilityDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  
  // Benefits Section
  benefitsSection: {
    padding: 24,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(11, 97, 126, 0.1)',
  },
  smallIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(11, 97, 126, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b617e',
    textAlign: 'center',
    marginBottom: 8,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
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