import React, { useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons"; // Use the general Icon import
import { useRouter } from "expo-router";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSubmit = () => {
    router.push("/HomeScreen"); // Navigate to the home route
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>{isLogin ? "Welcome Back!" : "Join NoteTedd"}</Text>
        <View>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Icon name="person" style={styles.icon} size={20} /> {/* Used the person icon */}
              <TextInput
                placeholder="Full Name"
                style={styles.input}
              />
            </View>
          )}
          <View style={styles.inputContainer}>
            <Icon name="email" style={styles.icon} size={20} /> {/* Used the email icon */}
            <TextInput
              placeholder="Email"
              style={styles.input}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputContainer}>
            <Icon name="lock" style={styles.icon} size={20} /> {/* Used the lock icon */}
            <TextInput
              placeholder="Password"
              style={styles.input}
              secureTextEntry
            />
          </View>
          <TouchableOpacity onPress={handleSubmit} style={styles.button}>
            <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Text
            onPress={() => setIsLogin(!isLogin)}
            style={styles.footerLink}
          >
            {isLogin ? "Sign Up" : "Login"}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(to bottom, purple, teal)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: 'purple',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  icon: {
    position: 'absolute',
    left: 8,
    top: 10,
    color: 'gray',
  },
  input: {
    width: '100%',
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 8,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
  },
  button: {
    width: '100%',
    backgroundColor: 'purple',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 16,
    color: 'gray',
  },
  footerLink: {
    color: 'purple',
    fontWeight: 'bold',
  },
});
