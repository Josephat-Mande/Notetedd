import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function AudioNotesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Audio Notes</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.noteContainer}>
          <Text style={styles.noteText}>Play audio notes on the go</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingBottom: 20,
  },
  header: {
    backgroundColor: "#9B5DE5",
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    padding: 24,
    flex: 1,
    alignItems: 'center',
  },
  noteContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 16,
    color: "#1F2937",
  },
});

// export default AudioNotesScreen;
