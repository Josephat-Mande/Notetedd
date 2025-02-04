import React from "react";
import { View } from "react-native";
import { Slot, useRouter } from "expo-router";
import "../app.css";
import Navigation from "./Navigation";

export default function Layout() {
  const router = useRouter();

  // Safely access pathname
  const pathname = router.pathname || "";
  const showNavigation = !pathname.includes("/auth") && pathname !== "/";

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Render the child components */}
      <Slot />
      
      {/* Conditionally render the navigation bar */}
      {showNavigation && <Navigation />}
    </View>
  );
}
