import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function HomeScreen() {
  const stats = [
    {
      icon: 'access-time',
      label: "Hours Studied",
      value: "12.5",
    },
    {
      icon: 'book',
      label: "Notes Created",
      value: "24",
    },
    {
      icon: 'psychology',
      label: "Quizzes Taken",
      value: "8",
    },
  ];

  const recentLectures = [
    {
      title: "Introduction to Psychology",
      duration: "45 mins",
      date: "2 hours ago",
      notes: 1200,
    },
    {
      title: "Advanced Calculus",
      duration: "60 mins",
      date: "Yesterday",
      notes: 1500,
    },
    {
      title: "World History",
      duration: "30 mins",
      date: "2 days ago",
      notes: 800,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>Joe</Text>
        </View>
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationLabel}>🌟 Daily Motivation</Text>
          <Text style={styles.motivationText}>
            "Study smarter today, excel tomorrow. Your future self will thank you."
          </Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <MaterialIcons name={stat.icon} color="#9B5DE5" size={20} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
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
        <View style={styles.readyToLearnContainer}>
          <View>
            <Text style={styles.readyToLearnTitle}>Ready to Learn?</Text>
            <Text style={styles.readyToLearnText}>Start recording your next lecture</Text>
            <TouchableOpacity style={styles.startRecordingButton}>
              <Text style={styles.startRecordingText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
          <MaterialIcons name="star" color="#D0A2FF" size={40} />
        </View>
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
    paddingTop: 48,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginBottom: 32,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  motivationContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  motivationLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  motivationText: {
    color: "#E0FCFF",
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
    marginTop: -24,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  stat: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  recentLecturesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  recentLecturesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  recentLecturesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  seeAll: {
    fontSize: 14,
    color: "#9B5DE5",
    fontWeight: "500",
  },
  lecture: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginBottom: 8,
  },
  lectureInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  lectureIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#F3E8FF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  lectureDetails: {
    fontSize: 14,
    color: "#6B7280",
  },
  readyToLearnContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#9B5DE5",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  readyToLearnTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  readyToLearnText: {
    fontSize: 14,
    color: "#F3E8FF",
    marginBottom: 16,
  },
  startRecordingButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  startRecordingText: {
    color: "#9B5DE5",
    fontSize: 14,
    fontWeight: "500",
  },
});
