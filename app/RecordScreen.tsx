import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { Audio } from "expo-av";
import axios from "axios";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithExponentialBackoff = async (fn, retries = 3, delayMs = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || error.response?.status !== 429) {
      throw error;
    }
    await delay(delayMs);
    return retryWithExponentialBackoff(fn, retries - 1, delayMs * 2);
  }
};

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const apiKey = Constants.expoConfig.extra.OPENAI_API_KEY;

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Microphone access is required to record audio.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  // Stop recording and transcribe audio
  const stopRecording = async () => {
    setIsRecording(false);

    try {
      if (!recording) {
        console.error("Recording is null");
        return;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("Recording URI:", uri);

      // Convert to supported format (.wav)
      const wavUri = await convertToWav(uri);

      if (wavUri) {
        await transcribeAudio(wavUri);
      } else {
        console.error("Failed to convert recording to .wav");
      }
    } catch (error) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    }
  };

  // Convert recorded audio to WAV format
  const convertToWav = async (uri) => {
    try {
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        const wavBlob = new Blob([blob], { type: "audio/wav" });
        return URL.createObjectURL(wavBlob);
      } else {
        const wavUri = uri.replace(".m4a", ".wav");
        await FileSystem.moveAsync({ from: uri, to: wavUri });
        return wavUri;
      }
    } catch (error) {
      console.error("Error converting to WAV:", error);
      return null;
    }
  };

  // Transcribe audio using OpenAI Whisper API
  const transcribeAudio = async (audioUri) => {
    setIsLoading(true);
    try {
      let file;
      if (Platform.OS === "web") {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        file = new File([blob], "recording.wav", { type: "audio/wav" });
      } else {
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
          throw new Error("File does not exist");
        }
        file = {
          uri: audioUri,
          type: "audio/wav",
          name: "recording.wav",
        };
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", "whisper-1");

      const response = await retryWithExponentialBackoff(async () => {
        return axios.post(
          "https://api.openai.com/v1/audio/transcriptions",
          formData,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`, 
              "Content-Type": "multipart/form-data",
            },
          }
        );
      });

      console.log("Transcription:", response.data.text);
      setTranscription(response.data.text);
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      Alert.alert("Error", "Failed to transcribe the audio. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Record Lecture</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.recordContainer}>
          <View
            style={[
              styles.recordIconContainer,
              isRecording ? styles.recording : styles.notRecording,
            ]}
          >
            <MaterialIcons
              name="mic"
              size={48}
              color={isRecording ? "red" : "gray"}
            />
          </View>
          <Text style={styles.recordStatus}>
            {isRecording ? "Recording..." : "Ready to Record"}
          </Text>
          <View style={styles.buttonContainer}>
            {!isRecording ? (
              <TouchableOpacity onPress={startRecording} style={styles.startButton}>
                <MaterialIcons name="mic" size={20} color="white" style={styles.icon} />
                <Text style={styles.buttonText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
                <MaterialIcons name="stop" size={20} color="white" style={styles.icon} />
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {isLoading ? (
          <Text style={styles.loadingText}>Transcribing audio...</Text>
        ) : transcription ? (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionTitle}>Transcription</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        ) : null}
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
  recordContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 24,
  },
  recordIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  recording: {
    backgroundColor: "#FFE5E5",
    transform: [{ scale: 1.1 }],
  },
  notRecording: {
    backgroundColor: "#E5E5E5",
  },
  recordStatus: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  startButton: {
    backgroundColor: "#9B5DE5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  stopButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptionContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    elevation: 5,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: "#1F2937",
  },
});