// screens/UploadPDFScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Upload } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function UploadPDFScreen() {
  const [pdfName, setPdfName] = useState(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });
      if (result.type === "success") {
        setPdfName(result.name);
        // Implement your upload logic here (e.g., upload to Firebase Storage)
        Alert.alert("Upload", "PDF selected: " + result.name);
      }
    } catch (error) {
      console.error("DocumentPicker Error: ", error);
      Alert.alert("Error", "Could not open document picker.");
    }
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name ="upload" size={40} color="#7c3aed" />
      <Text style={styles.title}>Upload PDF</Text>
      <Text style={styles.description}>
        Select a PDF file to upload.
      </Text>
      <TouchableOpacity style={styles.button} onPress={pickDocument}>
        <Text style={styles.buttonText}>Choose PDF</Text>
      </TouchableOpacity>
      {pdfName && <Text style={styles.pdfName}>Selected: {pdfName}</Text>}
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
  pdfName: {
    marginTop: 15,
    fontSize: 16,
    color: "#4b5563",
  },
});
