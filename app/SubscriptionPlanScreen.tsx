// screens/SubscriptionPlanScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Star } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function SubscriptionPlanScreen() {
  const handleSubscribe = () => {
    Alert.alert("Subscribe", "Subscription activated!");
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name="star" size={40} color="#7c3aed" />
      <Text style={styles.title}>Subscription Plan</Text>
      <Text style={styles.description}>
        Upgrade to Premium for advanced features.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
        <Text style={styles.buttonText}>Subscribe Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7c3aed",
    marginVertical: 10,
  },
  description: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});
