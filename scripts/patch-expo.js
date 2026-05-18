const fs = require('fs');
const path = require('path');

const appEntryPath = path.join(__dirname, '..', 'node_modules', 'expo', 'AppEntry.js');
const runtimePath = path.join(__dirname, '..', 'node_modules', 'expo', 'src', 'winter', 'runtime.native.ts');

const patchedAppEntry = [
  '// FormData polyfill — must run before expo/winter initializes.',
  '// Expo Go SDK 54 + RN 0.81 New Architecture does not expose FormData as a',
  '// bare global in Hermes at module-load time, causing a ReferenceError.',
  'if (typeof global.FormData === \'undefined\') {',
  '  global.FormData = require(\'react-native/Libraries/Network/FormData\').default;',
  '}',
  '',
  'const registerRootComponent = require(\'expo/src/launch/registerRootComponent\').default;',
  'const App = require(\'../../App\').default;',
  '',
  'registerRootComponent(App);',
].join('\n');

function patchAppEntry() {
  if (!fs.existsSync(appEntryPath)) {
    console.log('skip: expo/AppEntry.js not found');
    return;
  }
  fs.writeFileSync(appEntryPath, patchedAppEntry, 'utf8');
  console.log('patched: node_modules/expo/AppEntry.js');
}

function patchRuntime() {
  if (!fs.existsSync(runtimePath)) {
    console.log('skip: expo/src/winter/runtime.native.ts not found');
    return;
  }
  let content = fs.readFileSync(runtimePath, 'utf8');
  const target = 'installFormDataPatch(FormData);';
  const replacement = [
    '// Guard against missing global.FormData on Hermes/New Architecture.',
    'if (typeof global.FormData !== \'undefined\') {',
    '  installFormDataPatch(global.FormData);',
    '}',
  ].join('\n');

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(runtimePath, content, 'utf8');
    console.log('patched: node_modules/expo/src/winter/runtime.native.ts');
  } else {
    console.log('skip: runtime.native.ts already patched or target not found');
  }
}

patchAppEntry();
patchRuntime();
