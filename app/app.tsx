import React, { Component, ReactNode, useEffect } from "react";
import 'nativewind'; // Import NativeWind's tailwind CSS setup

import { Slot } from "expo-router/build";
import Toast from "react-native-toast-message";
import { View, Text, Platform } from "react-native";

import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';


import HomeScreen from './HomeScreen';

import ProfileScreen from './ProfileScreen';
import RecordScreen from "./RecordScreen";
import NotesScreen from "./NotesScreen";
import PairedDevicesScreen from "./PairedDevicesScreen";
import PrintNotesScreen from "./PrintNotesScreen";
import ExportNotesScreen from "./ExportNotesScreen";
import PrivacyScreen from "./PrivacyScreen";
import UploadPDFScreen from "./UploadPDFScreen";
import HelpSupportScreen from "./HelpSupportScreen";
import PrefferencesScreen from "./PrefferencesScreen";
import DarkModeScreen from "./DarkModeScreen";
import NotificationsScreen from "./NotificationsScreen";
import PaymentMethodsScreen from "./PaymentMethodsScreen";
import SubscriptionPlanScreen from "./SubscriptionPlanScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";

import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(); // optional




// ==================== ERROR BOUNDARY ====================
interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || 'Unknown error occurred',
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
            Oops! Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            {this.state.errorMessage}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
            Please restart the app or contact support.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// ==================== GLOBAL ERROR HANDLER ====================
const originalErrorHandler = ErrorUtils.getGlobalHandler?.();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Global error:', error, 'isFatal:', isFatal);
  // Still call original handler if it exists
  if (originalErrorHandler) {
    originalErrorHandler(error, isFatal);
  }
});

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.log('Service Worker registration failed:', error);
          });
      }
    }
  }, []);

  // Your app code here
  
    // Your app components
  
  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Slot />
        <Toast /> {/* Toast message */}
        <Stack.Navigator initialRouteName="HomeScreen">
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="RecordScreen" component={RecordScreen} />
          <Stack.Screen name="NotesScreen" component={NotesScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="PairedDevicesScreen" component={PairedDevicesScreen} />
          <Stack.Screen name="SubscriptionPlanScreen" component={SubscriptionPlanScreen} />
          <Stack.Screen name="PaymentMethodsScreen" component={PaymentMethodsScreen} />
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="HelpSupportScreen" component={HelpSupportScreen} />
          <Stack.Screen name="PrintNotesScreen" component={PrintNotesScreen} />
          <Stack.Screen name="ExportNotesScreen" component={ExportNotesScreen} />
          <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} />
          <Stack.Screen name="UploadPDFScreen" component={UploadPDFScreen} />
          <Stack.Screen name="PrefferencesScreen" component={PrefferencesScreen} />
          <Stack.Screen name="DarkModeScreen" component={DarkModeScreen} />
          <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );

  
}
