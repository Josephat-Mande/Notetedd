// screens/DarkModeScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, Alert } from "react-native";
import { Moon } from "lucide-react";

export default function DarkModeScreen() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = (value) => {
    setDarkMode(value);
    Alert.alert("Theme Changed", `Dark mode is now ${value ? "on" : "off"}.`);
    // You could also trigger a global theme change here
  };

  return (
    <View style={styles.container}>
      <Moon size={40} color="#7c3aed" />
      <Text style={styles.title}>Dark Mode</Text>
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Enable Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={toggleDarkMode}
          thumbColor={darkMode ? "#7c3aed" : "#d1d5db"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7c3aed",
    textAlign: "center",
    marginVertical: 10,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 18,
    color: "#374151",
  },
});
