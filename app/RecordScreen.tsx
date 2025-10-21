import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import haptics from "./utils/haptics"; // Import our safe haptics utility

const { width } = Dimensions.get("window");
const GOOGLE_API_KEY = "AIzaSyBRlIWgTdPEZDjV1RFLRoEts5cpciByJFM";

const RECORDING_OPTIONS = {
  android: {
    extension: ".amr",
    outputFormat: Audio.AndroidOutputFormat.AMR_WB,
    audioEncoder: Audio.AndroidAudioEncoder.AMR_WB,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".wav",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: Platform.select({
      web: typeof navigator !== "undefined" && navigator.userAgent.includes("Safari")
          ? "audio/mp4"
          : "audio/webm",
    }),
    bitsPerSecond: 128000,
  },
};

export default function RecordScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recordingRef = useRef(new Audio.Recording());
  const [sampleRate, setSampleRate] = useState(null);
  const timerRef = useRef(null);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
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
      if (recordingRef.current) {
        stopRecording().catch(console.error);
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

  const requestPermission = async () => {
    try {
      if (Platform.OS === "web") return true;

      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
      return status === "granted";
    } catch (error) {
      console.error("Permission error:", error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      await haptics.impact('Medium');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (!(await requestPermission())) {
        Alert.alert("Permission Required", "Microphone access is required.");
        return;
      }

      const currentRecording = recordingRef.current;
      const status = await currentRecording.getStatusAsync();

      if (!status.canRecord) {
        recordingRef.current = new Audio.Recording();
        await recordingRef.current.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ...RECORDING_OPTIONS[Platform.OS],
        });
      }

      await recordingRef.current.startAsync();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Start recording failed:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const pauseRecording = async () => {
    try {
      await haptics.impact('Light');
      await recordingRef.current.pauseAsync();
      setIsPaused(true);
    } catch (error) {
      console.error("Pause recording failed:", error);
    }
  };

  const resumeRecording = async () => {
    try {
      await haptics.impact('Light');
      await recordingRef.current.startAsync();
      setIsPaused(false);
    } catch (error) {
      console.error("Resume recording failed:", error);
    }
  };

  const stopRecording = async () => {
    try {
      await haptics.notification('Success');
      setIsRecording(false);
      setIsPaused(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      if (!uri) throw new Error("No recording URI found");

      const audioFile = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (Platform.OS === "web") {
        const sampleRate = await detectSampleRate(uri);
        setSampleRate(sampleRate);
      }

      await transcribeAudio(audioFile);
    } catch (error) {
      console.error("Stop recording failed:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    }
  };

  const detectSampleRate = async (uri) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = uri;
      audio.onloadedmetadata = () => {
        resolve(audio.sampleRate || 48000);
      };
      audio.onerror = () => {
        resolve(48000);
      };
    });
  };

  const transcribeAudio = async (audioFile) => {
    try {
      setIsTranscribing(true);
      
      if (!GOOGLE_API_KEY) {
        throw new Error("Google API key is missing.");
      }

      const config = {
        encoding: Platform.select({
          android: "AMR_WB",
          ios: "LINEAR16",
          web: "WEBM_OPUS",
        }),
        sampleRateHertz: sampleRate || 16000,
        languageCode: "en-US",
        enableAutomaticPunctuation: true,
        model: "latest_long",
      };

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            audio: { content: audioFile },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Transcription failed");
      }

      const data = await response.json();
      const results = data.results
        ?.map((result) => result.alternatives[0]?.transcript)
        .filter(Boolean);

      setTranscription(results?.join("\n") || "No speech detected");
      
      if (results && results.length > 0) {
        await haptics.notification('Success');
      }
    } catch (error) {
      console.error("Transcription error:", error);
      Alert.alert("Error", `Transcription failed: ${error.message}`);
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
              setIsRecording(false);
              setIsPaused(false);
              setRecordingDuration(0);
              await recordingRef.current.stopAndUnloadAsync();
              await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            },
          },
        ]
      );
    } catch (error) {
      console.error("Cancel recording failed:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#9B5DE5", "#6B21A8"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerPattern} />
        <MaterialIcons name="mic" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={styles.headerText}>Record Lecture</Text>
        <Text style={styles.headerSubtext}>
          {isRecording ? "Recording in progress..." : "Start a new recording session"}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recording Container */}
        <Animated.View 
          style={[
            styles.recordContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Timer */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={[styles.recordingIndicator, isPaused && styles.pausedIndicator]} />
              <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.timerLabel}>
                {isPaused ? "Paused" : "Recording"}
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
          <Text style={styles.recordStatus}>
            {isRecording
              ? isPaused
                ? "Recording Paused"
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
                  colors={["#10B981", "#059669"]}
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
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
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
                  <Text style={styles.secondaryButtonText}>
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
            <View style={styles.tipsContainer}>
              <MaterialIcons name="lightbulb-outline" size={18} color="#9B5DE5" />
              <Text style={styles.tipsText}>
                Tip: Speak clearly and avoid background noise for best results
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Transcription Container */}
        {(transcription || isTranscribing) && (
          <Animated.View
            style={[
              styles.transcriptionContainer,
              { opacity: fadeAnim },
            ]}
          >
            <View style={styles.transcriptionHeader}>
              <MaterialIcons name="article" size={24} color="#9B5DE5" />
              <Text style={styles.transcriptionTitle}>Transcription</Text>
            </View>

            {isTranscribing ? (
              <View style={styles.loadingContainer}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <MaterialIcons name="sync" size={32} color="#9B5DE5" />
                </Animated.View>
                <Text style={styles.loadingText}>Processing audio...</Text>
              </View>
            ) : (
              <ScrollView style={styles.transcriptionScroll}>
                <Text style={styles.transcriptionText}>{transcription}</Text>
              </ScrollView>
            )}

            {/* Action buttons for transcription */}
            {transcription && !isTranscribing && (
              <View style={styles.transcriptionActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="content-copy" size={20} color="#6B7280" />
                  <Text style={styles.actionButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="share" size={20} color="#6B7280" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="save" size={20} color="#6B7280" />
                  <Text style={styles.actionButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {!transcription && !isTranscribing && !isRecording && (
          <View style={styles.placeholderContainer}>
            <MaterialIcons name="mic-none" size={64} color="#D1D5DB" />
            <Text style={styles.placeholderText}>No recordings yet</Text>
            <Text style={styles.placeholderSubtext}>
              Start recording to capture and transcribe your lecture
            </Text>
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
    color: "#4B5563",
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
});