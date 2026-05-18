// require() only — no import, execution order is guaranteed by Metro
// FormData must be patched before expo-modules-core loads
if (typeof global.FormData === 'undefined') {
  global.FormData = require('react-native/Libraries/Network/FormData').default;
}

const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);
