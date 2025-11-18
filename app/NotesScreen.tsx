import React, { useEffect, useState, useRef } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  Animated,
  Share,
  Clipboard,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import haptics from "./utils/haptics";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const GEMINI_API_KEY = "AIzaSyDQraKwy8C4zbRJ9ys2Xl9DUbzhvmv9Wco"; 
const GROQ_API_KEY = "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"; 

// API Endpoints
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export default function NotesScreen({ navigation, route }) {
  const theme = route?.params?.theme || "light";
  const isDark = theme === "dark";

  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rawTranscription, setRawTranscription] = useState("");
  const [currentRecordingId, setCurrentRecordingId] = useState(null);
  const [error, setError] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [dataSource, setDataSource] = useState("");
  const [aiProvider, setAiProvider] = useState("");

  // Firebase instances
  const auth = getAuth();
  const db = getFirestore();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    console.log("📚 NotesScreen mounted");
    console.log("🔑 Gemini API configured:", !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10);
    console.log("🔑 Groq API configured:", !!GROQ_API_KEY && GROQ_API_KEY.length > 10);
    
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

    fetchLatestNotes();

    // Listen for new recordings
    if (route?.params?.refresh) {
      fetchLatestNotes();
    }
  }, [route?.params?.refresh]);

  const fetchLatestNotes = async () => {
    try {
      console.log("🔍 Fetching latest notes...");
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;

      // Try Firestore first if user is authenticated
      if (currentUser) {
        console.log("👤 User authenticated, checking Firestore...");
        const firestoreNotes = await fetchFromFirestore(currentUser.uid);
        
        if (firestoreNotes) {
          console.log("✅ Found notes in Firestore");
          setDataSource("firestore");
          return;
        }
      }

      // Fallback to AsyncStorage
      console.log("📱 Checking AsyncStorage...");
      const asyncStorageNotes = await fetchFromAsyncStorage();
      
      if (asyncStorageNotes) {
        console.log("✅ Found notes in AsyncStorage");
        setDataSource("asyncstorage");
        return;
      }

      // No notes found
      console.log("⚠️ No notes found");
      setNotes(null);
      setRawTranscription("");

    } catch (error) {
      console.error("❌ Fetch error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFromFirestore = async (userId) => {
    try {
      console.log("☁️ Querying Firestore for user:", userId);

      const recordingsRef = collection(db, "recordings");
      const q = query(
        recordingsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log("⚠️ No recordings in Firestore");
        return null;
      }

      const recordingDoc = querySnapshot.docs[0];
      const recordingData = recordingDoc.data();
      
      console.log("📄 Recording found:", recordingDoc.id);
      console.log("📝 Transcription length:", recordingData.transcription?.length || 0);

      setCurrentRecordingId(recordingDoc.id);
      setRawTranscription(recordingData.transcription || "");

      // Check if already organized
      if (recordingData.organizedNotes) {
        console.log("✅ Already organized notes found");
        setNotes(recordingData.organizedNotes);
        setAiProvider(recordingData.organizedNotes.aiProvider || "cached");
        return true;
      }

      // Need to organize with AI
      console.log("🤖 Organizing notes with AI...");
      await refineWithAI(recordingData.transcription, recordingDoc.id);
      return true;

    } catch (error) {
      console.error("❌ Firestore fetch error:", error);
      return null;
    }
  };

  const fetchFromAsyncStorage = async () => {
    try {
      console.log("💾 Checking AsyncStorage...");

      const savedOrganizedNotes = await AsyncStorage.getItem('organizedNotes');
      if (savedOrganizedNotes) {
        console.log("✅ Found organized notes in AsyncStorage");
        const parsedNotes = JSON.parse(savedOrganizedNotes);
        setNotes(parsedNotes);
        setAiProvider(parsedNotes.aiProvider || "cached");
        
        const savedTranscription = await AsyncStorage.getItem('latestTranscription');
        if (savedTranscription) {
          setRawTranscription(savedTranscription);
        }
        return true;
      }

      const savedTranscription = await AsyncStorage.getItem('latestTranscription');
      if (!savedTranscription) {
        console.log("⚠️ No transcription in AsyncStorage");
        return null;
      }

      console.log("📝 Found transcription, organizing with AI...");
      setRawTranscription(savedTranscription);
      await refineWithAI(savedTranscription, null);
      return true;

    } catch (error) {
      console.error("❌ AsyncStorage fetch error:", error);
      return null;
    }
  };

  // ==================== AI REFINEMENT ====================
  const refineWithAI = async (transcription, recordingId = null) => {
    try {
      console.log("🤖 Processing with AI...");
      
      if (!transcription || transcription.trim().length < 10) {
        throw new Error("Transcription too short to organize");
      }

      let organizedNotes = null;
      let usedProvider = "";

      // Try Groq first (fastest, no CORS issues, FREE)
      if (GROQ_API_KEY && GROQ_API_KEY.length > 10) {
        console.log("⚡ Trying Groq (Lightning Fast)...");
        try {
          organizedNotes = await refineWithGroq(transcription);
          usedProvider = "Groq";
          console.log("✅ Groq success!");
        } catch (groqError) {
          console.error("❌ Groq failed:", groqError.message);
        }
      }

      // Fallback to Gemini
      if (!organizedNotes && GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
        console.log("🔄 Trying Google Gemini...");
        try {
          organizedNotes = await refineWithGemini(transcription);
          usedProvider = "Gemini";
          console.log("✅ Gemini success!");
        } catch (geminiError) {
          console.error("❌ Gemini failed:", geminiError.message);
        }
      }

      // Final fallback to basic structure
      if (!organizedNotes) {
        console.log("⚠️ All AI providers failed, using fallback");
        organizedNotes = createFallbackNotes(transcription);
        usedProvider = "Fallback";
      }

      organizedNotes.aiProvider = usedProvider;
      setNotes(organizedNotes);
      setAiProvider(usedProvider);
      
      await saveOrganizedNotes(organizedNotes, recordingId);
      await haptics.notification("Success");

    } catch (error) {
      console.error("❌ AI refinement error:", error);
      setError(error.message);
      
      const fallbackNotes = createFallbackNotes(transcription);
      fallbackNotes.aiProvider = "Fallback";
      setNotes(fallbackNotes);
      setAiProvider("Fallback");
      await saveOrganizedNotes(fallbackNotes, recordingId);
    }
  };

  // ==================== GROQ (FASTEST & FREE) ====================
  const refineWithGroq = async (transcription) => {
    console.log("⚡ Starting Groq processing...");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", 
        messages: [{
          role: "system",
          content: "You are an expert note-taking assistant. Transform lecture transcriptions into well-organized study notes. Return ONLY valid JSON with no markdown formatting."
        }, {
          role: "user",
          content: `Transform this lecture transcription into structured JSON study notes.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "title": "Specific descriptive lecture topic",
  "summary": "2-3 sentence overview",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "sections": [
    {"title": "Section name", "content": "Detailed explanation", "subtopics": ["subtopic1", "subtopic2"]}
  ],
  "definitions": {"term": "definition"},
  "questions": ["question 1", "question 2", "question 3"]
}

Requirements:
- Remove filler words (um, uh, like)
- Create 3-5 sections
- Extract 5-7 key points
- Identify important terms
- Generate 3-5 review questions

Transcription:
${transcription}`
        }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Groq response received");

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid Groq response structure");
    }

    let responseText = data.choices[0].message.content.trim();
    
    // Clean up response (remove markdown if present)
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const organizedNotes = JSON.parse(responseText);
    console.log("✅ Groq notes organized:", organizedNotes.title);
    
    return organizedNotes;
  };

  // ==================== GOOGLE GEMINI ====================
  const refineWithGemini = async (transcription) => {
    console.log("🌟 Starting Gemini processing...");

    const prompt = `You are an expert note-taking assistant. Transform this lecture transcription into well-organized study notes.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "title": "Specific descriptive lecture topic",
  "summary": "2-3 sentence overview of main content",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "sections": [
    {
      "title": "Section name",
      "content": "Detailed explanation",
      "subtopics": ["subtopic 1", "subtopic 2"]
    }
  ],
  "definitions": {"term": "definition"},
  "questions": ["question 1", "question 2", "question 3"]
}

Requirements:
- Remove filler words (um, uh, like)
- Create 3-5 main sections
- Extract 5-7 key points
- Identify important terms with definitions
- Generate 3-5 review questions
- Keep it clear and student-friendly

Transcription:
${transcription}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("📦 Gemini response received");

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid Gemini response structure");
    }

    let responseText = data.candidates[0].content.parts[0].text;
    
    // Clean up response (remove markdown code blocks if present)
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const organizedNotes = JSON.parse(responseText);
    console.log("✅ Gemini notes organized:", organizedNotes.title);
    
    return organizedNotes;
  };

  // ==================== FALLBACK ====================
  const createFallbackNotes = (transcription) => {
    console.log("🔄 Creating fallback notes...");
    
    const cleanedText = transcription
      .replace(/\b(um|uh|like|you know)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    return {
      title: "Lecture Notes - " + new Date().toLocaleDateString(),
      summary: sentences.slice(0, 3).join(". ").substring(0, 250) + "...",
      keyPoints: sentences.slice(0, 7).map(s => s.trim()).filter(s => s.length > 0),
      sections: [{
        title: "Main Content",
        content: cleanedText.substring(0, 1000),
        subtopics: []
      }],
      definitions: {},
      questions: [
        "What are the main topics covered in this lecture?",
        "What are the key takeaways?",
        "How does this relate to previous material?"
      ]
    };
  };

  const saveOrganizedNotes = async (organizedNotes, recordingId) => {
    try {
      console.log("💾 Saving organized notes...");

      await AsyncStorage.setItem('organizedNotes', JSON.stringify(organizedNotes));
      console.log("✅ Saved to AsyncStorage");

      if (recordingId) {
        try {
          const recordingRef = doc(db, "recordings", recordingId);
          await updateDoc(recordingRef, {
            organizedNotes: organizedNotes,
            lastOrganized: new Date(),
          });
          console.log("✅ Saved to Firestore");
        } catch (firestoreError) {
          console.error("⚠️ Firestore save failed:", firestoreError);
        }
      }

    } catch (error) {
      console.error("❌ Save error:", error);
    }
  };

  const toggleSection = async (index) => {
    await haptics.impact("Light");
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleRegenerate = async () => {
    if (!rawTranscription) {
      Alert.alert("Error", "No transcription available to regenerate");
      return;
    }

    await haptics.impact("Medium");
    setIsRegenerating(true);
    await refineWithAI(rawTranscription, currentRecordingId);
    setIsRegenerating(false);
  };

  const handleRefresh = async () => {
    await haptics.impact("Light");
    setRefreshing(true);
    await fetchLatestNotes();
  };

  const handleCopyNotes = async () => {
    await haptics.impact("Light");
    const notesText = formatNotesAsText(notes);
    Clipboard.setString(notesText);
    Alert.alert("Copied!", "Notes copied to clipboard");
  };

  const handleShareNotes = async () => {
    await haptics.impact("Light");
    try {
      const notesText = formatNotesAsText(notes);
      await Share.share({
        message: notesText,
        title: notes?.title || "My Lecture Notes",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const formatNotesAsText = (notes) => {
    if (!notes) return "";
    
    let text = `📚 ${notes.title}\n`;
    text += `${'='.repeat(notes.title.length + 3)}\n\n`;
    
    text += `📝 Summary:\n${notes.summary}\n\n`;
    
    text += `⭐ Key Points:\n`;
    notes.keyPoints.forEach((p, i) => {
      text += `${i + 1}. ${p}\n`;
    });
    text += '\n';
    
    notes.sections.forEach((section, i) => {
      text += `\n📂 ${section.title}\n`;
      text += `${'-'.repeat(section.title.length + 3)}\n`;
      text += `${section.content}\n`;
      if (section.subtopics && section.subtopics.length > 0) {
        text += `\nSubtopics:\n`;
        section.subtopics.forEach(st => text += `  • ${st}\n`);
      }
      text += '\n';
    });
    
    if (notes.definitions && Object.keys(notes.definitions).length > 0) {
      text += `\n📖 Key Definitions:\n`;
      text += `${'-'.repeat(18)}\n`;
      Object.entries(notes.definitions).forEach(([term, def]) => {
        text += `\n${term}:\n  ${def}\n`;
      });
      text += '\n';
    }
    
    if (notes.questions && notes.questions.length > 0) {
      text += `\n❓ Review Questions:\n`;
      text += `${'-'.repeat(20)}\n`;
      notes.questions.forEach((q, i) => {
        text += `${i + 1}. ${q}\n`;
      });
    }
    
    text += `\n\n---\n`;
    text += `Generated by Notetedd • ${new Date().toLocaleDateString()}\n`;
    text += `AI: ${aiProvider} • Storage: ${dataSource === 'firestore' ? 'Cloud' : 'Local'}\n`;
    
    return text;
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1F2937", "#374151"] : ["#9B5DE5", "#7C3AED"]}
        style={styles.header}
      >
        <View style={styles.headerPattern} />
        <MaterialIcons name="auto-stories" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={styles.headerTitle}>My Notes</Text>
        <Text style={styles.headerSubtitle}>
          AI-organized lecture notes
        </Text>
        {(dataSource || aiProvider) && (
          <View style={styles.badgesContainer}>
            {dataSource && (
              <View style={styles.sourceBadge}>
                <MaterialIcons 
                  name={dataSource === 'firestore' ? 'cloud' : 'storage'} 
                  size={12} 
                  color="rgba(255,255,255,0.9)" 
                />
                <Text style={styles.sourceBadgeText}>
                  {dataSource === 'firestore' ? 'Cloud' : 'Local'}
                </Text>
              </View>
            )}
            {aiProvider && (
              <View style={[styles.sourceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]}>
                <MaterialIcons name="auto-awesome" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.sourceBadgeText}>{aiProvider}</Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#9B5DE5"]}
            tintColor="#9B5DE5"
          />
        }
      >
        {loading ? (
          <Animated.View 
            style={[
              styles.loadingContainer,
              isDark && styles.loadingContainerDark,
              { opacity: fadeAnim }
            ]}
          >
            <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
              <MaterialIcons name="auto-awesome" size={48} color="#9B5DE5" />
            </Animated.View>
            <Text style={[styles.loadingTitle, isDark && styles.textDark]}>
              AI Processing Your Lecture
            </Text>
            <Text style={[styles.loadingText, isDark && styles.textSecondaryDark]}>
              Organizing content, extracting key points, creating structure...
            </Text>
          </Animated.View>
        ) : error && !notes ? (
          <Animated.View 
            style={[
              styles.errorContainer,
              isDark && styles.errorContainerDark,
              { opacity: fadeAnim }
            ]}
          >
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorTitle, isDark && styles.textDark]}>
              Processing Error
            </Text>
            <Text style={[styles.errorText, isDark && styles.textSecondaryDark]}>
              {error}
            </Text>
            {rawTranscription && (
              <>
                <Text style={[styles.fallbackLabel, isDark && styles.textSecondaryDark]}>
                  Raw Transcription:
                </Text>
                <ScrollView style={styles.rawScroll}>
                  <Text style={[styles.rawText, isDark && styles.textSecondaryDark]}>
                    {rawTranscription}
                  </Text>
                </ScrollView>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleRegenerate}
                >
                  <LinearGradient
                    colors={["#9B5DE5", "#7C3AED"]}
                    style={styles.retryButtonGradient}
                  >
                    <MaterialIcons name="refresh" size={20} color="#fff" />
                    <Text style={styles.retryButtonText}>Retry with AI</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        ) : !notes ? (
          <Animated.View 
            style={[
              styles.emptyContainer,
              isDark && styles.emptyContainerDark,
              { opacity: fadeAnim }
            ]}
          >
            <MaterialIcons name="library-books" size={64} color="#D1D5DB" />
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
              No Lectures Yet
            </Text>
            <Text style={[styles.emptyText, isDark && styles.textSecondaryDark]}>
              Record a lecture to see AI-organized notes appear here
            </Text>
            
            {/* API Setup Instructions */}
            <View style={[styles.setupCard, isDark && styles.setupCardDark]}>
              <Text style={[styles.setupTitle, isDark && styles.textDark]}>
                🚀 Setup AI Processing
              </Text>
              <View style={styles.setupStep}>
                <Text style={styles.setupNumber}>1</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.setupStepTitle, isDark && styles.textDark]}>
                    Groq (Recommended) ⚡
                  </Text>
                  <Text style={[styles.setupStepText, isDark && styles.textSecondaryDark]}>
                    FREE • 30 req/min • Super Fast • Get key at console.groq.com
                  </Text>
                </View>
              </View>
              <View style={styles.setupStep}>
                <Text style={styles.setupNumber}>2</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.setupStepTitle, isDark && styles.textDark]}>
                    Google Gemini (Backup) 🌟
                  </Text>
                  <Text style={[styles.setupStepText, isDark && styles.textSecondaryDark]}>
                    FREE • 15 req/min • Get key at aistudio.google.com/apikey
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.recordButton}
              onPress={() => navigation.navigate("RecordScreen")}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={styles.recordButtonGradient}
              >
                <MaterialIcons name="mic" size={20} color="#fff" />
                <Text style={styles.recordButtonText}>Record Lecture</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View 
            style={[
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={handleCopyNotes}
              >
                <MaterialIcons name="content-copy" size={20} color="#9B5DE5" />
                <Text style={[styles.actionButtonText, isDark && styles.textDark]}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={handleShareNotes}
              >
                <MaterialIcons name="share" size={20} color="#10B981" />
                <Text style={[styles.actionButtonText, isDark && styles.textDark]}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, isDark && styles.actionButtonDark]}
                onPress={handleRegenerate}
                disabled={isRegenerating || !rawTranscription}
              >
                <MaterialIcons 
                  name="refresh" 
                  size={20} 
                  color={isRegenerating || !rawTranscription ? "#9CA3AF" : "#F59E0B"} 
                />
                <Text style={[styles.actionButtonText, isDark && styles.textDark]}>
                  {isRegenerating ? "..." : "Regenerate"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title & Summary */}
            <View style={[styles.titleCard, isDark && styles.titleCardDark]}>
              <Text style={[styles.noteTitle, isDark && styles.textDark]}>
                {notes.title}
              </Text>
              <View style={styles.summaryContainer}>
                <MaterialIcons name="summarize" size={20} color="#9B5DE5" />
                <Text style={[styles.summary, isDark && styles.textSecondaryDark]}>
                  {notes.summary}
                </Text>
              </View>
            </View>

            {/* Key Points */}
            {notes.keyPoints && notes.keyPoints.length > 0 && (
              <View style={[styles.section, isDark && styles.sectionDark]}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="star" size={24} color="#F59E0B" />
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    Key Points
                  </Text>
                </View>
                {notes.keyPoints.map((point, index) => (
                  <View key={index} style={styles.keyPointItem}>
                    <View style={styles.keyPointBullet}>
                      <Text style={styles.keyPointNumber}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.keyPointText, isDark && styles.textDark]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Sections */}
            {notes.sections && notes.sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.section, isDark && styles.sectionDark]}
                onPress={() => toggleSection(index)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="folder" size={24} color="#9B5DE5" />
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    {section.title}
                  </Text>
                  <MaterialIcons 
                    name={expandedSections[index] ? "expand-less" : "expand-more"} 
                    size={24} 
                    color={isDark ? "#9CA3AF" : "#6B7280"} 
                  />
                </View>

                {expandedSections[index] && (
                  <>
                    <Text style={[styles.sectionContent, isDark && styles.textSecondaryDark]}>
                      {section.content}
                    </Text>
                    {section.subtopics && section.subtopics.length > 0 && (
                      <View style={styles.subtopicsContainer}>
                        {section.subtopics.map((subtopic, subIndex) => (
                          <View key={subIndex} style={styles.subtopicItem}>
                            <MaterialIcons name="chevron-right" size={16} color="#9B5DE5" />
                            <Text style={[styles.subtopicText, isDark && styles.textSecondaryDark]}>
                              {subtopic}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}

            {/* Definitions */}
            {notes.definitions && Object.keys(notes.definitions).length > 0 && (
              <View style={[styles.section, isDark && styles.sectionDark]}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="menu-book" size={24} color="#10B981" />
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    Key Definitions
                  </Text>
                </View>
                {Object.entries(notes.definitions).map(([term, definition], index) => (
                  <View key={index} style={styles.definitionItem}>
                    <Text style={[styles.definitionTerm, isDark && styles.textDark]}>
                      {term}
                    </Text>
                    <Text style={[styles.definitionText, isDark && styles.textSecondaryDark]}>
                      {definition}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Review Questions */}
            {notes.questions && notes.questions.length > 0 && (
              <View style={[styles.section, isDark && styles.sectionDark]}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="quiz" size={24} color="#EF4444" />
                  <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                    Review Questions
                  </Text>
                </View>
                {notes.questions.map((question, index) => (
                  <View key={index} style={styles.questionItem}>
                    <View style={styles.questionNumber}>
                      <Text style={styles.questionNumberText}>Q{index + 1}</Text>
                    </View>
                    <Text style={[styles.questionText, isDark && styles.textDark]}>
                      {question}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI Badge */}
            <View style={styles.aiBadgeContainer}>
              <View style={styles.aiBadge}>
                <MaterialIcons name="auto-awesome" size={14} color="#9B5DE5" />
                <Text style={styles.aiBadgeText}>Organized by {aiProvider || "AI"}</Text>
              </View>
            </View>
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
  badgesContainer: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  sourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sourceBadgeText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 48,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  loadingContainerDark: {
    backgroundColor: "#1F2937",
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  errorContainerDark: {
    backgroundColor: "#7F1D1D",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
  },
  fallbackLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  rawScroll: {
    maxHeight: 200,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  rawText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  retryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 48,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
  setupCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    width: "100%",
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
  recordButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  recordButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionButtonDark: {
    backgroundColor: "#1F2937",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 4,
  },
  titleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  titleCardDark: {
    backgroundColor: "#1F2937",
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
  },
  summary: {
    flex: 1,
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
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
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionContent: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 12,
  },
  keyPointItem: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  keyPointBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  keyPointNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9B5DE5",
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 22,
  },
  subtopicsContainer: {
    marginTop: 12,
  },
  subtopicItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  subtopicText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },
  definitionItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  definitionTerm: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  definitionText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  questionItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EF4444",
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 22,
  },
  aiBadgeContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9B5DE5",
  },
  textDark: {
    color: "#F9FAFB",
  },
  textSecondaryDark: {
    color: "#D1D5DB",
  },
});