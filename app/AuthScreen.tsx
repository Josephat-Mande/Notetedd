import React, { useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { auth, db } from "../firebaseConfig"; // Import Firebase auth and Firestore
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Toast, { showToast } from "../toastConfig";

export default function AuthScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      showToast("error", "Error", "Please fill in all fields.");
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name in Firebase Auth
      await updateProfile(user, { displayName: fullName });

      // Save user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        createdAt: new Date().toISOString(),
      });

      showToast("success", "Success", "Account created successfully!");
      router.push("/LoginScreen"); // Navigate to the login screen
    } catch (error) {
      showToast("error", "Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Join NoteTedd</Text>
        <View>
          <View style={styles.inputContainer}>
            <Icon name="person" style={styles.icon} size={20} />
            <TextInput
              placeholder="Full Name"
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="email" style={styles.icon} size={20} />
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock" style={styles.icon} size={20} />
            <TextInput
              placeholder="Password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity onPress={handleSignUp} style={styles.button}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text onPress={() => router.push("/LoginScreen")} style={styles.footerLink}>
            Login
          </Text>
        </Text>
      </View>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "purple",
  },
  inputContainer: {
    position: "relative",
    marginBottom: 16,
  },
  icon: {
    position: "absolute",
    left: 8,
    top: 10,
    color: "gray",
  },
  input: {
    width: "100%",
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 8,
  },
  button: {
    width: "100%",
    backgroundColor: "purple",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    textAlign: "center",
    marginTop: 16,
    color: "gray",
  },
  footerLink: {
    color: "purple",
    fontWeight: "bold",
  },
});
