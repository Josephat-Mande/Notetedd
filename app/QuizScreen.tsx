import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function QuizScreen() {
  const quizzes = [
    {
      title: "Physics Quiz",
      description: "Test your knowledge on quantum mechanics and more.",
      questions: 10,
    },
    {
      title: "History Quiz",
      description: "How well do you know world history?",
      questions: 8,
    },
    {
      title: "Math Quiz",
      description: "Solve challenging calculus problems.",
      questions: 12,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Quiz</Text>
      </View>
      <View style={styles.content}>
        {quizzes.map((quiz, index) => (
          <View key={index} style={styles.quizContainer}>
            <Text style={styles.quizTitle}>{quiz.title}</Text>
            <Text style={styles.quizDescription}>{quiz.description}</Text>
            <Text style={styles.quizQuestions}>{quiz.questions} Questions</Text>
            <TouchableOpacity style={styles.startButton}>
              <MaterialIcons name="play-arrow" size={20} color="white" style={styles.icon} />
              <Text style={styles.buttonText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        ))}
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
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    padding: 24,
    flex: 1,
    alignItems: 'center',
  },
  quizContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  quizQuestions: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: "#14B8A6",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

// export default QuizScreen;
