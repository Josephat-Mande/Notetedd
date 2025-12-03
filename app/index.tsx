import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    // Handle window resize on web
    if (Platform.OS === "web") {
      const handleResize = () => {
        const newDimensions = Dimensions.get("window");
        setScreenDimensions({
          width: newDimensions.width,
          height: newDimensions.height,
        });
      };

      const subscription = Dimensions.addEventListener("change", handleResize);
      return () => subscription.remove();
    }
  }, []);

  const handleGetStarted = () => {
    router.replace("/AuthScreen"); // Navigate to the AuthScreen (Sign Up)
  };

  // For web, we need to preload the image
  const imageSource =
    Platform.OS === "web"
      ? { uri: "/splash-bg.jpg" }
      : require("../public/splash-bg.jpg");

  return (
    <View style={styles.container}>
      <ImageBackground
        source={imageSource}
        style={[
          styles.backgroundImage,
          {
            width: screenDimensions.width,
            height: screenDimensions.height,
          },
        ]}
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
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  backgroundImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: Math.max(width * 0.1, 32),
    fontWeight: "bold",
    color: "#fff",
    fontFamily: "serif",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: Math.max(width * 0.04, 16),
    color: "#fff",
    marginTop: 10,
    fontFamily: "sans-serif",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 40,
  },
  button: {
    position: "absolute",
    bottom: Math.max(height * 0.1, 50),
    backgroundColor: "#6B46C1",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
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