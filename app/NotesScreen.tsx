import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const OPENAI_API_KEY = "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";

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawTranscription, setRawTranscription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAndProcessNotes = async () => {
      try {
        setLoading(true);
        setError("");
        
        // 1. Get transcription from AsyncStorage
        const savedTranscription = await AsyncStorage.getItem('latestTranscription');
        
        if (!savedTranscription) {
          setNotes([]);
          return;
        }
        setRawTranscription(savedTranscription);

        // 2. Attempt to refine with OpenAI
        const refinedNotes = await refineWithOpenAI(savedTranscription);
        setNotes(refinedNotes);

      } catch (error) {
        console.error("Note processing error:", error);
        setError(error.message);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessNotes();
  }, []);

  const refineWithOpenAI = async (transcription) => {
    try {
      if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [{
            role: "user",
            content: `Organize this lecture transcription into structured notes:
            1. Remove filler words and repetitions
            2. Group related concepts
            3. Create sections with headings and sub-headings
            4. Use bullet points for key ideas
            
            Transcription: ${transcription}`
          }],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      if (!response.data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response structure from OpenAI");
      }

      return processOpenAIResponse(response.data.choices[0].message.content);
      
    } catch (error) {
      console.error("OpenAI refinement failed:", error);
      if (error.response) {
        throw new Error(`OpenAI API Error: ${error.response.status} - ${error.response.data?.error?.message}`);
      }
      throw new Error(`Refinement failed: ${error.message}`);
    }
  };

  const processOpenAIResponse = (content) => {
    try {
      const rawNotes = content.split('\n');
      return rawNotes
        .filter(line => line.trim() !== '')
        .map(line => line.replace(/^\d+\.\s*/, ''))
        .filter(line => !line.match(/^(Section|Chapter|Part) [0-9]+:/i));
        
    } catch (error) {
      console.error("Response processing error:", error);
      throw new Error("Failed to process AI response");
    }
  };

  const renderFallbackContent = () => (
    <View style={styles.fallbackContainer}>
      <MaterialIcons name="warning" size={24} color="#EF4444" />
      <Text style={styles.fallbackTitle}>Could not process notes</Text>
      <Text style={styles.fallbackText}>Showing raw transcription:</Text>
      <ScrollView style={styles.rawTranscriptionScroll}>
        <Text style={styles.rawTranscription}>{rawTranscription}</Text>
      </ScrollView>
    </View>
  );

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
        ) : error ? (
          renderFallbackContent()
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
                    {note}
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
  // ... keep all previous styles ...,
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    margin: 16,
  },
  fallbackTitle: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
    marginVertical: 8,
  },
  fallbackText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  rawTranscriptionScroll: {
    maxHeight: 300,
    width: '100%',
  },
  rawTranscription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});