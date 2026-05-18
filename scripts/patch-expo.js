const fs = require('fs');
const path = require('path');

const runtimePath = path.join(__dirname, '..', 'node_modules', 'expo', 'src', 'winter', 'runtime.native.ts');

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
    console.log('patched: expo/src/winter/runtime.native.ts');
  } else {
    console.log('skip: runtime.native.ts already patched or target not found');
  }
}

patchRuntime();
