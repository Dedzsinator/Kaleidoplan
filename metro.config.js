const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add resolution for web-specific modules
config.resolver.resolverMainFields = ['browser', 'main'];

// Add platform-specific extensions
config.resolver.sourceExts = process.env.RN_SRC_EXT
  ? [...process.env.RN_SRC_EXT.split(',').concat(config.resolver.sourceExts), 'web.js', 'web.ts', 'web.tsx']
  : [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

module.exports = config;