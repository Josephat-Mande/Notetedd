import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AZURE_SUBSCRIPTION_KEY = '31233b70-ca48-4218-ac6e-875a68c3159e';
const AZURE_REGION = 'eastus';

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    AZURE_SUBSCRIPTION_KEY,
    AZURE_REGION
  );

  const startRecording = async () => {
    try {
      // Clear previous transcription
      setTranscription('');
      await AsyncStorage.removeItem('latestTranscription');

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is required to record audio.');
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
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      await transcribeAudio(uri);
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const transcribeAudio = async (audioUri) => {
    setIsLoading(true);
    try {
      const audioFile = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const pushStream = SpeechSDK.AudioInputStream.createPushStream();
      const audioBytes = Uint8Array.from(atob(audioFile), c => c.charCodeAt(0));
      pushStream.write(audioBytes.buffer);
      pushStream.close();

      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(pushStream);
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

      const result = await new Promise((resolve, reject) => {
        recognizer.recognizeOnceAsync(
          result => resolve(result),
          error => reject(error)
        );
      });

      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const cleanTranscription = result.text.replace(/\s+/g, ' ').trim();
        setTranscription(cleanTranscription);
        await AsyncStorage.setItem('latestTranscription', cleanTranscription);
      } else {
        Alert.alert('Error', 'No speech could be recognized');
      }

      recognizer.close();
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
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
          <View style={[
            styles.recordIconContainer,
            isRecording ? styles.recording : styles.notRecording
          ]}>
            <MaterialIcons
              name="mic"
              size={48}
              color={isRecording ? 'red' : 'gray'}
            />
          </View>
          <Text style={styles.recordStatus}>
            {isRecording ? 'Recording...' : 'Ready to Record'}
          </Text>
          <View style={styles.buttonContainer}>
            {!isRecording ? (
              <TouchableOpacity 
                onPress={startRecording} 
                style={styles.startButton}
                testID="start-recording-button"
              >
                <MaterialIcons name="mic" size={20} color="white" style={styles.icon} />
                <Text style={styles.buttonText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={stopRecording} 
                style={styles.stopButton}
                testID="stop-recording-button"
              >
                <MaterialIcons name="stop" size={20} color="white" style={styles.icon} />
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="hourglass-top" size={24} color="#9B5DE5" />
            <Text style={styles.loadingText}>Processing audio...</Text>
          </View>
        )}

        {transcription ? (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionTitle}>Raw Transcription Preview</Text>
            <ScrollView style={styles.transcriptionScroll}>
              <Text style={styles.transcriptionText}>{transcription}</Text>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#9B5DE5',
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 24,
    flex: 1,
    alignItems: 'center',
  },
  recordContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recording: {
    backgroundColor: '#FFE5E5',
    transform: [{ scale: 1.1 }],
  },
  notRecording: {
    backgroundColor: '#E5E5E5',
  },
  recordStatus: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  startButton: {
    backgroundColor: '#9B5DE5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    elevation: 5,
  },
  transcriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#1F2937',
  },
});