// app/_layout.tsx
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Slot, useRouter, usePathname } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
// import DrawerLayout from "./drawer"; // Ensure this path is correct

export default function Layout() {
  const router = useRouter();
  const pathname = usePathname() || "";

  // Define paths where the bottom navigation should be hidden.
  const hiddenPaths = ["/SplashScreen", "/LoginScreen", "/AuthScreen"];

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Render the page content from Expo Router */}
      <Slot />

      {/* Render the global drawer navigator */}
      {/* <DrawerLayout /> */}

      {/* Bottom Navigation Bar */}
      {!hiddenPaths.includes(pathname) && (
        <View style={styles.container}>
          <View style={styles.navContainer}>
            <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} style={styles.navGradient}>
              <View style={styles.navItems}>
                {navItems.map((item) => (
                  <TouchableOpacity
                    key={item.path}
                    onPress={() => router.push(item.path)}
                    style={styles.navItem}
                  >
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={28}
                      color={pathname === item.path ? "#4F46E5" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        pathname === item.path ? styles.activeLabel : styles.inactiveLabel,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {pathname === item.path && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>
      )}
    </View>
  );
}

const navItems = [
  { icon: "home", path: "/HomeScreen", label: "Home" },
  { icon: "microphone", path: "/RecordScreen", label: "Record" },
  { icon: "notebook-outline", path: "/NotesScreen", label: "Notes" },
  { icon: "headphones", path: "/AudioNotesScreen", label: "Audio" },
  { icon: "translate", path: "/TranslateScreen", label: "Translate" },
  { icon: "brain", path: "/QuizScreen", label: "Quiz" },
];

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    alignItems: "center",
  },
  navContainer: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navGradient: {
    borderRadius: 30,
  },
  navItems: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  navLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  activeLabel: {
    color: "#4F46E5",
  },
  inactiveLabel: {
    color: "#6B7280",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -5,
    height: 4,
    width: 4,
    borderRadius: 2,
    backgroundColor: "#4F46E5",
  },
});
