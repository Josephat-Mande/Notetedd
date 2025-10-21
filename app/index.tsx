import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleGetStarted = () => {
    router.replace("/AuthScreen"); // Navigate to the AuthScreen (Sign Up)
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../assets/images/splash-bg.jpg")} // Replace with your image path
        style={styles.backgroundImage}
        resizeMode="cover"
        onLoad={() => setImageLoaded(true)}
      >
        {!imageLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
          </View>
        )}

        {imageLoaded && (
          <View style={styles.overlay}>
            {/* App Name */}
            <Text style={styles.appName}>Note Tedd</Text>

            {/* Tagline */}
            <Text style={styles.tagline}>Learning Made Easier</Text>

            {/* Get Started Button */}
            <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}
      </ImageBackground>
    </View>
  );
}

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // Background color while loading
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Semi-transparent overlay
  },
  appName: {
    fontSize: width * 0.1, // Responsive font size
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "serif", // Use a custom font if available
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  tagline: {
    fontSize: width * 0.04, // Responsive font size
    color: "#fff",
    marginTop: 10,
    fontFamily: "sans-serif", // Use a custom font if available
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  button: {
    position: "absolute",
    bottom: height * 0.1, // Responsive positioning
    backgroundColor: "#6B46C1",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});