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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function ServicesScreen() {
  const router = useRouter();


  // Services data
  const servicesData = [
    {
      title: "Predictive Traffic Analysis",
      description: [
        "AI-powered insights analyze historical and real-time traffic data to forecast congestion.",
        "Helps commuters plan their trips efficiently, avoiding high-traffic zones.",
        "Reduces travel time and enhances road safety.",
      ],
      icon: "activity"
    },
    {
      title: "Real-Time Location Tracking",
      description: [
        "Live GPS tracking for commuters, ride-sharing, and public transport users.",
        "Get instant updates on road closures, accidents, and weather conditions.",
        "Enhances navigation accuracy with AI-driven data processing.",
      ],
      icon: "map-pin"
    },
    {
      title: "Dynamic Route Planning",
      description: [
        "Automatically suggests the fastest and safest routes based on real-time data.",
        "Re-routes journeys instantly when unexpected delays occur.",
        "Personalized travel recommendations based on user behavior.",
      ],
      icon: "navigation"
    },
    {
      title: "Multi-Modal Transportation Integration",
      description: [
        "Combines private, public, and shared mobility options into a seamless journey.",
        "Real-time schedules for buses, trains, and alternative transport services.",
        "Promotes smarter and more sustainable travel choices.",
      ],
      icon: "layers"
    },
    {
      title: "Sustainability & Carbon Footprint Reduction",
      description: [
        "Optimizes routes to minimize fuel consumption and emissions.",
        "Encourages eco-friendly transport alternatives, such as biking and carpooling.",
        "Supports smart city initiatives for greener urban environments.",
      ],
      icon: "leaf"
    },
    {
      title: "AI-Powered City Traffic Management",
      description: [
        "Works with local governments to improve road infrastructure planning.",
        "Analyzes city-wide traffic trends for better policy-making.",
        "Reduces bottlenecks and enhances road network efficiency.",
      ],
      icon: "cpu"
    },
  ];

  // Generate initials from service title
  const getInitials = (title) => {
    return title.split(' ').map(word => word[0]).join('');
  };

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
            <Text style={styles.mainHeading}>OUR SERVICES</Text>
            <Text style={styles.subHeading}>
              Explore the innovative services offered by AI SaanKa? to revolutionize urban mobility.
            </Text>
          </View>
          
          <View style={styles.decorativeCircle} />
          <View style={styles.decorativeCircleSmall} />
        </View>
        
        {/* Services Section */}
        <View style={styles.servicesSection}>
          {servicesData.map((service, index) => (
            <View 
              key={index} 
              style={[
                styles.serviceRow,
                index === servicesData.length - 1 && { marginBottom: 0 }
              ]}
            >
              {/* For alternating layout on mobile, we'll use conditional styling */}
              {index % 2 === 0 ? (
                <>
                  {/* Icon Block */}
                  <View style={styles.serviceIconContainer}>
                    <View style={styles.iconBlock}>
                      <Feather name={service.icon} size={40} color="#0b617e" />
                      <Text style={styles.initialsText}>{getInitials(service.title)}</Text>
                    </View>
                  </View>
                  
                  {/* Description Card */}
                  <View style={styles.serviceCardContainer}>
                    <View style={styles.serviceCard}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <View style={styles.descriptionList}>
                        {service.description.map((point, idx) => (
                          <View key={idx} style={styles.descriptionItem}>
                            <Text style={styles.checkmark}>✓</Text>
                            <Text style={styles.descriptionText}>{point}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Description Card */}
                  <View style={styles.serviceCardContainer}>
                    <View style={styles.serviceCard}>
                      <Text style={styles.serviceTitle}>{service.title}</Text>
                      <View style={styles.descriptionList}>
                        {service.description.map((point, idx) => (
                          <View key={idx} style={styles.descriptionItem}>
                            <Text style={styles.checkmark}>✓</Text>
                            <Text style={styles.descriptionText}>{point}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                  
                  {/* Icon Block */}
                  <View style={styles.serviceIconContainer}>
                    <View style={styles.iconBlock}>
                      <Feather name={service.icon} size={40} color="#0b617e" />
                      <Text style={styles.initialsText}>{getInitials(service.title)}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          ))}
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
            
            {/* Footer Links */}
            <View style={styles.footerLinksContainer}>
              <View style={styles.footerLinksColumn}>
                <Text style={styles.footerLinksTitle}>Quick Links</Text>
                <TouchableOpacity onPress={() => router.push('/Screen/About')}>
                  <Text style={styles.footerLink}>About</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/Screen/Faq')}>
                  <Text style={styles.footerLink}>FAQ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/Screen/Service')}>
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
  },
  
  // Header Section
  headerSection: {
    minHeight: height * 0.3,
    padding: 24,
    paddingTop: 40,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
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
  
  // Services Section
  servicesSection: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    paddingVertical: 30,
  },
  serviceRow: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  serviceCardContainer: {
    flex: 1,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#0b617e',
    minHeight: 200,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b617e',
    marginBottom: 12,
  },
  descriptionList: {
    marginLeft: 5,
  },
  descriptionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0b617e',
    marginRight: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  serviceIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBlock: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#0b617e',
  },
  initialsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0b617e',
    marginTop: 8,
  },
  
  // Footer
  footer: {
    backgroundColor: '#0b617e',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 20,
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