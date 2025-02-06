// screens/PrintNotesScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as Print from "expo-print";
import { Printer } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function PrintNotesScreen() {
  const handlePrint = async () => {
    try {
      await Print.printAsync({
        html: `<html><body><h1>Your Notes</h1><p>This is a dummy notes print preview.</p></body></html>`,
      });
    } catch (error) {
      console.error("Print error: ", error);
      Alert.alert("Error", "Could not print notes.");
    }
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name ="print" size={40} color="#7c3aed" />
      <Text style={styles.title}>Print Notes</Text>
      <Text style={styles.description}>
        Press the button below to print your notes.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handlePrint}>
        <Text style={styles.buttonText}>Print Notes</Text>
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
