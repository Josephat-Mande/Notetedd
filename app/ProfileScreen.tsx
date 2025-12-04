import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { getAuth, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import haptics from "./utils/haptics";
import BackButton from "../components/Backbutton";

export default function ProfileScreen({ navigation, route }) {
  const theme = route?.params?.theme || "light";
  const isDark = theme === "dark";
  
  const goBack = () => {
    navigation.navigate("PreviousScreen");
  }
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phone: "",
    bio: "",
    university: "",
    major: "",
    yearOfStudy: "",
    photoURL: null,
  });
  
  const [stats, setStats] = useState({
    lecturesRecorded: 45,
    notesCreated: 128,
    quizzesCompleted: 32,
    studyHours: 156,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    loadProfileData();
    
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
  }, []);

  const loadProfileData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            displayName: user.displayName || data.username || "",
            email: user.email || "",
            phone: data.phone || "",
            bio: data.bio || "",
            university: data.university || "",
            major: data.major || "",
            yearOfStudy: data.yearOfStudy || "",
            photoURL: user.photoURL || data.photoURL || null,
          });
          setStats({
            lecturesRecorded: data.lecturesRecorded || 45,
            notesCreated: data.notesCreated || 128,
            quizzesCompleted: data.quizzesCompleted || 32,
            studyHours: data.studyHours || 156,
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    await haptics.impact("Medium");
    
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: profileData.displayName,
          photoURL: profileData.photoURL,
        });

        await updateDoc(doc(db, "users", user.uid), {
          username: profileData.displayName,
          phone: profileData.phone,
          bio: profileData.bio,
          university: profileData.university,
          major: profileData.major,
          yearOfStudy: profileData.yearOfStudy,
        });

        await haptics.notification("Success");
        Alert.alert("Success", "Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      await haptics.notification("Error");
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    await haptics.impact("Light");
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileData({ ...profileData, photoURL: result.assets[0].uri });
    }
  };

  const getInitials = () => {
    const name = profileData.displayName || "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1F2937", "#374151"] : ["#9B5DE5", "#7C3AED"]}
        style={styles.header}
      >
        <BackButton />
        
        <Text style={styles.headerTitle}>My Profile</Text>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            haptics.impact("Light");
            setIsEditing(!isEditing);
          }}
        >
          <MaterialIcons 
            name={isEditing ? "close" : "edit"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity 
              onPress={isEditing ? pickImage : null}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              {profileData.photoURL ? (
                <Image 
                  source={{ uri: profileData.photoURL }} 
                  style={styles.profilePhoto}
                />
              ) : (
                <LinearGradient
                  colors={["#F59E0B", "#D97706"]}
                  style={styles.profilePhoto}
                >
                  <Text style={styles.initialsText}>{getInitials()}</Text>
                </LinearGradient>
              )}
              
              {isEditing && (
                <View style={styles.cameraIconContainer}>
                  <MaterialIcons name="camera-alt" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {!isEditing && (
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={["#FFD700", "#FFA500"]}
                  style={styles.premiumBadge}
                >
                  <MaterialIcons name="stars" size={16} color="#fff" />
                  <Text style={styles.premiumText}>Premium Member</Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          {!isEditing && (
            <View style={styles.statsContainer}>
              {[
                { icon: "mic", label: "Lectures", value: stats.lecturesRecorded, color: "#9B5DE5" },
                { icon: "note", label: "Notes", value: stats.notesCreated, color: "#10B981" },
                { icon: "quiz", label: "Quizzes", value: stats.quizzesCompleted, color: "#F59E0B" },
                { icon: "schedule", label: "Hours", value: stats.studyHours, color: "#EF4444" },
              ].map((stat, index) => (
                <View 
                  key={index}
                  style={[styles.statCard, isDark && styles.statCardDark]}
                >
                  <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
                    <MaterialIcons name={stat.icon} size={24} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, isDark && styles.textDark]}>
                    {stat.value}
                  </Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Profile Form */}
          <View style={[styles.formContainer, isDark && styles.formContainerDark]}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Personal Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Full Name
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="person" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.displayName}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, displayName: text })
                  }
                  editable={isEditing}
                  placeholder="Enter your name"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Email Address
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="email" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Phone Number
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="phone" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.phone}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, phone: text })
                  }
                  editable={isEditing}
                  placeholder="Enter phone number"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Bio
              </Text>
              <View style={[
                styles.inputContainer, 
                styles.textAreaContainer,
                isDark && styles.inputContainerDark
              ]}>
                <TextInput
                  style={[styles.textArea, isDark && styles.inputDark]}
                  value={profileData.bio}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, bio: text })
                  }
                  editable={isEditing}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginTop: 24 }]}>
              Academic Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                University
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="school" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.university}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, university: text })
                  }
                  editable={isEditing}
                  placeholder="Enter university name"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Major / Field of Study
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="book" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.major}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, major: text })
                  }
                  editable={isEditing}
                  placeholder="e.g., Computer Science"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                Year of Study
              </Text>
              <View style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
                <MaterialIcons 
                  name="event" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#6B7280"} 
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={profileData.yearOfStudy}
                  onChangeText={(text) => 
                    setProfileData({ ...profileData, yearOfStudy: text })
                  }
                  editable={isEditing}
                  placeholder="e.g., 3rd Year"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.saveButtonGradient}
                >
                  <MaterialIcons name="check" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 24,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#9B5DE5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  badgeContainer: {
    marginTop: 12,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  premiumText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardDark: {
    backgroundColor: "#1F2937",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  formContainerDark: {
    backgroundColor: "#1F2937",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputContainerDark: {
    backgroundColor: "#374151",
    borderColor: "#4B5563",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#1F2937",
  },
  inputDark: {
    color: "#F9FAFB",
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  textArea: {
    flex: 1,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    color: "#1F2937",
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  textDark: {
    color: "#F9FAFB",
  },
  textSecondaryDark: {
    color: "#D1D5DB",
  },
});