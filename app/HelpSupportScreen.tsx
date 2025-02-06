// screens/HelpSupportScreen.js
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { HelpCircle } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

export default function HelpSupportScreen() {
  return (
    <ScrollView style={styles.container}>
      <MaterialIcons name ="help-center" size={40} color="#7c3aed" style={styles.icon} />
      <Text style={styles.title}>Help & Support</Text>
      <Text style={styles.content}>
        Q: How do I upload a PDF?{"\n"}
        A: Navigate to the Upload PDF page from the sidebar and select your PDF file.
        {"\n\n"}
        Q: How do I update my profile?{"\n"}
        A: Navigate to My Profile, click on edit, update your details, and save.
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
