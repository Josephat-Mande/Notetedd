import React from "react";
import { useRouter, usePathname } from "expo-router";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export  default function Navigation() {
  const router = useRouter();
  const pathname = usePathname() || ""; // Ensure pathname is never undefined

  const navItems = [
    {
      icon: "home",
      path: "/HomeScreen",
      label: "Home",
    },
    {
      icon: "microphone",
      path: "/RecordScreen",
      label: "Record",
    },
    {
      icon: "notebook-outline",
      path: "/NotesScreen",
      label: "Notes",
    },
    {
      icon: "headphones",
      path: "/AudioNotesScreen",
      label: "Audio",
    },
    {
      icon: "translate",
      path: "/TranslateScreen",
      label: "Translate",
    },
    {
      icon: "brain",
      path: "/QuizScreen",
      label: "Quiz",
    },
  ];

  return (
    <View style={styles.navContainer}>
      <View style={styles.navItems}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(item.path)}
            style={styles.navItem}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={pathname === item.path ? "#6B46C1" : "#6B7280"} // Purple for active, gray for inactive
            />
            <Text
              style={[
                styles.navLabel,
                pathname === item.path ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB", // Light gray border
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  navItems: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 400,
    alignSelf: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  navLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  activeLabel: {
    color: "#6B46C1", // Purple
  },
  inactiveLabel: {
    color: "#6B7280", // Gray
  },
});
