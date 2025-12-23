const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  maxWorkers: 1, // Limit workers on Windows
};

module.exports = config;