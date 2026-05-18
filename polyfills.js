// Must run before any module initialization — fixes FormData ReferenceError on Hermes / RN 0.81
if (typeof global.FormData === 'undefined') {
  global.FormData = require('react-native/Libraries/Network/FormData');
}
