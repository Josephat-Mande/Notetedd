
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
  Modal,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit 
} from "firebase/firestore";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Sidebar from "./Sidebar";

// Import widgets
import StudyAnalyticsWidget from "../components/widgets/StudyAnalyticsWidget";
import PomodoroTimerWidget from "../components/widgets/PomodoroTimerWidget";
import AchievementModal from "../components/widgets/AchievementModal";

export default function HomeScreen() {
  const navigation = useNavigation();
  const auth = getAuth();
  const db = getFirestore();
  
  const [fullName, setFullName] = useState("User");
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme || "light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Real Data State
  const [streakCount, setStreakCount] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [quizzesCount, setQuizzesCount] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentLectures, setRecentLectures] = useState([]);
  
  // Achievement state
  const [showAchievement, setShowAchievement] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for streak
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFullName(user?.displayName || "User");
        loadAllData();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (auth.currentUser) {
        loadAllData();
      }
    }, [])
  );

  // ==================== DATA LOADING ====================
  const loadAllData = async () => {
    try {
      setLoading(true);
      console.log("📊 Loading dashboard data...");

      await Promise.all([
        calculateStreak(),
        loadStats(),
        loadWeeklyActivity(),
        loadRecentLectures(),
      ]);

      console.log("✅ Dashboard data loaded!");
    } catch (error) {
      console.error("❌ Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== STREAK CALCULATION ====================
  const calculateStreak = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get all recordings ordered by date
      const recordingsRef = collection(db, "recordings");
      const q = query(
        recordingsRef,
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setStreakCount(0);
        return;
      }

      // Extract unique days
      const activityDays = new Set();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          const date = data.createdAt.toDate();
          const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          activityDays.add(dayKey);
        }
      });

      // Calculate streak
      const sortedDays = Array.from(activityDays).sort().reverse();
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      
      let streak = 0;
      let checkDate = new Date(today);
      
      // Check if user was active today or yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
      
      if (!sortedDays.includes(todayKey) && !sortedDays.includes(yesterdayKey)) {
        setStreakCount(0);
        return;
      }

      // Count consecutive days
      for (let i = 0; i < 365; i++) {
        const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        
        if (sortedDays.includes(dateKey)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      console.log(`🔥 Streak calculated: ${streak} days`);
      setStreakCount(streak);

      // Save to AsyncStorage for offline access
      await AsyncStorage.setItem('userStreak', streak.toString());

    } catch (error) {
      console.error("❌ Error calculating streak:", error);
      // Fallback to AsyncStorage
      const savedStreak = await AsyncStorage.getItem('userStreak');
      setStreakCount(savedStreak ? parseInt(savedStreak) : 0);
    }
  };

  // ==================== STATS LOADING ====================
  const loadStats = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const recordingsRef = collection(db, "recordings");
      const q = query(
        recordingsRef,
        where("userId", "==", currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      
      let totalDuration = 0;
      let notesSessionCount = 0;
      let quizSessionCount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count notes sessions
        if (data.organizedNotes) {
          notesSessionCount++;
        }

        // Count quiz sessions
        if (data.quiz) {
          quizSessionCount++;
        }

        // Calculate total duration
        if (data.duration) {
          totalDuration += data.duration;
        } else if (data.audioUrl && data.createdAt) {
          // Estimate duration if not directly available
          totalDuration += 1800; // Default 30 minutes
        }
      });

      // Convert seconds to hours
      const hours = (totalDuration / 3600).toFixed(1);
      
      console.log(`📚 Stats: ${hours}h, ${notesSessionCount} notes, ${quizSessionCount} quizzes`);
      
      setTotalHours(hours);
      setNotesCount(notesSessionCount);
      setQuizzesCount(quizSessionCount);

      // Save to AsyncStorage
      await AsyncStorage.setItem('stats', JSON.stringify({
        hours,
        notes: notesSessionCount,
        quizzes: quizSessionCount,
      }));

    } catch (error) {
      console.error("❌ Error loading stats:", error);
      // Fallback to AsyncStorage
      const savedStats = await AsyncStorage.getItem('stats');
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        setTotalHours(stats.hours || 0);
        setNotesCount(stats.notes || 0);
        setQuizzesCount(stats.quizzes || 0);
      }
    }
  };

  // ==================== WEEKLY ACTIVITY ====================
  const loadWeeklyActivity = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get recordings from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recordingsRef = collection(db, "recordings");
      const q = query(
        recordingsRef,
        where("userId", "==", currentUser.uid),
        where("createdAt", ">=", sevenDaysAgo),
        orderBy("createdAt", "asc")
      );

      const querySnapshot = await getDocs(q);
      
      // Initialize week data
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekData = daysOfWeek.map((day, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          day: day,
          label: day.charAt(0),
          hours: 0,
          date: date.toDateString(),
        };
      });

      // Aggregate activity by day
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt) {
          const activityDate = data.createdAt.toDate();
          const dayIndex = activityDate.getDay();
          const duration = data.duration || 1800; // Default 30 minutes
          
          // Find matching day in weekData
          const weekDay = weekData.find(d => {
            const wDate = new Date(d.date);
            return wDate.toDateString() === activityDate.toDateString();
          });
          
          if (weekDay) {
            weekDay.hours += duration / 3600; // Convert to hours
          }
        }
      });

      // Round hours to 1 decimal
      weekData.forEach(day => {
        day.hours = Math.round(day.hours * 10) / 10;
      });

      console.log("📅 Weekly activity loaded:", weekData);
      setWeeklyData(weekData);

    } catch (error) {
      console.error("❌ Error loading weekly activity:", error);
      // Fallback to empty data
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setWeeklyData(daysOfWeek.map(day => ({
        day,
        label: day.charAt(0),
        hours: 0,
      })));
    }
  };

  // ==================== RECENT LECTURES ====================
  const loadRecentLectures = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const recordingsRef = collection(db, "recordings");
      const q = query(
        recordingsRef,
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      
      const lectures = [];
      const colors = ["#9B5DE5", "#00B4D8", "#FF006E", "#FFD93D", "#10B981"];

      querySnapshot.forEach((doc, index) => {
        const data = doc.data();
        
        if (data.organizedNotes) {
          const createdAt = data.createdAt?.toDate() || new Date();
          const duration = data.duration 
            ? Math.round(data.duration / 60) 
            : 30;

          // Calculate progress based on whether quiz exists
          const progress = data.quiz ? 100 : data.organizedNotes ? 75 : 50;

          // Get relative time
          const timeAgo = getTimeAgo(createdAt);

          lectures.push({
            id: doc.id,
            title: data.organizedNotes.title || "Untitled Lecture",
            duration: `${duration} mins`,
            date: timeAgo,
            progress: progress,
            color: colors[index % colors.length],
            topic: data.organizedNotes.keyPoints?.[0]?.substring(0, 50) || "General Topic",
          });
        }
      });

      console.log(`🎓 Recent lectures loaded: ${lectures.length}`);
      setRecentLectures(lectures);

      // Save to AsyncStorage
      await AsyncStorage.setItem('recentLectures', JSON.stringify(lectures));

    } catch (error) {
      console.error("❌ Error loading recent lectures:", error);
      // Fallback to AsyncStorage
      const savedLectures = await AsyncStorage.getItem('recentLectures');
      if (savedLectures) {
        setRecentLectures(JSON.parse(savedLectures));
      }
    }
  };

  // ==================== HELPER FUNCTIONS ====================
  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    else if (hour < 17) return "Good afternoon";
    else if (hour < 20) return "Good evening";
    else return "Good night";
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "Every lecture is a step forward! 🚀",
      "Knowledge is power! 💪",
      "You're doing amazing! ⭐",
      "Keep the momentum going! 🔥",
      "Learning never stops! 📚"
    ];
    const hour = new Date().getHours();
    return quotes[hour % quotes.length];
  };

  // ==================== NAVIGATION HANDLERS ====================
  const handleQuickAction = (action) => {
    switch (action) {
      case "New Note":
        navigation.navigate("RecordScreen");
        break;
      case "Take Quiz":
        navigation.navigate("QuizScreen", { theme });
        break;
      case "AI Summary":
        navigation.navigate("NotesScreen", { theme });
        break;
      case "Schedule":
        Alert.alert("Coming Soon", "Schedule feature is under development!");
        break;
      default:
        break;
    }
  };

  const handleLecturePress = (lecture) => {
    navigation.navigate("NotesScreen", { 
      theme,
      lectureId: lecture.id 
    });
  };

  const handleStartRecording = () => {
    navigation.navigate("RecordScreen");
  };

  // ==================== EVENT HANDLERS ====================
  const handlePomodoroComplete = (sessionType) => {
    console.log(`${sessionType} session completed!`);
    
    const achievement = {
      id: 'pomodoro_complete',
      icon: 'timer',
      title: 'Focused Mind',
      description: 'Completed a Pomodoro session!',
      color: '#9B5DE5',
      points: 25,
    };
    
    setCurrentAchievement(achievement);
    setShowAchievement(true);
    
    // Refresh stats
    loadStats();
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // ==================== COMPUTED VALUES ====================
  const stats = useMemo(
    () => [
      { 
        icon: "access-time", 
        label: "Hours", 
        value: totalHours.toString(), 
        color: "#FF6B6B", 
        gradient: ["#FF6B6B", "#FF8E53"] 
      },
      { 
        icon: "book", 
        label: "Notes", 
        value: notesCount.toString(), 
        color: "#4ECDC4", 
        gradient: ["#4ECDC4", "#44A08D"] 
      },
      { 
        icon: "psychology", 
        label: "Quizzes", 
        value: quizzesCount.toString(), 
        color: "#FFD93D", 
        gradient: ["#FFD93D", "#F6C744"] 
      },
    ],
    [totalHours, notesCount, quizzesCount]
  );

  const achievements = [
    { icon: "emoji-events", label: `${streakCount} Day Streak!`, color: "#FFD700" },
    { icon: "stars", label: "Top Learner", color: "#9B5DE5" },
  ];

  const { height } = Dimensions.get("window");
  const isDark = theme === "dark";

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B5DE5" />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>
            Loading your dashboard...
          </Text>
        </View>
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Animated Header with Gradient */}
        <Animated.View 
          style={[
            styles.headerContainer,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={isDark ? ["#1F2937", "#374151"] : ["#e67e22", "#d35400"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerPattern} />
            
            <TouchableOpacity style={styles.sidebarToggle} onPress={toggleSidebar}>
              <View style={styles.iconButton}>
                <MaterialIcons name="menu" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <View style={styles.iconButton}>
                <MaterialIcons 
                  name={isDark ? "brightness-7" : "brightness-4"} 
                  size={22} 
                  color="#fff" 
                />
              </View>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{fullName} 👋</Text>
              <Text style={styles.motivationalText}>{getMotivationalQuote()}</Text>
            </View>

            {/* Floating Streak Badge */}
            {streakCount > 0 && (
              <Animated.View 
                style={[
                  styles.streakBadge,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <LinearGradient
                  colors={["#FFD700", "#FFA500"]}
                  style={styles.streakGradient}
                >
                  <MaterialIcons name="local-fire-department" size={24} color="#fff" />
                  <Text style={styles.streakNumber}>{streakCount}</Text>
                  <Text style={styles.streakLabel}>day streak</Text>
                </LinearGradient>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Achievements Banner */}
        <Animated.View 
          style={[
            styles.achievementsContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {achievements.map((achievement, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.achievementBadge,
                  isDark && styles.darkGlass
                ]}
                onPress={() => {
                  setCurrentAchievement({
                    id: `achievement_${index}`,
                    icon: achievement.icon,
                    title: achievement.label,
                    description: 'Keep up the great work!',
                    color: achievement.color,
                    points: 50,
                  });
                  setShowAchievement(true);
                }}
              >
                <MaterialIcons name={achievement.icon} size={20} color={achievement.color} />
                <Text style={[styles.achievementText, isDark && styles.darkText]}>
                  {achievement.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Stats Cards with Glass Effect */}
        <Animated.View 
          style={[
            styles.statsContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {stats.map((stat) => (
            <Animated.View
              key={stat.label}
              style={[
                styles.statCard,
                isDark && styles.darkGlass,
              ]}
            >
              <LinearGradient
                colors={stat.gradient}
                style={styles.statIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name={stat.icon} size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.statValue, isDark && styles.darkText]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Pomodoro Timer Widget */}
        <PomodoroTimerWidget 
          theme={theme}
          onSessionComplete={handlePomodoroComplete}
        />

        {/* Study Analytics Widget */}
        <StudyAnalyticsWidget 
          theme={theme}
          weeklyData={weeklyData}
        />

        {/* Recent Lectures with Progress */}
        {recentLectures.length > 0 && (
          <Animated.View 
            style={[
              styles.sectionContainer,
              isDark && styles.darkGlass,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
                  Recent Lectures
                </Text>
                <Text style={styles.sectionSubtitle}>Continue where you left off</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("NotesScreen", { theme })}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>

            {recentLectures.map((lecture) => (
              <TouchableOpacity 
                key={lecture.id}
                activeOpacity={0.7}
                style={[
                  styles.lectureCard,
                  isDark && styles.darkLectureCard,
                ]}
                onPress={() => handleLecturePress(lecture)}
              >
                <View style={styles.lectureMain}>
                  <View style={[styles.lectureIcon, { backgroundColor: lecture.color + "20" }]}>
                    <MaterialIcons name="mic" color={lecture.color} size={24} />
                  </View>
                  <View style={styles.lectureInfo}>
                    <Text style={[styles.lectureTitle, isDark && styles.darkText]}>
                      {lecture.title}
                    </Text>
                    <Text style={styles.lectureDetails}>
                      {lecture.duration} • {lecture.date}
                    </Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { width: `${lecture.progress}%`, backgroundColor: lecture.color }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{lecture.progress}%</Text>
                    </View>
                  </View>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  color={isDark ? "#6B7280" : "#B0B0B0"} 
                  size={24} 
                />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Quick Actions Grid */}
        <Animated.View 
          style={[
            styles.quickActionsContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={[styles.sectionTitle, isDark && styles.darkText, { marginBottom: 16 }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {[
              { icon: "note-add", label: "New Note", color: "#9B5DE5" },
              { icon: "quiz", label: "Take Quiz", color: "#FF006E" },
              { icon: "auto-awesome", label: "AI Summary", color: "#00B4D8" },
              { icon: "calendar-today", label: "Schedule", color: "#FFD93D" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickActionCard, isDark && styles.darkGlass]}
                activeOpacity={0.7}
                onPress={() => handleQuickAction(action.label)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + "20" }]}>
                  <MaterialIcons name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, isDark && styles.darkText]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Ready to Learn CTA */}
        <Animated.View 
          style={[
            styles.ctaContainer,
            { 
              opacity: fadeAnim,
              minHeight: height * 0.25 
            }
          ]}
        >
          <LinearGradient
            colors={["#9B5DE5", "#6B21A8"]}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ctaPattern} />
            <MaterialIcons name="mic" size={64} color="rgba(255,255,255,0.3)" style={styles.ctaIcon} />
            <Text style={styles.ctaTitle}>Ready to Learn?</Text>
            <Text style={styles.ctaSubtitle}>
              Transform your lectures into smart notes
            </Text>
            <TouchableOpacity 
              style={styles.ctaButton} 
              activeOpacity={0.8}
              onPress={handleStartRecording}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F8F9FA"]}
                style={styles.ctaButtonGradient}
              >
                <MaterialIcons name="fiber-manual-record" size={16} color="#9B5DE5" />
                <Text style={styles.ctaButtonText}>Start Recording</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Study Tip Card */}
        <Animated.View 
          style={[
            styles.tipCard,
            isDark && styles.darkGlass,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.tipHeader}>
            <MaterialIcons name="lightbulb" size={24} color="#FFD93D" />
            <Text style={[styles.tipTitle, isDark && styles.darkText]}>
              Study Tip of the Day
            </Text>
          </View>
          <Text style={[styles.tipText, isDark && { color: "#D1D5DB" }]}>
            Review your notes within 24 hours of recording to boost retention by up to 80%!
          </Text>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Sidebar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSidebarOpen}
        onRequestClose={toggleSidebar}
      >
        <TouchableOpacity 
          style={styles.sidebarOverlay} 
          activeOpacity={1}
          onPress={toggleSidebar}
        >
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={toggleSidebar} 
            theme={theme}
            onThemeToggle={toggleTheme}
          />
        </TouchableOpacity>
      </Modal>

      {/* Achievement Modal */}
      <AchievementModal
        visible={showAchievement}
        achievement={currentAchievement}
        onClose={() => setShowAchievement(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: "#F5F7FA" },
  darkBg: { backgroundColor: "#0F172A" },
  scrollContent: { paddingBottom: 20 },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
  
  // Header Styles
  headerContainer: {
    marginBottom: -40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
    position: "relative",
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
  headerContent: {
    marginTop: 20,
  },
  greeting: { 
    fontSize: 16, 
    color: "rgba(255,255,255,0.9)", 
    fontWeight: "500",
  },
  name: { 
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#FFFFFF",
    marginTop: 4,
  },
  motivationalText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  themeToggle: { 
    position: "absolute", 
    top: 50, 
    right: 24,
  },
  sidebarToggle: { 
    position: "absolute", 
    top: 50, 
    left: 24,
  },
  
  // Streak Badge
  streakBadge: {
    position: "absolute",
    top: 110,
    right: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  streakGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  streakLabel: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  
  // Achievements
  achievementsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkGlass: {
    backgroundColor: "rgba(31, 41, 55, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  achievementText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  
  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#1F2937",
  },
  statLabel: { 
    fontSize: 12, 
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },
  darkText: { color: "#F9FAFB" },
  
  // Sections
  sectionContainer: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  seeAll: { 
    fontSize: 14, 
    color: "#9B5DE5",
    fontWeight: "600",
  },
  
  // Lectures
  lectureCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginBottom: 12,
  },
  darkLectureCard: {
    backgroundColor: "rgba(55, 65, 81, 0.5)",
  },
  lectureMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  lectureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lectureInfo: { flex: 1 },
  lectureTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#1F2937",
    marginBottom: 4,
  },
  lectureDetails: { 
    fontSize: 12, 
    color: "#6B7280",
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    minWidth: 35,
  },
  
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  
  // CTA
  ctaContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#9B5DE5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaGradient: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ctaPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  ctaIcon: {
    marginBottom: 16,
  },
  ctaTitle: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#FFFFFF",
    marginBottom: 8,
  },
  ctaSubtitle: { 
    fontSize: 15, 
    color: "rgba(255,255,255,0.9)",
    marginBottom: 24,
    textAlign: "center",
  },
  ctaButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  ctaButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  ctaButtonText: { 
    color: "#9B5DE5", 
    fontSize: 16, 
    fontWeight: "700",
  },
  
  // Tip Card
  tipCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  tipText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});