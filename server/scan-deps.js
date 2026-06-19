const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const deps = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
const builtins = ['fs','path','crypto','http','https','os','events','stream','util','buffer','url','querystring','zlib','net','tls','child_process','cluster','dns','domain','readline','repl','vm','assert','timers','console','process','module'];

function scanDir(dir) {
  const files = fs.readdirSync(dir, {withFileTypes: true});
  files.forEach(f => {
    if (f.isDirectory() && !f.name.startsWith('.') && f.name !== 'node_modules') {
      scanDir(path.join(dir, f.name));
    } else if (f.name.endsWith('.js')) {
      const content = fs.readFileSync(path.join(dir, f.name), 'utf8');
      const requires = [...content.matchAll(/require\(['"]([a-zA-Z@][^'"\/]*)/g)].map(m => m[1]);
      requires.forEach(r => {
        if (!deps.includes(r) && !builtins.includes(r)) {
          console.log('MISSING:', r, 'in', path.join(dir, f.name).replace(process.cwd(), ''));
        }
      });
    }
  });
}

scanDir('./src');
console.log('Scan complete.');
