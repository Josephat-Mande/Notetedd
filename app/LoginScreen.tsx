import React, { useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { auth, db } from "../firebaseConfig"; // Import Firebase authentication and Firestore
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Toast, { showToast } from "../toastConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("error", "Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      // Authenticate user with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user's full name from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const fullName = userData.fullName || "User";

        // Show welcome toast message
        showToast("success", "Welcome Back!", `Hello, ${fullName}!`);

        // Navigate to HomeScreen and pass the username
        router.push({ pathname: "/HomeScreen", params: { username: fullName } });
      } else {
        showToast("error", "Error", "User not found .");
      }
    } catch (error) {
      showToast("error", "Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <View>
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
          <TouchableOpacity onPress={handleLogin} style={styles.button} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>
          Don't have an account?{" "}
          <Text onPress={() => router.push("/AuthScreen")} style={styles.footerLink}>
            Sign Up
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

