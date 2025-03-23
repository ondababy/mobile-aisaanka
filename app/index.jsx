import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
  StatusBar,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import BottomNavigation from "./Components/BottomNavigation";

const { width, height } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    // router.push("/Screen/Main");
    router.push("/Screen/Dashboard");
  };

  const handleLogin = () => {
    router.push("/Auth/Login");
  };

  // Development team data
  const teamMembers = [
    {
      id: "1",
      name: "Adrian Philip Onda",
      role: "Full Stack Developer",
      image: require("../assets/images/person1.jpg"),
    },
    {
      id: "2",
      name: "Mikylla B. Fabro",
      role: "Backend Developer",
      image: require("../assets/images/person22.jpg"),
    },
    {
      id: "3",
      name: "Rizza S. Lazaro",
      role: "Frontend Developer",
      image: require("../assets/images/person3.jpg"),
    },
    {
      id: "4",
      name: "Marvin S. Gamo",
      role: "Frontend Developer",
      image: require("../assets/images/person44.jpg"),
    },
  ];

  // How to use steps
  const howToUseSteps = [
    {
      id: "1",
      title: "Login or Register",
      description:
        "Register for a better experience or use our services without registering. Returning users can simply log in.",
      icon: "user",
    },
    {
      id: "2",
      title: "Enter Your Destination",
      description:
        "Type your desired destination and the system will show available routes.",
      icon: "map-pin",
    },
    {
      id: "3",
      title: "View Predicted Routes",
      description:
        "See route options considering traffic, fares, and available PUVs with estimated arrival times.",
      icon: "navigation",
    },
    {
      id: "4",
      title: "Select Your Route",
      description:
        "Choose the best route for you, confirm the details, and begin your journey.",
      icon: "check-circle",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>AISaanKa?</Text>
          <Text style={styles.heroSubtitle}>
            Effortless Commuting in Metro Manila
          </Text>
          <Text style={styles.heroDescription}>
            Navigate Metro Manila with ease using AI-powered commuting
            solutions. Our platform provides predictive routes, calculated
            fares, and real-time traffic analysis for a smoother, more
            predictable commute.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push("/Auth/Login")}
            >
              <Feather
                name="log-in"
                size={18}
                color="#ffffff"
                style={styles.buttonIcon}
              />
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => router.push("/Auth/Register")}
            >
              <Feather
                name="user-plus"
                size={18}
                color="#0b617e"
                style={styles.buttonIcon}
              />
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* How to Use Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>How to use AISaanKa?</Text>

          <View style={styles.stepsContainer}>
            {howToUseSteps.map((step) => (
              <View key={step.id} style={styles.stepCard}>
                <View style={styles.iconCircle}>
                  <Feather name={step.icon} size={24} color="#0b617e" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Mission and Vision Section */}
        <View style={styles.purposeContainer}>
          <View style={styles.purposeHeader}>
            <Text style={styles.purposeTitle}>Our Purpose</Text>
            <View style={styles.purposeDivider} />
          </View>

          <Text style={styles.purposeSubtitle}>
            Driven by innovation and a commitment to transform urban mobility in
            Metro Manila
          </Text>

          {/* Mission Card */}
          <View style={styles.cardContainer}>
            <View style={styles.purposeCard}>
              <View style={styles.cardLabelContainer}>
                <Text style={styles.cardLabel}>Our Mission</Text>
              </View>
              <View style={styles.iconContainer}>
                <View style={styles.largeIconCircle}>
                  <Feather name="arrow-down" size={32} color="#0b617e" />
                </View>
              </View>
              <Text style={styles.cardDescription}>
                To revolutionize urban commuting in Metro Manila by providing
                intelligent, accessible transportation solutions that reduce
                travel stress, save time, and empower commuters to make informed
                travel decisions through cutting-edge AI technology and
                real-time data analysis.
              </Text>
            </View>

            {/* Vision Card */}
            <View style={styles.purposeCard}>
              <View style={styles.cardLabelContainer}>
                <Text style={styles.cardLabel}>Our Vision</Text>
              </View>
              <View style={styles.iconContainer}>
                <View style={styles.largeIconCircle}>
                  <Feather name="eye" size={32} color="#0b617e" />
                </View>
              </View>
              <Text style={styles.cardDescription}>
                To create a future where commuting in Metro Manila is seamless,
                predictable, and stress-free. We envision a transportation
                ecosystem where technology bridges the gap between commuters and
                public transport, making every journey efficient and enjoyable
                for all citizens regardless of their destination.
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Team Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Development Team</Text>

          {/* Adviser */}
          <View style={styles.adviserCard}>
            <Image
              source={require("../assets/images/maam-pops.jpg")}
              style={styles.adviserImage}
              resizeMode="cover"
            />
            <Text style={styles.adviserName}>Prof. Pops V. Madriaga</Text>
            <Text style={styles.adviserRole}>Project Adviser</Text>
          </View>

          {/* Team Members */}
          <View style={styles.teamContainer}>
            {teamMembers.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                <Image
                  source={member.image}
                  style={styles.memberImage}
                  resizeMode="cover"
                />
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerBranding}>
              <Text style={styles.footerTitle}>AI SaanKa?</Text>
              <Text style={styles.footerDescription}>
                AI-powered mapping platform provides real-time traffic insights,
                predictive routes, and accurate ETAs for seamless navigation.
              </Text>
            </View>

            <View style={styles.footerLinksContainer}>
              <View style={styles.footerLinksColumn}>
                <Text style={styles.footerLinksTitle}>Quick Links</Text>
                <TouchableOpacity onPress={() => router.push("/Screen/About")}>
                  <Text style={styles.footerLink}>About</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/Screen/Faq")}>
                  <Text style={styles.footerLink}>FAQ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push("/Screen/Services")}
                >
                  <Text style={styles.footerLink}>Services</Text>
                </TouchableOpacity>
              </View>

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
              Designed and Developed by AISaanKa Team.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation - Removed the navigation prop */}
      <BottomNavigation activeTab="Home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 70, // Adjusted to accommodate bottom navigation
  },
  // Hero Section
  heroSection: {
    padding: 24,
    paddingTop: 40,
    position: "relative",
    minHeight: height * 0.7,
    justifyContent: "center",
    alignItems: "flex-start", // Left align text
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1, // Very light background
    zIndex: -1,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#0b617e",
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 16,
    maxWidth: "90%",
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555555",
    marginBottom: 30,
  },
  getStartedButton: {
    flexDirection: "row",
    backgroundColor: "#0b617e",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 20,
  },
  getStartedButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#0b617e",
    marginVertical: 40,
    width: "90%",
    alignSelf: "center",
    opacity: 0.3,
  },
  // Section Styles
  sectionContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0b617e",
    textAlign: "center",
    marginBottom: 30,
  },
  // How to Use Steps
  stepsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  stepCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#0b617e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(11, 97, 126, 0.1)",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(11, 97, 126, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 13,
    color: "#555555",
    textAlign: "center",
    lineHeight: 18,
  },
  // Purpose Section
  purposeContainer: {
    padding: 24,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    marginHorizontal: 16,
  },
  purposeHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  purposeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0b617e",
    textAlign: "center",
    marginBottom: 16,
  },
  purposeDivider: {
    height: 4,
    width: 100,
    backgroundColor: "#0b617e",
    borderRadius: 2,
  },
  purposeSubtitle: {
    fontSize: 16,
    color: "#555555",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  cardContainer: {
    marginTop: 10,
  },
  purposeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#0b617e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(11, 97, 126, 0.1)",
    position: "relative",
    paddingTop: 40,
  },
  cardLabelContainer: {
    position: "absolute",
    top: -15,
    left: "50%",
    transform: [{ translateX: -60 }],
    backgroundColor: "#0b617e",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    zIndex: 2,
  },
  cardLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",     // Centers text horizontally
    alignSelf: "center",     // Centers the component horizontally within its parent
    justifyContent: "center" // Vertical alignment
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  largeIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(11, 97, 126, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDescription: {
    fontSize: 15,
    color: "#555555",
    lineHeight: 24,
    textAlign: "center",
  },
  // Team Section
  adviserCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    alignItems: "center",
    shadowColor: "#0b617e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#0b617e",
  },
  adviserImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#0b617e",
  },
  adviserName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0b617e",
    marginBottom: 4,
  },
  adviserRole: {
    fontSize: 16,
    color: "#555555",
  },
  teamContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  memberCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#0b617e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#0b617e",
  },
  memberImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
    textAlign: "center",
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 12,
    color: "#555555",
    textAlign: "center",
  },
  // Footer Section
  footer: {
    backgroundColor: "#0b617e",
    padding: 30,
    paddingBottom: 20,
  },
  footerContent: {
    marginBottom: 30,
  },
  footerBranding: {
    marginBottom: 30,
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  footerDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 22,
  },
  footerLinksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  footerLinksColumn: {
    width: "45%",
  },
  footerLinksTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 10,
  },
  downloadContainer: {
    alignItems: "center",
  },
  downloadButton: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    alignItems: "center",
    marginTop: 8,
  },
  downloadButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  smallButtonIcon: {
    marginLeft: 8,
  },
  copyright: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: 20,
    alignItems: "center",
  },
  copyrightText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 25,
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#0b617e',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    marginRight: 10,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0b617e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    flex: 1,
    marginLeft: 10,
    borderWidth: 1.5,
    borderColor: '#0b617e',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#0b617e',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
