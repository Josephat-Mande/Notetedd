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
  FlatList,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
import AsyncStorage from "@react-native-async-storage/async-storage";
import haptics from "./utils/haptics";
import { getFirestore, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const GROQ_API_KEY = "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";

export default function AudioNotesScreen({ navigation, route }) {
  const theme = route?.params?.theme || "light";
  const isDark = theme === "dark";

  // Screen state
  const [viewMode, setViewMode] = useState("selection"); // "selection" or "player"
  const [allNotes, setAllNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState("default");
  const [audioFormat, setAudioFormat] = useState("summary");

  // Firebase
  const auth = getAuth();
  const db = getFirestore();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    console.log("🎵 AudioNotesScreen mounted");
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    fetchAllNotes();

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
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

  // ==================== FETCH ALL NOTES ====================
  const fetchAllNotes = async () => {
    try {
      console.log("📚 Fetching all notes...");
      setLoading(true);
      const notes = [];

      const currentUser = auth.currentUser;

      // Fetch from Firestore
      if (currentUser) {
        try {
          const recordingsRef = collection(db, "recordings");
          const q = query(
            recordingsRef,
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
          );

          const querySnapshot = await getDocs(q);

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.organizedNotes) {
              notes.push({
                id: doc.id,
                ...data,
                source: "firestore",
              });
            }
          });

          console.log(`✅ Found ${notes.length} notes in Firestore`);
        } catch (firestoreError) {
          console.error("⚠️ Firestore fetch error:", firestoreError);
        }
      }

      // Fallback to AsyncStorage
      try {
        const savedNotes = await AsyncStorage.getItem('organizedNotes');
        if (savedNotes && notes.length === 0) {
          const parsedNotes = JSON.parse(savedNotes);
          notes.push({
            id: 'local-1',
            organizedNotes: parsedNotes,
            title: parsedNotes.title || "Local Note",
            createdAt: new Date(),
            source: "local",
          });
          console.log("✅ Found notes in AsyncStorage");
        }
      } catch (storageError) {
        console.error("⚠️ AsyncStorage error:", storageError);
      }

      setAllNotes(notes);
    } catch (error) {
      console.error("❌ Fetch error:", error);
      Alert.alert("Error", "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTER NOTES ====================
  const getFilteredNotes = () => {
    let filtered = allNotes;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(note => {
        const title = note.organizedNotes?.title || note.title || "";
        const summary = note.organizedNotes?.summary || "";
        const searchLower = searchQuery.toLowerCase();
        return title.toLowerCase().includes(searchLower) || 
               summary.toLowerCase().includes(searchLower);
      });
    }

    return filtered;
  };

  // ==================== NOTE SELECTION ====================
  const selectNote = async (note) => {
    await haptics.impact("Medium");
    setSelectedNote(note);
    setViewMode("player");
  };

  const backToSelection = async () => {
    await haptics.impact("Light");
    
    // Stop any playing audio
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    setSelectedNote(null);
    setViewMode("selection");
  };

  // ==================== FORMAT DATE ====================
  const formatDate = (date) => {
    if (!date) return "Unknown date";
    
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString();
  };

  // ==================== AUDIO GENERATION ====================
  const generateAudioScript = () => {
    if (!selectedNote?.organizedNotes) return "";

    const notes = selectedNote.organizedNotes;
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
        if (notes.sections && notes.sections.length > 0) {
          notes.sections.forEach((section, i) => {
            script += `Section ${i + 1}: ${section.title}. ${section.content}. `;
          });
        }
        if (notes.definitions && Object.keys(notes.definitions).length > 0) {
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

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        throw new Error("Text-to-Speech not supported in this environment");
      }

      window.speechSynthesis.cancel();

      const script = generateAudioScript();
      const utterance = new SpeechSynthesisUtterance(script);
      
      const voices = window.speechSynthesis.getVoices();

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
        setIsPlaying(true);
        setIsPaused(false);
        setGeneratingAudio(false);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utterance.onerror = (event) => {
        console.error("❌ Speech error:", event.error);
        setGeneratingAudio(false);
        Alert.alert("Error", "Failed to generate audio");
      };

      window.speechSynthesis.speak(utterance);
      window.currentUtterance = utterance;

    } catch (error) {
      console.error("❌ Audio generation error:", error);
      setGeneratingAudio(false);
      Alert.alert("Error", error.message);
    }
  };

  const handlePlay = async () => {
    await haptics.impact("Light");

    if (Platform.OS === "web" && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlaying && isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else if (!isPlaying) {
        await generateAudioWithWebSpeech();
      }
    } else {
      Alert.alert("Coming Soon", "Audio playback is currently available on web. Mobile support coming soon!");
    }
  };

  const handlePause = async () => {
    await haptics.impact("Light");
    if (Platform.OS === "web" && typeof window !== 'undefined' && window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleStop = async () => {
    await haptics.impact("Light");
    if (Platform.OS === "web" && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const changePlaybackSpeed = async () => {
    await haptics.impact("Light");
    const speeds = [1.0, 1.25, 1.5, 1.75, 2.0, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);

    if (isPlaying && Platform.OS === "web") {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setTimeout(() => generateAudioWithWebSpeech(), 100);
    }
  };

  // ==================== RENDER NOTE CARD ====================
  const renderNoteCard = ({ item }) => {
    const notes = item.organizedNotes;
    if (!notes) return null;

    const keyPointsCount = notes.keyPoints?.length || 0;
    const sectionsCount = notes.sections?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.noteCard, isDark && styles.noteCardDark]}
        onPress={() => selectNote(item)}
        activeOpacity={0.7}
      >
        <View style={styles.noteCardHeader}>
          <View style={styles.noteIconContainer}>
            <MaterialIcons name="headphones" size={24} color="#9B5DE5" />
          </View>
          <View style={styles.noteCardInfo}>
            <Text style={[styles.noteCardTitle, isDark && styles.textDark]} numberOfLines={1}>
              {notes.title || "Untitled Note"}
            </Text>
            <Text style={[styles.noteCardDate, isDark && styles.textSecondaryDark]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
        </View>

        <Text style={[styles.noteCardSummary, isDark && styles.textSecondaryDark]} numberOfLines={2}>
          {notes.summary || "No summary available"}
        </Text>

        <View style={styles.noteCardStats}>
          <View style={styles.noteCardStat}>
            <MaterialIcons name="list" size={16} color="#10B981" />
            <Text style={[styles.noteCardStatText, isDark && styles.textSecondaryDark]}>
              {keyPointsCount} key points
            </Text>
          </View>
          <View style={styles.noteCardStat}>
            <MaterialIcons name="article" size={16} color="#9B5DE5" />
            <Text style={[styles.noteCardStatText, isDark && styles.textSecondaryDark]}>
              {sectionsCount} sections
            </Text>
          </View>
        </View>

        <View style={styles.noteCardFooter}>
          <View style={[styles.sourceBadge, item.source === "firestore" ? styles.sourceBadgeCloud : styles.sourceBadgeLocal]}>
            <MaterialIcons 
              name={item.source === "firestore" ? "cloud" : "phone-android"} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.sourceBadgeText}>
              {item.source === "firestore" ? "Cloud" : "Local"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== RENDER SELECTION VIEW ====================
  const renderSelectionView = () => (
    <Animated.View style={{ opacity: fadeAnim }}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <MaterialIcons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={[styles.searchInput, isDark && styles.textDark]}
          placeholder="Search notes..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Card */}
      <View style={[styles.statsCard, isDark && styles.statsCardDark]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, isDark && styles.textDark]}>{allNotes.length}</Text>
          <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Total Notes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, isDark && styles.textDark]}>
            {allNotes.filter(n => n.source === "firestore").length}
          </Text>
          <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>In Cloud</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialIcons name="audiotrack" size={32} color="#10B981" />
          <Text style={[styles.statLabel, isDark && styles.textSecondaryDark]}>Ready to Listen</Text>
        </View>
      </View>

      {/* Notes List */}
      {getFilteredNotes().length === 0 ? (
        <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
          <MaterialIcons name="library-music" size={64} color="#D1D5DB" />
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
            {searchQuery ? "No matching notes" : "No Notes Available"}
          </Text>
          <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
            {searchQuery 
              ? "Try a different search term" 
              : "Record and organize a lecture first to generate audio notes"}
          </Text>
          {!searchQuery && (
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
          )}
        </View>
      ) : (
        <FlatList
          data={getFilteredNotes()}
          renderItem={renderNoteCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notesList}
        />
      )}
    </Animated.View>
  );

  // ==================== RENDER PLAYER VIEW ====================
  const renderPlayerView = () => {
    if (!selectedNote?.organizedNotes) return null;
    const notes = selectedNote.organizedNotes;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.backButton, isDark && styles.backButtonDark]}
          onPress={backToSelection}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? "#F9FAFB" : "#1F2937"} />
          <Text style={[styles.backButtonText, isDark && styles.textDark]}>Back to Notes</Text>
        </TouchableOpacity>

        {/* Player Card */}
        <View style={[styles.playerCard, isDark && styles.playerCardDark]}>
          <View style={styles.lectureInfo}>
            <Text style={[styles.lectureTitle, isDark && styles.textDark]}>
              {notes.title}
            </Text>
            <Text style={[styles.lectureSummary, isDark && styles.textSecondaryDark]}>
              {notes.summary.substring(0, 120)}...
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
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
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
            {[
              { key: "summary", icon: "summarize", label: "Summary", time: "~2 min" },
              { key: "keypoints", icon: "star", label: "Key Points", time: "~3 min" },
              { key: "full", icon: "article", label: "Full Notes", time: "~5 min" },
            ].map((format) => (
              <TouchableOpacity
                key={format.key}
                style={[
                  styles.formatButton,
                  audioFormat === format.key && styles.formatButtonActive,
                  isDark && styles.formatButtonDark,
                ]}
                onPress={async () => {
                  await haptics.impact("Light");
                  setAudioFormat(format.key);
                  if (isPlaying) handleStop();
                }}
              >
                <MaterialIcons
                  name={format.icon}
                  size={20}
                  color={audioFormat === format.key ? "#9B5DE5" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.formatButtonText,
                    audioFormat === format.key && styles.formatButtonTextActive,
                    isDark && styles.textDark,
                  ]}
                >
                  {format.label}
                </Text>
                <Text style={styles.formatBadge}>{format.time}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
            {["default", "female", "male"].map((voice) => (
              <TouchableOpacity
                key={voice}
                style={[
                  styles.voiceButton,
                  selectedVoice === voice && styles.voiceButtonActive,
                  isDark && styles.voiceButtonDark,
                ]}
                onPress={async () => {
                  await haptics.impact("Light");
                  setSelectedVoice(voice);
                  if (isPlaying) handleStop();
                }}
              >
                <Text
                  style={[
                    styles.voiceButtonText,
                    selectedVoice === voice && styles.voiceButtonTextActive,
                    isDark && styles.textDark,
                  ]}
                >
                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
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
    );
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
        <Text style={styles.headerTitle}>
          {viewMode === "selection" ? "Audio Notes Library" : "Now Playing"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {viewMode === "selection" 
            ? "Select notes to listen" 
            : "Listen to your notes on the go"}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9B5DE5" />
            <Text style={[styles.loadingText, isDark && styles.textDark]}>
              Loading your notes library...
            </Text>
          </View>
        ) : viewMode === "selection" ? (
          renderSelectionView()
        ) : (
          renderPlayerView()
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
    paddingTop: 20,
    paddingBottom: 20,
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
  // Selection View Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  searchContainerDark: {
    backgroundColor: "#1F2937",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statsCardDark: {
    backgroundColor: "#1F2937",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#9B5DE5",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  notesList: {
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  noteCardDark: {
    backgroundColor: "#1F2937",
  },
  noteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  noteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  noteCardInfo: {
    flex: 1,
  },
  noteCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  noteCardDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  noteCardSummary: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  noteCardStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  noteCardStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteCardStatText: {
    fontSize: 12,
    color: "#6B7280",
  },
  noteCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sourceBadgeCloud: {
    backgroundColor: "#10B981",
  },
  sourceBadgeLocal: {
    backgroundColor: "#6B7280",
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
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
  // Player View Styles
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backButtonDark: {
    backgroundColor: "#1F2937",
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  playerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
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
    height: 40,
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
    padding: 10,
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