// screens/PreferencesScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, Alert } from "react-native";
import { Settings } from "lucide-react";

export default function PrefferencesScreen() {
  const [prefA, setPrefA] = useState(false);
  const [prefB, setPrefB] = useState(true);

  const handleSave = () => {
    Alert.alert("Preferences", "Preferences updated successfully!");
    // Implement any logic to save these preferences (e.g., update Firestore or AsyncStorage)
  };

  return (
    <View style={styles.container}>
      <Settings size={40} color="#7c3aed" />
      <Text style={styles.title}>Preferences</Text>
      <View style={styles.preferenceItem}>
        <Text style={styles.label}>Preference A</Text>
        <Switch value={prefA} onValueChange={setPrefA} />
      </View>
      <View style={styles.preferenceItem}>
        <Text style={styles.label}>Preference B</Text>
        <Switch value={prefB} onValueChange={setPrefB} />
      </View>
      <Text style={styles.saveText} onPress={handleSave}>
        Save Preferences
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7c3aed",
    textAlign: "center",
    marginVertical: 10,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 18,
    color: "#374151",
  },
  saveText: {
    marginTop: 30,
    fontSize: 18,
    color: "#7c3aed",
    textAlign: "center",
  },
});
