import React from "react";
import 'nativewind'; // Import NativeWind's tailwind CSS setup

import { Slot } from "expo-router/build";
import Toast from "react-native-toast-message";

import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from './HomeScreen';

import ProfileScreen from './ProfileScreen';
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


const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Slot />
      
      <Toast/> {/* Toast message */}
      <Stack.Navigator initialRouteName="HomeScreen">
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
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
        
        {/* Add all other screens here */}
      </Stack.Navigator>
       
    </div>
  );
}
