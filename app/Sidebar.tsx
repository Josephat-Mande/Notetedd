import React, { useState, useEffect, Fragment } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  User,
  Download,
  Laptop2,
  Printer,
  Upload,
  CreditCard,
  Star,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Moon,
  Shield,
} from "lucide-react-native"; // Ensure using lucide-react-native
import { useNavigation } from "@react-navigation/native";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigation = useNavigation();
  const screenWidth = Dimensions.get("window").width;
  const slideAnim = React.useRef(new Animated.Value(-screenWidth)).current;
  const [profileName, setProfileName] = useState("User"); // Default fallback

  const auth = getAuth();
  const db = getFirestore();

  // Fetch the logged-in user's name from Firebase Auth & Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let name = user.displayName || user.email?.split("@")[0] || "User";

        // Fetch from Firestore if displayName is missing
        if (!user.displayName) {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            name = docSnap.data().username || name;
          }
        }

        setProfileName(name);
      }
    });

    return () => unsubscribe();
  }, []);

  // Animate the sidebar sliding in/out
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -screenWidth,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isOpen, screenWidth]);

  // Navigate to a screen and then close the sidebar
  const handleNavigation = (screen: string) => {
    navigation.navigate(screen as never); // Type assertion for TypeScript
    onClose();
  };

  const menuItems = [
    { icon: User, label: "My Profile", screen: "ProfileScreen" },
    { icon: Download, label: "Export Notes", screen: "ExportNotesScreen" },
    { icon: Upload, label: "Upload PDF", screen: "UploadPDFScreen" },
    { icon: Printer, label: "Print Notes", screen: "PrintNotesScreen" },
    { icon: Laptop2, label: "Paired Devices", screen: "PairedDevicesScreen" },
    { icon: Star, label: "Subscription Plan", screen: "SubscriptionPlanScreen" },
    { icon: CreditCard, label: "Payment Methods", screen: "PaymentMethodsScreen" },
    { icon: Bell, label: "Notifications", screen: "NotificationsScreen" },
    { icon: Moon, label: "Dark Mode", screen: "" }, // Implement toggle logic if needed
    { icon: Shield, label: "Privacy", screen: "PrivacyScreen" },
    { icon: Settings, label: "Preferences", screen: "PreferencesScreen" },
    { icon: HelpCircle, label: "Help & Support", screen: "HelpSupportScreen" },
    { icon: LogOut, label: "Sign Out", screen: "", danger: true },
  ];

  return (
    <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.menuTitle}>Menu</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileIconText}>
            {profileName.substring(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{profileName}</Text>
          <Text style={styles.profilePlan}>Premium Plan</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <Fragment key={item.label}>
            <TouchableOpacity
              onPress={() => {
                if (item.screen) {
                  handleNavigation(item.screen);
                } else {
                  console.log(item.label);
                  onClose();
                }
              }}
              style={[styles.menuItem, item.danger && styles.dangerMenuItem]}
            >
              <item.icon size={20} color={item.danger ? "#fff" : "#E5E7EB"} />
              <Text style={[styles.menuItemText, item.danger && styles.dangerText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </Fragment>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Note Tedd v1.0.0</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    width: "75%",
    backgroundColor: "#1F2937",
    paddingVertical: 20,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    padding: 10,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  profileIconText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  profileDetails: {
    marginLeft: 15,
  },
  profileName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  profilePlan: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  dangerMenuItem: {
    backgroundColor: "#DC2626",
  },
  menuItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#E5E7EB",
  },
  dangerText: {
    color: "#fff",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#374151",
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 12,
  },
});
