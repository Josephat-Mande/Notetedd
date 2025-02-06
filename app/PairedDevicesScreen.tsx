// screens/PairedDevicesScreen.js
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Laptop2 } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

const dummyDevices = [
  { id: "1", name: "Device A" },
  { id: "2", name: "Device B" },
  { id: "3", name: "Device C" },
];

export default function PairedDevicesScreen() {
  return (
    <View style={styles.container}>
      <MaterialIcons name ="laptop-mac" size={40} color="#7c3aed" />
      <Text style={styles.title}>Paired Devices</Text>
      <FlatList
        data={dummyDevices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceItem}>
            <Text style={styles.deviceText}>{item.name}</Text>
          </View>
        )}
      />
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
    marginBottom: 15,
    textAlign: "center",
  },
  deviceItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  deviceText: {
    fontSize: 16,
    color: "#374151",
  },
});
