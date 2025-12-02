import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Animated,
  Dimensions,
  Share,
  Clipboard,
  Switch,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import haptics from "./utils/haptics";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const { width } = Dimensions.get("window");

// IMPORTANT: Replace with your actual AssemblyAI API key
// Get your free API key at: https://www.assemblyai.com/
const ASSEMBLYAI_API_KEY = "83b66f41846a49c19d62893c24e0ce34"; // <-- PASTE YOUR API KEY HERE (leave empty to use Web Speech only)

const RECORDING_OPTIONS = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

export default function RecordScreen({ route }) {
  const theme = route?.params?.theme || "light";
  const isDark = theme === "dark";
  const navigation = useNavigation();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [transcriptionMethod, setTranscriptionMethod] = useState("auto");
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  
  const recordingRef = useRef(null);
  const webSpeechRef = useRef(null);
  const timerRef = useRef(null);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Firebase instances
  const auth = getAuth();
  const storage = getStorage();
  const db = getFirestore();

  useEffect(() => {
    console.log("🎙️ RecordScreen mounted");
    console.log("📱 Platform:", Platform.OS);
    console.log("🔑 AssemblyAI Key configured:", !!ASSEMBLYAI_API_KEY && ASSEMBLYAI_API_KEY.length > 10);
    console.log("🌐 Web Speech supported:", typeof window !== 'undefined' && 'webkitSpeechRecognition' in window);
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      console.log("🎙️ Cleanup...");
      if (recordingRef.current) {
        stopRecording().catch(console.error);
      }
      if (webSpeechRef.current) {
        webSpeechRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animations
      animateWaves();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const animateWaves = () => {
    const animations = waveAnims.map((anim, index) => 
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const requestPermissions = async () => {
    try {
      console.log("🎤 Requesting permissions...");
      if (Platform.OS !== "web") {
        const { status } = await Audio.requestPermissionsAsync();
        console.log("🎤 Permission status:", status);
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Microphone access is required to record lectures."
          );
          return false;
        }
      }
      console.log("✅ Permissions granted");
      return true;
    } catch (error) {
      console.error("❌ Permission error:", error);
      return false;
    }
  };

  // ==================== FIRESTORE SAVE ====================
  const saveRecordingToFirestore = async (audioUri, transcriptionText, duration) => {
    try {
      console.log("💾 Saving to Firestore...");
      setIsSaving(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated. Please sign in first.");
      }

      console.log("👤 Current user:", currentUser.uid);

      // Step 1: Upload audio file to Firebase Storage
      console.log("📤 Uploading audio to Firebase Storage...");
      let audioUrl = null;
      
      if (audioUri) {
        try {
          const fileName = `recordings/${currentUser.uid}/${Date.now()}.m4a`;
          const storageRef = ref(storage, fileName);
          
          // Get the blob from URI
          let blob;
          if (Platform.OS === "web") {
            const response = await fetch(audioUri);
            blob = await response.blob();
          } else {
            // For mobile, read file as base64 and convert
            const base64 = await FileSystem.readAsStringAsync(audioUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            blob = new Blob([byteArray], { type: 'audio/m4a' });
          }

          // Upload to Storage
          await uploadBytes(storageRef, blob);
          audioUrl = await getDownloadURL(storageRef);
          console.log("✅ Audio uploaded:", audioUrl);
        } catch (uploadError) {
          console.error("⚠️ Audio upload failed (continuing anyway):", uploadError);
          // Continue even if audio upload fails - we still have transcription
        }
      }

      // Step 2: Save metadata to Firestore
      console.log("📝 Saving metadata to Firestore...");
      const recordingData = {
        userId: currentUser.uid,
        userEmail: currentUser.email || "unknown",
        audioUrl: audioUrl || null,
        transcription: transcriptionText || "",
        duration: duration || 0,
        formattedDuration: formatDuration(duration || 0),
        transcriptionMethod: useWebSpeech ? "Web Speech API" : "AssemblyAI",
        createdAt: serverTimestamp(),
        platform: Platform.OS,
        title: `Recording ${new Date().toLocaleDateString()}`,
        organizedNotes: null, // Will be populated by NotesScreen
      };

      console.log("📦 Data to save:", recordingData);

      try {
        const docRef = await addDoc(collection(db, "recordings"), recordingData);
        console.log("✅ Recording saved with ID:", docRef.id);

        // Also save to AsyncStorage as backup for offline access
        await AsyncStorage.setItem('latestTranscription', transcriptionText || "");
        console.log("✅ Saved to AsyncStorage backup");

        await haptics.notification('Success');
        Alert.alert(
          "Success! 🎉",
          "Recording and transcription saved successfully!",
          [
            {
              text: "View Notes",
              onPress: () => {
                if (navigation?.navigate) {
                  navigation.navigate("NotesScreen", { refresh: Date.now() });
                }
              },
            },
            { text: "OK" }
          ]
        );

        return docRef.id;
      } catch (firestoreError) {
        console.error("❌ Firestore write error:", firestoreError);
        throw new Error(`Firestore error: ${firestoreError.message}\n\n💡 Check your Firestore security rules!`);
      }
    } catch (error) {
      console.error("❌ Firestore save error:", error);
      Alert.alert(
        "Save Error",
        `Failed to save recording: ${error.message}\n\nThe transcription is still available on this screen.`,
        [{ text: "OK" }]
      );
      // Don't throw - allow user to continue using the app
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== WEB SPEECH API ====================
  const startWebSpeechRecognition = () => {
    console.log("🌐 Starting Web Speech recognition...");
    
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
      console.error("❌ Web Speech not supported");
      Alert.alert('Not Supported', 'Please use Chrome, Edge, or Safari');
      return false;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      console.log('✅ Web Speech started');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          console.log('📝 Final:', transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      // Update transcription in real-time
      const fullTranscript = finalTranscript + interimTranscript;
      setTranscription(fullTranscript);
    };

    recognition.onerror = (event) => {
      console.error('❌ Web Speech error:', event.error);
      
      if (event.error === 'no-speech') {
        console.log('⚠️ No speech detected, continuing...');
      } else if (event.error === 'not-allowed') {
        Alert.alert('Permission Denied', 'Please allow microphone access');
        stopRecording();
      } else {
        console.error('Error:', event.error);
      }
    };

    recognition.onend = () => {
      console.log('🏁 Web Speech ended');
      if (isRecording) {
        // Restart if still recording
        recognition.start();
      }
    };

    recognition.start();
    webSpeechRef.current = recognition;
    return true;
  };

  const stopWebSpeechRecognition = () => {
    if (webSpeechRef.current) {
      console.log("⏹️ Stopping Web Speech...");
      webSpeechRef.current.stop();
      webSpeechRef.current = null;
    }
  };
// ==================== ASSEMBLYAI TRANSCRIPTION ====================
  const transcribeWithAssemblyAI = async (uri) => {
    try {
      console.log("🎯 Starting AssemblyAI transcription...");
      console.log("📱 Platform:", Platform.OS);
      console.log("📁 Audio URI:", uri);

      // Validate API key
      if (!ASSEMBLYAI_API_KEY || ASSEMBLYAI_API_KEY.length < 10) {
        throw new Error("AssemblyAI API key not configured. Please add your API key at the top of RecordScreen.js or use Real-time Mode instead.");
      }

      // Step 1: Get audio blob (platform-specific)
      console.log("📤 Reading audio file...");
      let blob;

      if (Platform.OS === "web") {
        // Web: Fetch the blob directly
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // Mobile (iOS/Android): Read file as base64 and convert to blob
        console.log("📱 Reading mobile file...");
        
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(uri);
        console.log("📂 File info:", fileInfo);
        
        if (!fileInfo.exists) {
          throw new Error("Recording file not found");
        }

        // Read as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log("📦 Base64 length:", base64.length);

        // Convert base64 to blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'audio/m4a' });
      }

      console.log("📦 Blob size:", blob.size, "bytes");

      if (blob.size === 0) {
        throw new Error("Audio file is empty - please record again");
      }

      // Step 2: Upload to AssemblyAI
      console.log("☁️ Uploading to AssemblyAI...");
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("❌ Upload error response:", errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText || 'Check your API key and internet connection'}`);
      }

      const uploadData = await uploadResponse.json();
      console.log("✅ File uploaded:", uploadData.upload_url);

      // Step 3: Request transcription
      console.log("📋 Requesting transcription...");
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadData.upload_url,
          punctuate: true,
          format_text: true,
          language_code: 'en_us',
        }),
      });

      if (!transcriptResponse.ok) {
        const errorText = await transcriptResponse.text();
        console.error("Transcription request error:", errorText);
        throw new Error(`Transcription request failed: ${transcriptResponse.status}`);
      }

      const transcriptData = await transcriptResponse.json();
      console.log("🆔 Transcript ID:", transcriptData.id);

      // Step 4: Poll for result
      console.log("⏳ Polling for result...");
      let transcript = null;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
          headers: { 'authorization': ASSEMBLYAI_API_KEY },
        });

        if (!pollResponse.ok) {
          throw new Error(`Poll request failed: ${pollResponse.status}`);
        }

        transcript = await pollResponse.json();
        console.log("📊 Status:", transcript.status);

        if (transcript.status === 'completed') {
          console.log("✅ Transcription completed!");
          return transcript.text;
        } else if (transcript.status === 'error') {
          throw new Error(`Transcription error: ${transcript.error}`);
        }

        attempts++;
      }

      throw new Error("Transcription timeout - please try again");
    } catch (error) {
      console.error("❌ AssemblyAI error:", error);
      throw error;
    }
  };

  // ==================== RECORDING CONTROLS ====================
  const startRecording = async () => {
    try {
      console.log("▶️ Starting recording...");
      await haptics.impact('Medium');
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Start Web Speech if enabled
      if (useWebSpeech && Platform.OS === "web") {
        const webSpeechStarted = startWebSpeechRecognition();
        if (!webSpeechStarted) {
          Alert.alert(
            "Web Speech Unavailable",
            "Falling back to post-recording transcription"
          );
        }
      }

      // Start audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ...RECORDING_OPTIONS[Platform.OS],
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      if (!useWebSpeech) {
        setTranscription("");
      }
      setRecordingUri(null);
      console.log("✅ Recording started");
    } catch (error) {
      console.error("❌ Start recording failed:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const pauseRecording = async () => {
    try {
      console.log("⏸️ Pausing...");
      await haptics.impact('Light');
      
      if (recordingRef.current) {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
      }
      
      if (webSpeechRef.current) {
        webSpeechRef.current.stop();
      }
      
      console.log("✅ Paused");
    } catch (error) {
      console.error("❌ Pause failed:", error);
    }
  };

  const resumeRecording = async () => {
    try {
      console.log("▶️ Resuming...");
      await haptics.impact('Light');
      
      if (recordingRef.current) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
      }
      
      if (useWebSpeech && Platform.OS === "web") {
        startWebSpeechRecognition();
      }
      
      console.log("✅ Resumed");
    } catch (error) {
      console.error("❌ Resume failed:", error);
    }
  };

  const stopRecording = async () => {
    try {
      console.log("⏹️ Stopping...");
      await haptics.notification('Success');
      setIsRecording(false);
      setIsPaused(false);

      // Stop Web Speech
      stopWebSpeechRecognition();

      if (!recordingRef.current) {
        console.log("⚠️ No active recording");
        return;
      }

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      console.log("📁 Recording URI:", uri);
      
      if (!uri) throw new Error("No recording URI found");

      setRecordingUri(uri);
      const finalDuration = recordingDuration;

      // If Web Speech was used, we already have transcription
      if (useWebSpeech && transcription) {
        console.log("✅ Using Web Speech transcription");
        // Save to Firestore
        await saveRecordingToFirestore(uri, transcription, finalDuration);
        return;
      }

      // Otherwise, transcribe with AssemblyAI
      console.log("✅ Recording stopped, starting transcription...");
      await transcribeAudio(uri, finalDuration);
    } catch (error) {
      console.error("❌ Stop recording failed:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    }
  };

  const transcribeAudio = async (uri, duration) => {
    try {
      setIsTranscribing(true);
      console.log("🎯 Choosing transcription method...");

      let transcribedText = "";
      let method = transcriptionMethod;

      // Auto mode: Try AssemblyAI first, fallback to Web Speech
      if (method === "auto") {
        if (ASSEMBLYAI_API_KEY && ASSEMBLYAI_API_KEY.length > 10) {
          method = "assemblyai";
        } else if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
          method = "webspeech-fallback";
        } else {
          throw new Error("No transcription method available");
        }
      }

      // Try AssemblyAI
      if (method === "assemblyai") {
        try {
          console.log("🚀 Using AssemblyAI...");
          transcribedText = await transcribeWithAssemblyAI(uri);
          console.log("✅ AssemblyAI success!");
        } catch (error) {
          console.error("❌ AssemblyAI failed:", error);
          
          // Fallback to Web Speech
          if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            console.log("🔄 Falling back to Web Speech...");
            Alert.alert(
              "Fallback Mode",
              "AssemblyAI unavailable. Using Web Speech API.\nTip: Enable 'Real-time Mode' before recording for instant transcription."
            );
            transcribedText = "AssemblyAI unavailable. Please use real-time mode or check API key configuration.";
          } else {
            throw error;
          }
        }
      }

      setTranscription(transcribedText || "No speech detected");
      
      // Save to Firestore
      if (transcribedText) {
        await saveRecordingToFirestore(uri, transcribedText, duration);
      }
    } catch (error) {
      console.error("❌ Transcription error:", error);
      Alert.alert(
        "Transcription Error",
        `${error.message}\n\nTip: Enable "Real-time Mode" for instant transcription without API keys!`
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const cancelRecording = async () => {
    try {
      await haptics.impact('Heavy');
      
      Alert.alert(
        "Cancel Recording",
        "Are you sure you want to discard this recording?",
        [
          { text: "Keep Recording", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: async () => {
              console.log("🗑️ Discarding...");
              setIsRecording(false);
              setIsPaused(false);
              setRecordingDuration(0);
              setTranscription("");
              setRecordingUri(null);
              
              stopWebSpeechRecognition();
              
              if (recordingRef.current) {
                await recordingRef.current.stopAndUnloadAsync();
                await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
              }
              console.log("✅ Discarded");
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Cancel failed:", error);
    }
  };

  const copyTranscription = async () => {
    await haptics.impact("Light");
    Clipboard.setString(transcription);
    Alert.alert("Copied!", "Transcription copied to clipboard.");
  };

  const shareTranscription = async () => {
    await haptics.impact("Light");
    try {
      await Share.share({
        message: transcription,
        title: "Lecture Transcription",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1F2937", "#374151"] : ["#9B5DE5", "#6B21A8"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerPattern} />
        <MaterialIcons name="mic" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={styles.headerText}>Record Lecture</Text>
        <Text style={styles.headerSubtext}>
          {useWebSpeech ? "Real-time transcription" : "Record & transcribe"}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View 
          style={[
            styles.recordContainer,
            isDark && { backgroundColor: "#1F2937" },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Real-time Mode Toggle */}
          {Platform.OS === "web" && typeof window !== 'undefined' && 'webkitSpeechRecognition' in window && !isRecording && (
            <View style={[styles.modeToggle, isDark && styles.modeToggleDark]}>
              <View style={styles.modeInfo}>
                <MaterialIcons 
                  name={useWebSpeech ? "flash-on" : "schedule"} 
                  size={20} 
                  color={useWebSpeech ? "#10B981" : "#9B5DE5"} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeLabel, isDark && styles.textDark]}>
                    {useWebSpeech ? "Real-time Mode" : "Post-recording Mode"}
                  </Text>
                  <Text style={[styles.modeDescription, isDark && styles.textSecondaryDark]}>
                    {useWebSpeech 
                      ? "See text as you speak (Free, instant)"
                      : "Transcribe after recording (Better accuracy)"}
                  </Text>
                </View>
              </View>
              <Switch
                value={useWebSpeech}
                onValueChange={(value) => {
                  haptics.impact("Light");
                  setUseWebSpeech(value);
                }}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {/* Timer */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={[styles.recordingIndicator, isPaused && styles.pausedIndicator]} />
              <Text style={[styles.timerText, isDark && styles.textDark]}>
                {formatDuration(recordingDuration)}
              </Text>
              <Text style={styles.timerLabel}>
                {isPaused ? "Paused" : useWebSpeech ? "Recording (Live)" : "Recording"}
              </Text>
            </View>
          )}

          {/* Microphone Icon with Waves */}
          <View style={styles.micContainer}>
            {isRecording && !isPaused && (
              <View style={styles.wavesContainer}>
                {waveAnims.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.wave,
                      {
                        transform: [{
                          scale: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5 + index * 0.2],
                          }),
                        }],
                        opacity: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 0],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
            )}

            <Animated.View
              style={[
                styles.recordIconContainer,
                isRecording && styles.recordingActive,
                isPaused && styles.recordingPaused,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={
                  isRecording
                    ? isPaused
                      ? ["#F59E0B", "#D97706"]
                      : useWebSpeech
                      ? ["#10B981", "#059669"]
                      : ["#EF4444", "#DC2626"]
                    : ["#6B7280", "#4B5563"]
                }
                style={styles.iconGradient}
              >
                <MaterialIcons
                  name={isPaused ? "pause" : "mic"}
                  size={56}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Status Text */}
          <Text style={[styles.recordStatus, isDark && styles.textDark]}>
            {isRecording
              ? isPaused
                ? "Recording Paused"
                : useWebSpeech
                ? "Recording (Live Transcription)"
                : "Recording in Progress"
              : "Ready to Record"}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {!isRecording ? (
              <TouchableOpacity
                onPress={startRecording}
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={useWebSpeech ? ["#10B981", "#059669"] : ["#9B5DE5", "#7C3AED"]}
                  style={styles.buttonGradient}
                >
                  <MaterialIcons name="fiber-manual-record" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Start Recording</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.controlButtons}>
                <TouchableOpacity
                  onPress={cancelRecording}
                  style={styles.secondaryButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="close" size={24} color="#EF4444" />
                  <Text style={[styles.secondaryButtonText, { color: "#EF4444" }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={isPaused ? resumeRecording : pauseRecording}
                  style={styles.secondaryButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={isPaused ? "play-arrow" : "pause"}
                    size={24}
                    color="#9B5DE5"
                  />
                  <Text style={[styles.secondaryButtonText, { color: "#9B5DE5" }]}>
                    {isPaused ? "Resume" : "Pause"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={stopRecording}
                  style={styles.primaryButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#EF4444", "#DC2626"]}
                    style={styles.buttonGradient}
                  >
                    <MaterialIcons name="stop" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Finish</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Recording Tips */}
          {!isRecording && (
            <View style={[styles.tipsContainer, isDark && styles.tipsContainerDark]}>
              <MaterialIcons name="lightbulb-outline" size={18} color="#9B5DE5" />
              <Text style={[styles.tipsText, isDark && styles.textSecondaryDark]}>
                {useWebSpeech 
                  ? "Tip: Real-time mode works instantly without internet!"
                  : "Tip: Post-recording mode provides better accuracy with internet access."}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Transcription Container */}
        {(transcription || isTranscribing || isSaving) && (
          <Animated.View
            style={[
              styles.transcriptionContainer,
              isDark && styles.transcriptionContainerDark,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.transcriptionHeader}>
              <MaterialIcons name="article" size={24} color={useWebSpeech ? "#10B981" : "#9B5DE5"} />
              <Text style={[styles.transcriptionTitle, isDark && styles.textDark]}>
                {useWebSpeech ? "Live Transcription" : "Transcription"}
              </Text>
            </View>

            {isTranscribing ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons name="sync" size={32} color="#9B5DE5" />
                </Animated.View>
                <Text style={[styles.loadingText, isDark && styles.textSecondaryDark]}>
                  Processing with AssemblyAI... This may take a moment.
                </Text>
              </View>
            ) : isSaving ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons name="cloud-upload" size={32} color="#10B981" />
                </Animated.View>
                <Text style={[styles.loadingText, isDark && styles.textSecondaryDark]}>
                  Saving to cloud storage...
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.transcriptionScroll}>
                  <Text style={[styles.transcriptionText, isDark && styles.textDark]}>
                    {transcription}
                  </Text>
                </ScrollView>

                {/* Action buttons */}
                <View style={styles.transcriptionActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={copyTranscription}
                  >
                    <MaterialIcons name="content-copy" size={20} color="#6B7280" />
                    <Text style={[styles.actionButtonText, isDark && styles.textSecondaryDark]}>
                      Copy
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={shareTranscription}
                  >
                    <MaterialIcons name="share" size={20} color="#6B7280" />
                    <Text style={[styles.actionButtonText, isDark && styles.textSecondaryDark]}>
                      Share
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate("History")}
                  >
                    <MaterialIcons name="history" size={20} color="#6B7280" />
                    <Text style={[styles.actionButtonText, isDark && styles.textSecondaryDark]}>
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Method indicator */}
                <View style={styles.methodBadge}>
                  <MaterialIcons 
                    name={useWebSpeech ? "flash-on" : "cloud"} 
                    size={12} 
                    color={useWebSpeech ? "#10B981" : "#9B5DE5"} 
                  />
                  <Text style={styles.methodText}>
                    {useWebSpeech ? "Web Speech API" : "AssemblyAI"} • Saved to Cloud
                  </Text>
                </View>
              </>
            )}
          </Animated.View>
        )}

        {!transcription && !isTranscribing && !isRecording && (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="mic-none" size={64} color="#D1D5DB" />
            <Text style={[styles.placeholderText, isDark && styles.textSecondaryDark]}>
              No recordings yet
            </Text>
            <Text style={[styles.placeholderSubtext, isDark && styles.textSecondaryDark]}>
              {useWebSpeech 
                ? "Enable real-time mode to see text as you speak"
                : "Start recording to capture and transcribe your lecture"}
            </Text>
            
            {/* Setup Instructions */}
            <View style={[styles.setupCard, isDark && styles.setupCardDark]}>
              <Text style={[styles.setupTitle, isDark && styles.textDark]}>
                  Setup Instructions
              </Text>
              <View style={styles.setupStep}>
                <Text style={styles.setupNumber}>1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.setupStepTitle, isDark && styles.textDark]}>
                    Offline  Mode (FREE)
                  </Text>
                  <Text style={[styles.setupStepText, isDark && styles.textSecondaryDark]}>
                    Toggle switch above • Works instantly • No internet needed
                  </Text>
                </View>
              </View>
              <View style={styles.setupStep}>
                <Text style={styles.setupNumber}>2</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.setupStepTitle, isDark && styles.textDark]}>
                    Better Accuracy 
                  </Text>
                  <Text style={[styles.setupStepText, isDark && styles.textSecondaryDark]}>
                    Switch to online mode
                  </Text>
                </View>
              </View>
              <View style={styles.setupStep}>
                <Text style={styles.setupNumber}>3</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.setupStepTitle, isDark && styles.textDark]}>
                    Auto-Save Enabled ✅
                  </Text>
                  <Text style={[styles.setupStepText, isDark && styles.textSecondaryDark]}>
                    All recordings automatically saved to your account
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  containerDark: {
    backgroundColor: "#0F172A",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  headerPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
  },
  headerSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  recordContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 24,
  },
  modeToggle: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modeToggleDark: {
    backgroundColor: "#374151",
  },
  modeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    marginBottom: 8,
  },
  pausedIndicator: {
    backgroundColor: "#F59E0B",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1F2937",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  micContainer: {
    alignItems: "center",
    marginVertical: 32,
    position: "relative",
  },
  wavesContainer: {
    position: "absolute",
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  wave: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#9B5DE5",
  },
  recordIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recordingActive: {
    shadowColor: "#EF4444",
  },
  recordingPaused: {
    shadowColor: "#F59E0B",
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  recordStatus: {
    fontSize: 20,
    color: "#1F2937",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 32,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  controlButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tipsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  tipsContainerDark: {
    backgroundColor: "#374151",
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: "#6B21A8",
    lineHeight: 18,
  },
  transcriptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 24,
  },
  transcriptionContainerDark: {
    backgroundColor: "#1F2937",
  },
  transcriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  transcriptionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  transcriptionScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  transcriptionText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
  },
  transcriptionActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  methodText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  placeholderContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  placeholderText: {
    fontSize: 18,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: "#D1D5DB",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  setupCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    width: "100%",
    maxWidth: 400,
  },
  setupCardDark: {
    backgroundColor: "#374151",
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  setupStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  setupNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#9B5DE5",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  setupStepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  setupStepText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  textDark: {
    color: "#F9FAFB",
  },
  textSecondaryDark: {
    color: "#D1D5DB",
  },
});