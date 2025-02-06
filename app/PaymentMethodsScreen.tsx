// screens/PaymentMethodsScreen.js
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { CreditCard } from "lucide-react";
import { MaterialIcons } from "@expo/vector-icons";

const dummyPayments = [
  { id: "1", method: "Visa **** 1234" },
  { id: "2", method: "MasterCard **** 5678" },
];

export default function PaymentMethodsScreen() {
  return (
    <View style={styles.container}>
      <MaterialIcons name="credit-card" size={40} color="#7c3aed" />
      <Text style={styles.title}>Payment Methods</Text>
      <FlatList
        data={dummyPayments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.paymentItem}>
            <Text style={styles.paymentText}>{item.method}</Text>
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
  paymentItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  paymentText: {
    fontSize: 16,
    color: "#374151",
  },
});
