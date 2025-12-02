module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    require.resolve("expo-router/babel"),
    'react-native-reanimated/plugin',
  ],
};