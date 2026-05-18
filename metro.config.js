const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.serializer = {
  ...config.serializer,
  polyfillModuleNames: [
    ...((config.serializer && config.serializer.polyfillModuleNames) || []),
    require.resolve('./polyfills.js'),
  ],
};

module.exports = config;
