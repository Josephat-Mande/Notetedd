import React, { useState, useEffect, Fragment, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  ScrollView,
  Switch,
  Alert,
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
  Sun,
  ChevronRight,
  School,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import haptics from "./utils/haptics"; 
import { DollarSign, FileUp } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
  onThemeToggle?: () => void;
}

export default function Sidebar({ isOpen, onClose, theme = "light", onThemeToggle }: SidebarProps) {
  const navigation = useNavigation();
  const screenWidth = Dimensions.get("window").width;
  const slideAnim = useRef(new Animated.Value(-screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [profileName, setProfileName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("");
  const [isPremium, setIsPremium] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const isDark = theme === "dark";
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let name = user.displayName || user.email?.split("@")[0] || "User";
        setProfileEmail(user.email || "");

        if (!user.displayName) {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            const userData = docSnap.data();
            name = userData.username || name;
            setIsPremium(userData.isPremium || false);
          }
        }

        setProfileName(name);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -screenWidth,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, screenWidth]);

  const handleNavigation = (screen: string) => {
    haptics.impact('Light');
    navigation.navigate(screen as never);
    onClose();
  };

  const handleSignOut = () => {
    haptics.notification('Warning');
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              onClose();
              navigation.navigate("LoginScreen" as never);
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleThemeToggle = () => {
    haptics.impact('Medium');
    if (onThemeToggle) {
      onThemeToggle();
    }
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "My Profile", screen: "ProfileScreen", badge: null },
        { icon: Star, label: "Subscription", screen: "SubscriptionPlanScreen", badge: isPremium ? "PRO" : null },
        { icon: CreditCard, label: "Payment Methods", screen: "PaymentMethodsScreen", badge: null },
      ],
    },
    {
      title: "Content",
      items: [
        { icon: School, label: "Sync Classroom Notes", screen: "SyncClassroomScreen", badge: null },
        { icon: FileUp, label: "Upload File", screen: "UploadPDFScreen", badge: null },
        { icon: DollarSign, label: "Sell Notes", screen: "SellNotesScreen", badge: null },
      ],
    },
    {
      title: "Settings",
      items: [
        { icon: Laptop2, label: "Paired Devices", screen: "PairedDevicesScreen", badge: "2" },
        { icon: Bell, label: "Notifications", screen: "NotificationsScreen", badge: null,  },
        { icon: isDark ? Sun : Moon, label: "Dark Mode", screen: "", badge: null, toggle: true, isTheme: true },
        { icon: Shield, label: "Privacy", screen: "PrivacyScreen", badge: null },
        
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", screen: "HelpSupportScreen", badge: null },
      ],
    },
  ];

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <Animated.View 
          style={[
            styles.overlay, 
            { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <Animated.View 
        style={[
          styles.sidebar, 
          isDark ? styles.sidebarDark : styles.sidebarLight,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={isDark ? ["#1F2937", "#374151"] : ["#9B5DE5", "#7C3AED"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerPattern} />
          
          <View style={styles.headerTop}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <TouchableOpacity 
            style={styles.profileContainer}
            onPress={() => handleNavigation("ProfileScreen")}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={styles.profileIcon}
            >
              <Text style={styles.profileIconText}>{getInitials(profileName)}</Text>
            </LinearGradient>
            
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{profileName}</Text>
              <Text style={styles.profileEmail}>{profileEmail}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <MaterialIcons name="stars" size={12} color="#FFD700" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>

            <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Menu Sections */}
        <ScrollView 
          style={styles.menuScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuScrollContent}
        >
          {menuSections.map((section, sectionIndex) => (
            <Animated.View 
              key={section.title}
              style={[
                styles.menuSection,
                { 
                  opacity: fadeAnim,
                  transform: [{
                    translateX: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
                {section.title}
              </Text>
              
              {section.items.map((item, index) => (
                <Fragment key={item.label}>
                  {item.toggle ? (
                    <View style={[styles.menuItem, isDark && styles.menuItemDark]}>
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                          <item.icon 
                            size={20} 
                            color={isDark ? "#9CA3AF" : "#6B7280"} 
                          />
                        </View>
                        <Text style={[styles.menuItemText, isDark && styles.menuItemTextDark]}>
                          {item.label}
                        </Text>
                      </View>
                      
                      <Switch
                        value={item.isTheme ? isDark : notificationsEnabled}
                        onValueChange={item.isTheme ? handleThemeToggle : setNotificationsEnabled}
                        trackColor={{ false: "#D1D5DB", true: "#9B5DE5" }}
                        thumbColor="#FFFFFF"
                        ios_backgroundColor="#D1D5DB"
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => item.screen ? handleNavigation(item.screen) : null}
                      style={[styles.menuItem, isDark && styles.menuItemDark]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                          <item.icon 
                            size={20} 
                            color={isDark ? "#9CA3AF" : "#6B7280"} 
                          />
                        </View>
                        <Text style={[styles.menuItemText, isDark && styles.menuItemTextDark]}>
                          {item.label}
                        </Text>
                      </View>

                      <View style={styles.menuItemRight}>
                        {item.badge && (
                          <View style={[
                            styles.badge,
                            item.badge === "PRO" && styles.badgePro
                          ]}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                          </View>
                        )}
                        <ChevronRight 
                          size={18} 
                          color={isDark ? "#4B5563" : "#D1D5DB"} 
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                </Fragment>
              ))}
            </Animated.View>
          ))}

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.signOutButton]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#EF4444", "#DC2626"]}
              style={styles.signOutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <LogOut size={20} color="#fff" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
              Note Tedd v1.0.0
            </Text>
            <Text style={[styles.footerSubtext, isDark && styles.footerSubtextDark]}>
              Made with ❤️ for students
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 999,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    width: "85%",
    maxWidth: 320,
    zIndex: 1000,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sidebarLight: {
    backgroundColor: "#FFFFFF",
  },
  sidebarDark: {
    backgroundColor: "#1F2937",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  headerPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileIconText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  profileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  profileEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    gap: 4,
  },
  premiumText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "600",
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 12,
  },
  sectionTitleDark: {
    color: "#6B7280",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: "#F9FAFB",
  },
  menuItemDark: {
    backgroundColor: "rgba(55, 65, 81, 0.5)",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconContainerDark: {
    backgroundColor: "#374151",
  },
  menuItemText: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  menuItemTextDark: {
    color: "#E5E7EB",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#9B5DE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePro: {
    backgroundColor: "#F59E0B",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  signOutGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 10,
  },
  signOutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
  },
  footerTextDark: {
    color: "#6B7280",
  },
  footerSubtext: {
    color: "#D1D5DB",
    fontSize: 11,
    marginTop: 4,
  },
  footerSubtextDark: {
    color: "#4B5563",
  },
});