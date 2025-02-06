// screens/NotificationsScreen.js
import React, { useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Bell } from "lucide-react";

export default function NotificationsScreen() {
  const [enabled, setEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <Bell size={40} color="#7c3aed" />
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.switchContainer}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch
          value={enabled}
          onValueChange={(val) => setEnabled(val)}
          thumbColor={enabled ? "#7c3aed" : "#d1d5db"}
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
