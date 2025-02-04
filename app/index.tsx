import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to the authentication screen after a delay
    const timer = setTimeout(() => {
      router.replace("/AuthScreen");
    }, 2000); // Delay for 2 seconds

    return () => clearTimeout(timer); // Clean up the timer on component unmount
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>That's noted!</Text>
      <ActivityIndicator size="large" color="#6B46C1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
});
