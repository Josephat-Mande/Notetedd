import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndProcessTranscription() {
      try {
        setLoading(true);
        
        // 1. Get the latest transcription from storage
        const savedTranscription = await AsyncStorage.getItem('latestTranscription');
        
        if (!savedTranscription) {
          setNotes([]);
          return;
        }

        // 2. Send to OpenAI for organization and refinement
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4",
            messages: [{
              role: "user",
              content: `Organize this lecture transcription into structured notes:
              1. Remove filler words and repetitions
              2. Group related concepts
              3. Create sections with headings
              4. Use bullet points for key ideas
              
              Transcription: ${savedTranscription}`
            }],
            temperature: 0.7,
            max_tokens: 1000
          },
          {
            headers: {
              "Authorization": `Bearer YOUR_OPENAI_API_KEY`,
              "Content-Type": "application/json",
            },
          }
        );

        // 3. Process the AI response
        const rawNotes = response.data.choices[0].message.content.split('\n');
        const filteredNotes = rawNotes.filter(line => 
          line.trim() !== '' && !line.match(/^(Section|Chapter|Part) [0-9]+:/i)
        );

        setNotes(filteredNotes);
      } catch (error) {
        console.error("Error processing notes:", error);
        setNotes([`Error: Could not process notes. ${error.message}`]);
      } finally {
        setLoading(false);
      }
    }

    fetchAndProcessTranscription();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Organized Notes</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="hourglass-top" size={24} color="#9B5DE5" />
            <Text style={styles.loadingText}>Processing lecture content...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="library-books" size={48} color="#9B5DE5" />
            <Text style={styles.emptyText}>No lectures processed yet</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {notes.map((note, index) => {
              const isHeading = note.match(/[A-Z][a-z]+:/) || note.endsWith(':');
              return (
                <View 
                  key={index} 
                  style={[
                    styles.noteItem,
                    isHeading && styles.sectionHeader
                  ]}
                >
                  {isHeading ? (
                    <MaterialIcons name="label" size={20} color="#9B5DE5" />
                  ) : (
                    <MaterialIcons name="chevron-right" size={20} color="#6B7280" />
                  )}
                  <Text style={[
                    styles.noteText,
                    isHeading && styles.headerText
                  ]}>
                    {note.replace(/^\d+\.\s*/, '')}
                  </Text>
                </View>
              );
            })}
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
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#6B7280",
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    backgroundColor: "#F3E8FF",
    borderLeftWidth: 4,
    borderLeftColor: "#9B5DE5",
  },
  noteText: {
    fontSize: 16,
    color: "#1F2937",
    flexShrink: 1,
  },
  headerText: {
    fontWeight: "600",
    color: "#9B5DE5",
  },
});