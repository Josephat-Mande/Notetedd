import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
  Modal,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import Sidebar from "./Sidebar"; // Import Sidebar component
import { MoonStar } from "lucide-react-native";

export default function HomeScreen() {
  const navigation = useNavigation();
  const [fullName, setFullName] = useState("User");
  const scheme = useColorScheme();
  const [theme, setTheme] = useState(scheme);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFullName(user?.displayName || "User"); // Fetching full name
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Dynamic greeting based on the current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    else if (hour < 17) return "Good afternoon,";
    else if (hour < 20) return "Good evening,";
    else return "Good night,";
  };

  const stats = useMemo(
    () => [
      { icon: "access-time", label: "Hours Studied", value: "12.5" },
      { icon: "book", label: "Notes Created", value: "24" },
      { icon: "psychology", label: "Quizzes Taken", value: "8" },
    ],
    []
  );

  const recentLectures = [
    { title: "Introduction to Psychology", duration: "45 mins", date: "2 hours ago" },
    { title: "Advanced Calculus", duration: "60 mins", date: "Yesterday" },
    { title: "World History", duration: "30 mins", date: "2 days ago" },
  ];

  const { height } = Dimensions.get("window");

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <ScrollView style={[styles.container, theme === "dark" ? styles.darkBg : styles.lightBg]}>
      {/* Header */}
      <View style={[styles.header, theme === "dark" ? styles.darkHeader : styles.lightHeader]}>
        {/* Sidebar Toggle (Hamburger Icon) */}
        <TouchableOpacity style={styles.sidebarToggle} onPress={toggleSidebar}>
          <MaterialIcons name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Theme Toggle Button */}
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
          <MaterialIcons name={theme === "dark" ? "brightness-7" : "brightness-4"} size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{fullName}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.stat}>
            <MaterialIcons name={stat.icon} size={20} color="#9B5DE5" />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Lectures */}
      <View style={styles.recentLecturesContainer}>
        <View style={styles.recentLecturesHeader}>
          <Text style={styles.recentLecturesTitle}>Recent Lectures</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentLectures.map((lecture) => (
          <View key={lecture.title} style={styles.lecture}>
            <View style={styles.lectureInfo}>
              <View style={styles.lectureIcon}>
                <MaterialIcons name="mic" color="#9B5DE5" size={20} />
              </View>
              <View>
                <Text style={styles.lectureTitle}>{lecture.title}</Text>
                <Text style={styles.lectureDetails}>
                  {lecture.duration} • {lecture.date}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" color="#B0B0B0" size={20} />
          </View>
        ))}
      </View>

      {/* Ready to Learn Section */}
      <View style={[styles.readyToLearnContainer, { minHeight: height * 0.3 }]}>
        <Text style={styles.readyToLearnTitle}>Ready to Learn?</Text>
        <Text style={styles.readyToLearnText}>Start recording your next lecture</Text>
        <TouchableOpacity style={styles.startRecordingButton}>
          <Text style={styles.startRecordingText}>Start Recording</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSidebarOpen}
        onRequestClose={toggleSidebar}
      >
        <View style={styles.sidebarOverlay}>
          <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: "#F8FAFC" },
  darkBg: { backgroundColor: "#121212" },
  header: {
    padding: 24,
    paddingTop: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: "relative",
  },
  lightHeader: { backgroundColor: "#9B5DE5" },
  darkHeader: { backgroundColor: "#333" },
  greeting: { fontSize: 18, color: "#FFFFFF", marginTop: 40 },
  name: { fontSize: 32, fontWeight: "bold", color: "#FFFFFF" },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  stat: {
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    elevation: 5,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: { fontSize: 24, fontWeight: "bold" },
  statLabel: { fontSize: 12, color: "#6B7280" },
  recentLecturesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  recentLecturesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  recentLecturesTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  seeAll: { fontSize: 14, color: "#9B5DE5" },
  lecture: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 8,
  },
  lectureInfo: { flexDirection: "row", alignItems: "center" },
  lectureIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#F3E8FF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lectureTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  lectureDetails: { fontSize: 12, color: "#6B7280" },
  readyToLearnContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#9B5DE5",
    margin: 18,
  },
  readyToLearnTitle: { fontSize: 18, fontWeight: "600", color: "#FFFFFF" },
  readyToLearnText: { fontSize: 14, color: "#FFFFFF", marginVertical: 8 },
  startRecordingButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  startRecordingText: { color: "#9B5DE5", fontSize: 14, fontWeight: "500" },
  // Positioning the toggle buttons in the header
  themeToggle: { position: "absolute", top: 10, right: 10 },
  sidebarToggle: { position: "absolute", top: 10, left: 10 },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
});