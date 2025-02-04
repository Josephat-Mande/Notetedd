import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching notes from an API or local storage
    async function fetchNotes() {
      try {
        setLoading(true);

        // Fetch transcribed notes from your backend or an AI API
        const response = await axios.post("https://api.openai.com/v1/completions", {
          model: "gpt-4",
          prompt: `
            Refine and organize the following lecture transcription:
            1. Filter out redundant or irrelevant content.
            2. Organize the refined text into topics and subtopics.
            Transcription: "The professor is discussing the importance of quantum mechanics in modern physics. Quantum entanglement is a fundamental phenomenon... (more transcription)."
          `,
          max_tokens: 1024,
          temperature: 0.7,
        }, {
          headers: {
            "Authorization": `Bearer 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`,
            "Content-Type": "application/json",
          },
        });

        // Simulated refined notes from GPT-4 API response
        const organizedNotes = response.data.choices[0].text.split("\n").filter(line => line.trim() !== "");
        setNotes(organizedNotes);
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotes();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notes</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Fetching and organizing notes...</Text>
        ) : notes.length === 0 ? (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>No notes available. Record a lecture to see notes here.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {notes.map((note, index) => (
              <View key={index} style={styles.noteCard}>
                <MaterialIcons name="note" size={20} color="#9B5DE5" style={styles.noteIcon} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </ScrollView>
        )}
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
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    padding: 24,
    flex: 1,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  noteContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    alignItems: "center",
  },
  scrollContent: {
    width: "100%",
    alignItems: "center",
  },
  noteCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noteText: {
    fontSize: 16,
    color: "#1F2937",
  },
});
