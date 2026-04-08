// Patch react-dom-test-utils for React 19 compatibility.
// React 19 removed act() from CJS exports but @testing-library/react still calls it.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', 'react-dom', 'cjs', 'react-dom-test-utils.production.js');
if (!fs.existsSync(file)) {
  console.log('[patch-react-act] File not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(file, 'utf8');
const patched = content.replace('return React.act(callback);', 'return callback();');
if (patched !== content) {
  fs.writeFileSync(file, patched);
  console.log('[patch-react-act] Patched react-dom-test-utils.production.js');
} else {
  console.log('[patch-react-act] Already patched or no match');
}
