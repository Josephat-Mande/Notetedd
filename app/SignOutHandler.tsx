// signOutHandler.js
import { getAuth, signOut } from "firebase/auth";
import { Alert } from "react-native";

export async function handleSignOut(navigation) {
  const auth = getAuth();
  try {
    await signOut(auth);
    // Navigate to your login screen or landing page
    navigation.reset({
      index: 0,
      routes: [{ name: "LoginScreen" }],
    });
  } catch (error) {
    Alert.alert("Error", "Could not sign out. Please try again.");
  }
}
