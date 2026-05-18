// FormData polyfill must run before expo-modules-core loads on Hermes/RN 0.81
if (typeof global.FormData === 'undefined') {
  global.FormData = require('react-native/Libraries/Network/FormData').default;
}

require('expo-router/entry');
