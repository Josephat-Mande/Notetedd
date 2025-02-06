// screens/PrivacyScreen.js
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Shield } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <MaterialIcons name ="shield" size={40} color="#7c3aed" style={styles.icon} />
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.content}>
        This is a dummy privacy policy. Here you would include information about how user data is handled,
        stored, and protected.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 20,
  },
  icon: {
    alignSelf: "center",
    marginVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7c3aed",
    textAlign: "center",
    marginVertical: 10,
  },
  content: {
    fontSize: 16,
    color: "#374151",
    marginTop: 20,
    lineHeight: 22,
  },
});
