import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import AsyncStorage from "@react-native-async-storage/async-storage";
import haptics from "./utils/haptics";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ==================== TTS APIs ====================
// Multiple FREE Text-to-Speech options
const GROQ_API_KEY = "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"; // Your Groq API key (for chat features)

export default function AudioNotesScreen({ navigation, route }) {
  const theme = route?.params?.theme || "light";
  const isDark = theme === "dark";

  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sound, setSound] = useState(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState("default");
  const [audioFormat, setAudioFormat] = useState("summary"); // summary, full, keypoints

  // Firebase
  const auth = getAuth();
  const db = getFirestore();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    console.log("🎵 AudioNotesScreen mounted");
    
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    fetchNotes();

    return () => {
      if (sound) {
        console.log("🧹 Cleaning up audio...");
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && !isPaused) {
      animateWaves();
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, isPaused]);

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

  const fetchNotes = async () => {
    try {
      console.log("📚 Fetching notes for audio...");
      setLoading(true);

      const currentUser = auth.currentUser;

      // Try Firestore first
      if (currentUser) {
        const recordingsRef = collection(db, "recordings");
        const q = query(
          recordingsRef,
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const recordingData = querySnapshot.docs[0].data();
          if (recordingData.organizedNotes) {
            console.log("✅ Found notes in Firestore");
            setNotes(recordingData.organizedNotes);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to AsyncStorage
      const savedNotes = await AsyncStorage.getItem('organizedNotes');
      if (savedNotes) {
        console.log("✅ Found notes in AsyncStorage");
        setNotes(JSON.parse(savedNotes));
      } else {
        console.log("⚠️ No notes found");
      }

    } catch (error) {
      console.error("❌ Fetch error:", error);
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  // ==================== AUDIO GENERATION ====================
  const generateAudioScript = () => {
    if (!notes) return "";

    let script = "";

    switch (audioFormat) {
      case "summary":
        script = `${notes.title}. ${notes.summary}. `;
        script += `Key points: ${notes.keyPoints.slice(0, 5).join(". ")}. `;
        break;

      case "keypoints":
        script = `${notes.title}. Here are the key points: `;
        notes.keyPoints.forEach((point, i) => {
          script += `Point ${i + 1}: ${point}. `;
        });
        break;

      case "full":
        script = `${notes.title}. ${notes.summary}. `;
        script += `Key points: ${notes.keyPoints.join(". ")}. `;
        notes.sections.forEach((section, i) => {
          script += `Section ${i + 1}: ${section.title}. ${section.content}. `;
        });
        if (Object.keys(notes.definitions).length > 0) {
          script += `Key definitions: `;
          Object.entries(notes.definitions).forEach(([term, def]) => {
            script += `${term}: ${def}. `;
          });
        }
        break;
    }

    return script;
  };

  const generateAudioWithWebSpeech = async () => {
    try {
      await haptics.impact("Medium");
      setGeneratingAudio(true);
      console.log("🎙️ Generating audio with Web Speech...");

      if (!('speechSynthesis' in window)) {
        throw new Error("Text-to-Speech not supported in this browser");
      }

      // Stop any existing speech
      window.speechSynthesis.cancel();

      const script = generateAudioScript();
      const utterance = new SpeechSynthesisUtterance(script);
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      console.log("🎤 Available voices:", voices.length);

      // Select voice based on preference
      if (selectedVoice === "female" && voices.length > 0) {
        const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Samantha"));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else if (selectedVoice === "male" && voices.length > 0) {
        const maleVoice = voices.find(v => v.name.includes("Male") || v.name.includes("Daniel"));
        if (maleVoice) utterance.voice = maleVoice;
      }

      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log("▶️ Audio started");
        setIsPlaying(true);
        setIsPaused(false);
        setAudioReady(true);
        setGeneratingAudio(false);
      };

      utterance.onend = () => {
        console.log("⏹️ Audio ended");
        setIsPlaying(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error("❌ Speech error:", event.error);
        setGeneratingAudio(false);
        Alert.alert("Error", "Failed to generate audio");
      };

      window.speechSynthesis.speak(utterance);
      
      // Store reference for pause/resume
      window.currentUtterance = utterance;

    } catch (error) {
      console.error("❌ Audio generation error:", error);
      setGeneratingAudio(false);
      Alert.alert("Error", error.message);
    }
  };

  const handlePlay = async () => {
    await haptics.impact("Light");

    if (Platform.OS === "web") {
      // Use Web Speech API
      if (isPlaying && isPaused) {
        // Resume
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else if (!isPlaying) {
        // Start new
        await generateAudioWithWebSpeech();
      }
    } else {
      // Mobile: Use Expo Audio (future implementation)
      Alert.alert("Coming Soon", "Audio playback is currently available on web. Mobile support coming soon!");
    }
  };

  const handlePause = async () => {
    await haptics.impact("Light");

    if (Platform.OS === "web" && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = async () => {
    await haptics.impact("Light");

    if (Platform.OS === "web") {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setAudioReady(false);
    }
  };

  const changePlaybackSpeed = async () => {
    await haptics.impact("Light");
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    // If currently playing, restart with new speed
    if (isPlaying && Platform.OS === "web") {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setTimeout(() => generateAudioWithWebSpeech(), 100);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1F2937", "#374151"] : ["#9B5DE5", "#7C3AED"]}
        style={styles.header}
      >
        <View style={styles.headerPattern} />
        <MaterialIcons name="headphones" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={styles.headerTitle}>Audio Notes</Text>
        <Text style={styles.headerSubtitle}>Listen to your notes on the go</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
            <ActivityIndicator size="large" color="#9B5DE5" />
            <Text style={[styles.loadingText, isDark && styles.textDark]}>
              Loading your notes...
            </Text>
          </Animated.View>
        ) : !notes ? (
          <Animated.View 
            style={[
              styles.emptyContainer,
              isDark && styles.emptyContainerDark,
              { opacity: fadeAnim }
            ]}
          >
            <MaterialIcons name="library-music" size={64} color="#D1D5DB" />
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
              No Notes Available
            </Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Record and organize a lecture first to generate audio notes
            </Text>
            <TouchableOpacity 
              style={styles.goToNotesButton}
              onPress={() => navigation.navigate("RecordScreen")}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.goToNotesGradient}
              >
                <MaterialIcons name="mic" size={20} color="#fff" />
                <Text style={styles.goToNotesText}>Record Lecture</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Player Card */}
            <View style={[styles.playerCard, isDark && styles.playerCardDark]}>
              {/* Lecture Info */}
              <View style={styles.lectureInfo}>
                <Text style={[styles.lectureTitle, isDark && styles.textDark]}>
                  {notes.title}
                </Text>
                <Text style={[styles.lectureSummary, isDark && styles.textSecondaryDark]}>
                  {notes.summary.substring(0, 100)}...
                </Text>
              </View>

              {/* Audio Visualizer */}
              <View style={styles.visualizerContainer}>
                {isPlaying && !isPaused ? (
                  <View style={styles.wavesContainer}>
                    {waveAnims.map((anim, index) => (
                      <Animated.View
                        key={index}
                        style={[
                          styles.wave,
                          {
                            height: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 60],
                            }),
                            opacity: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.3, 1],
                            }),
                          },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.staticWaves}>
                    {[...Array(5)].map((_, i) => (
                      <View key={i} style={styles.staticWave} />
                    ))}
                  </View>
                )}
              </View>

              {/* Play Button */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    isPlaying && styles.playButtonActive,
                  ]}
                  onPress={isPlaying && !isPaused ? handlePause : handlePlay}
                  disabled={generatingAudio}
                >
                  <LinearGradient
                    colors={
                      isPlaying && !isPaused
                        ? ["#F59E0B", "#D97706"]
                        : ["#10B981", "#059669"]
                    }
                    style={styles.playButtonGradient}
                  >
                    {generatingAudio ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons
                        name={isPlaying && !isPaused ? "pause" : "play-arrow"}
                        size={48}
                        color="#fff"
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleStop}
                  disabled={!isPlaying}
                >
                  <MaterialIcons
                    name="stop"
                    size={28}
                    color={isPlaying ? (isDark ? "#F9FAFB" : "#1F2937") : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={changePlaybackSpeed}
                >
                  <Text style={[styles.speedText, isDark && styles.textDark]}>
                    {playbackSpeed}x
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Status */}
              <Text style={[styles.statusText, isDark && styles.textSecondaryDark]}>
                {generatingAudio
                  ? "Generating audio..."
                  : isPlaying && isPaused
                  ? "Paused"
                  : isPlaying
                  ? "Playing"
                  : "Ready to play"}
              </Text>
            </View>

            {/* Audio Format Selection */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="tune" size={24} color="#9B5DE5" />
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  Audio Content
                </Text>
              </View>

              <View style={styles.formatButtons}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    audioFormat === "summary" && styles.formatButtonActive,
                    isDark && styles.formatButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setAudioFormat("summary");
                    if (isPlaying) handleStop();
                  }}
                >
                  <MaterialIcons
                    name="summarize"
                    size={20}
                    color={audioFormat === "summary" ? "#9B5DE5" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.formatButtonText,
                      audioFormat === "summary" && styles.formatButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Summary
                  </Text>
                  <Text style={styles.formatBadge}>~2 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    audioFormat === "keypoints" && styles.formatButtonActive,
                    isDark && styles.formatButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setAudioFormat("keypoints");
                    if (isPlaying) handleStop();
                  }}
                >
                  <MaterialIcons
                    name="star"
                    size={20}
                    color={audioFormat === "keypoints" ? "#9B5DE5" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.formatButtonText,
                      audioFormat === "keypoints" && styles.formatButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Key Points
                  </Text>
                  <Text style={styles.formatBadge}>~3 min</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    audioFormat === "full" && styles.formatButtonActive,
                    isDark && styles.formatButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setAudioFormat("full");
                    if (isPlaying) handleStop();
                  }}
                >
                  <MaterialIcons
                    name="article"
                    size={20}
                    color={audioFormat === "full" ? "#9B5DE5" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.formatButtonText,
                      audioFormat === "full" && styles.formatButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Full Notes
                  </Text>
                  <Text style={styles.formatBadge}>~5 min</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.formatDescription, isDark && styles.textSecondaryDark]}>
                {audioFormat === "summary"
                  ? "Quick overview with main points"
                  : audioFormat === "keypoints"
                  ? "Detailed key takeaways"
                  : "Complete lecture content with definitions"}
              </Text>
            </View>

            {/* Voice Selection */}
            <View style={[styles.section, isDark && styles.sectionDark]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="record-voice-over" size={24} color="#10B981" />
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  Voice Style
                </Text>
              </View>

              <View style={styles.voiceButtons}>
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    selectedVoice === "default" && styles.voiceButtonActive,
                    isDark && styles.voiceButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setSelectedVoice("default");
                    if (isPlaying) handleStop();
                  }}
                >
                  <Text
                    style={[
                      styles.voiceButtonText,
                      selectedVoice === "default" && styles.voiceButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Default
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    selectedVoice === "female" && styles.voiceButtonActive,
                    isDark && styles.voiceButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setSelectedVoice("female");
                    if (isPlaying) handleStop();
                  }}
                >
                  <Text
                    style={[
                      styles.voiceButtonText,
                      selectedVoice === "female" && styles.voiceButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    selectedVoice === "male" && styles.voiceButtonActive,
                    isDark && styles.voiceButtonDark,
                  ]}
                  onPress={async () => {
                    await haptics.impact("Light");
                    setSelectedVoice("male");
                    if (isPlaying) handleStop();
                  }}
                >
                  <Text
                    style={[
                      styles.voiceButtonText,
                      selectedVoice === "male" && styles.voiceButtonTextActive,
                      isDark && styles.textDark,
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Features */}
            <View style={[styles.featuresCard, isDark && styles.featuresCardDark]}>
              <Text style={[styles.featuresTitle, isDark && styles.textDark]}>
                ✨ Features
              </Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <MaterialIcons name="speed" size={20} color="#10B981" />
                  <Text style={[styles.featureText, isDark && styles.textSecondaryDark]}>
                    Adjustable playback speed (0.75x - 2.0x)
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="pause" size={20} color="#10B981" />
                  <Text style={[styles.featureText, isDark && styles.textSecondaryDark]}>
                    Pause and resume anytime
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="offline-bolt" size={20} color="#10B981" />
                  <Text style={[styles.featureText, isDark && styles.textSecondaryDark]}>
                    Works offline (Web Speech API)
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="no-accounts" size={20} color="#10B981" />
                  <Text style={[styles.featureText, isDark && styles.textSecondaryDark]}>
                    100% free - no API keys needed
                  </Text>
                </View>
              </View>
            </View>

            {/* Platform Notice */}
            {Platform.OS !== "web" && (
              <View style={[styles.noticeCard, isDark && styles.noticeCardDark]}>
                <MaterialIcons name="info-outline" size={24} color="#F59E0B" />
                <Text style={[styles.noticeText, isDark && styles.textDark]}>
                  Audio playback is currently optimized for web browsers. Mobile support coming soon!
                </Text>
              </View>
            )}
          </Animated.View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 8,
  },
  headerSubtitle: {
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
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 48,
    alignItems: "center",
  },
  emptyContainerDark: {
    backgroundColor: "#1F2937",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  goToNotesButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  goToNotesGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  goToNotesText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  playerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    alignItems: "center",
  },
  playerCardDark: {
    backgroundColor: "#1F2937",
  },
  lectureInfo: {
    width: "100%",
    marginBottom: 24,
  },
  lectureTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  lectureSummary: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  visualizerContainer: {
    height: 80,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  wavesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wave: {
    width: 6,
    backgroundColor: "#9B5DE5",
    borderRadius: 3,
  },
  staticWaves: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  staticWave: {
    width: 6,
    height: 30,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
  },
  playButtonActive: {
    elevation: 8,
  },
  playButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  speedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  statusText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionDark: {
    backgroundColor: "#1F2937",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  formatButtons: {
    gap: 12,
    marginBottom: 12,
  },
  formatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  formatButtonDark: {
    backgroundColor: "#374151",
  },
  formatButtonActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#9B5DE5",
  },
  formatButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  formatButtonTextActive: {
    color: "#7C3AED",
  },
  formatBadge: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  formatDescription: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
  voiceButtons: {
    flexDirection: "row",
    gap: 12,
  },
  voiceButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  voiceButtonDark: {
    backgroundColor: "#374151",
  },
  voiceButtonActive: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  voiceButtonTextActive: {
    color: "#059669",
  },
  featuresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  featuresCardDark: {
    backgroundColor: "#1F2937",
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  noticeCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  noticeCardDark: {
    backgroundColor: "#92400E",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  textDark: {
    color: "#F9FAFB",
  },
  textSecondaryDark: {
    color: "#D1D5DB",
  },
});