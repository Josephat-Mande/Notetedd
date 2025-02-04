import React from "react";
import 'nativewind'; // Import NativeWind's tailwind CSS setup

import { Slot } from "expo-router/build";

export default function App() {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Slot />
    </div>
  );
}
