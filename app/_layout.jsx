import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import "../global.css";

// Prevent SplashScreen from auto-hiding before fonts load
SplashScreen.preventAutoHideAsync();

const RootLayout = () => {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
  });

  useEffect(() => {
    if (error) {
      console.error("Error loading fonts:", error);
      return;
    }
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  // Prevent app from rendering before fonts are loaded
  if (!fontsLoaded && !error) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="Auth/Login" options={{ headerShown: false }} />
      <Stack.Screen name="Auth/Register" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Main" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Review" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Profile" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/History" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/About" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Faq" options={{ headerShown: false }} />
      <Stack.Screen name="Screen/Service" options={{ headerShown: false }} />
    </Stack>
  );
};

export default RootLayout;
