// screens/ExportNotesScreen.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
// import { Download } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function ExportNotesScreen() {
  const handleExport = () => {
    // Add your logic to export notes as needed (e.g., create a file, trigger a download)
    Alert.alert("Export", "Notes exported successfully!");
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name ="download" size={40} color="#7c3aed" />
      <Text style={styles.title}>Export Your Notes</Text>
      <Text style={styles.description}>
        Press the button below to export your notes.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleExport}>
        <Text style={styles.buttonText}>Export Notes</Text>
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
