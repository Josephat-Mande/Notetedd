module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // plugins: [
    //   "expo-router/babel", // ✅ Add this line for Expo Router
    //   [
    //     "inline-dotenv",
    //     {
    //       path: ".env", // ✅ Ensure correct .env file path
    //       systemvars: true, // ✅ Allow system environment variables
    //     },
    //   ],
    // ],
  };
};
