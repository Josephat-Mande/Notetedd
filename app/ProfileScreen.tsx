// screens/ProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {  Edit, Save } from "lucide-react"; // Using lucide icons
import { MaterialIcons } from "@expo/vector-icons"; // Import MaterialIcons
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// Make sure Firebase is initialized in your project!
const auth = getAuth();
const db = getFirestore();

export default function ProfileScreen() {
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch logged-in user details from Firestore
  useEffect(() => {
    async function fetchUserData() {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setName(data.name || "");
            setPlan(data.plan || "");
          } else {
            Alert.alert("No user data found!");
          }
        }
      } catch (error) {
        console.error("Error fetching user data: ", error);
        Alert.alert("Error", "Could not fetch user data.");
      } finally {
        setLoading(false);
      }
    }
    fetchUserData();
  }, []);

  // Save updated user data to Firestore
  const handleSave = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, {
          name,
          plan,
        });
        setUserData({ ...userData, name, plan });
        setEditing(false);
        Alert.alert("Success", "Profile updated successfully.");
      }
    } catch (error) {
      console.error("Error updating user data: ", error);
      Alert.alert("Error", "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  // const toggleSidebar = () => {
  //   setIsSidebarOpen((prev) => !prev);
  // };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Sidebar Toggle (Hamburger Icon) */}
              {/* <TouchableOpacity style={styles.sidebarToggle} onPress={toggleSidebar}>
                <MaterialIcons name="menu" size={28} color="#fff" />
              </TouchableOpacity> */}
      <View style={styles.profileHeader}>
        <MaterialIcons name="person" size={24} color="#fff" />
        <Text style={styles.headerText}>My Profile</Text>
      </View>
      <View style={styles.profileForm}>
        <Text style={styles.label}>Name:</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={name}
          editable={editing}
          onChangeText={setName}
          placeholder="Enter your name"
        />

        <Text style={styles.label}>Plan:</Text>
        <TextInput
          style={[styles.input, !editing && styles.disabledInput]}
          value={plan}
          editable={editing}
          onChangeText={setPlan}
          placeholder="Enter your plan"
        />

        {editing ? (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Save size={20} color="#fff" />
            <Text style={styles.buttonText}> Save Changes</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <MaterialIcons name= "edit" size={20} color="#fff" />
            <Text style={styles.buttonText}> Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#7c3aed",
  },
  profileForm: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#e5e7eb",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    padding: 12,
    borderRadius: 6,
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 6,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  sidebarToggle: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
});
