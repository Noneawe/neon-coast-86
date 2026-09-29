// Bundles index.html + all ES modules from src/ into a single self-contained
// dist/neon-coast.html that runs from file://. Uses only built-in Node modules.
// Each module is wrapped in its own function scope, so top-level names never clash.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY_HTML = resolve(ROOT, 'index.html');
const OUT_DIR = resolve(ROOT, 'dist');
const OUT_FILE = resolve(OUT_DIR, 'neon-coast.html');
const MAX_SIZE = 1024 * 1024;

const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(const|let|function\*?|class|async\s+function)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]*)\}\s*;?[ \t]*$/gm;

function varName(file) {
  return '__m_' + relative(ROOT, file).replace(/[^A-Za-z0-9]/g, '_');
}

function parseSpecifiers(spec, target, file) {
  const s = spec.trim();
  const ns = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/.exec(s);
  if (ns) return `const ${ns[1]} = ${target};`;
  const named = /^\{([\s\S]*)\}$/.exec(s);
  if (!named) throw new Error(`${file}: unsupported import form "${s}" (use named imports)`);
  const parts = named[1].split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(p);
    if (!m) throw new Error(`${file}: bad import specifier "${p}"`);
    return m[2] ? `${m[1]}: ${m[2]}` : m[1];
  });
  return `const { ${parts.join(', ')} } = ${target};`;
}

function transformModule(file, modules, order, visiting) {
  if (modules.has(file)) return;
  if (visiting.has(file)) throw new Error(`Circular import involving ${relative(ROOT, file)}`);
  visiting.add(file);
  let src = readFileSync(file, 'utf8');
  if (/^export\s+default\b/m.test(src)) throw new Error(`${relative(ROOT, file)}: default exports are not supported`);
  if (/\bimport\s*\(/.test(src)) throw new Error(`${relative(ROOT, file)}: dynamic import is not supported`);

  const header = [];
  src = src.replace(IMPORT_RE, (_, spec, path) => {
    const dep = resolve(dirname(file), path);
    transformModule(dep, modules, order, visiting);
    header.push(parseSpecifiers(spec, varName(dep), relative(ROOT, file)));
    return '';
  });

  const exportsList = [];
  src = src.replace(EXPORT_DECL_RE, (_, kind, name) => {
    exportsList.push(name);
    return `${kind} ${name}`;
  });
  src = src.replace(EXPORT_LIST_RE, (_, list) => {
    for (const p of list.split(',').map((x) => x.trim()).filter(Boolean)) {
      const m = /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(p);
      if (!m) throw new Error(`${relative(ROOT, file)}: bad export specifier "${p}"`);
      exportsList.push(m[2] ? `${m[2]}: ${m[1]}` : m[1]);
    }
    return '';
  });
  if (/^\s*export\b/m.test(src)) throw new Error(`${relative(ROOT, file)}: unsupported export form`);
  if (/^\s*import\b/m.test(src)) throw new Error(`${relative(ROOT, file)}: unsupported import form`);

  const body = [
    `// ---- ${relative(ROOT, file)} ----`,
    `const ${varName(file)} = (() => {`,
    ...header,
    src.trim(),
    `return Object.freeze({ ${exportsList.join(', ')} });`,
    '})();',
  ].join('\n');
  visiting.delete(file);
  modules.set(file, body);
  order.push(file);
}

function build() {
  const html = readFileSync(ENTRY_HTML, 'utf8');
  const tagRe = /<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/;
  const tag = tagRe.exec(html);
  if (!tag) throw new Error('index.html: module script tag not found');
  const entry = resolve(ROOT, tag[1]);

  const modules = new Map();
  const order = [];
  transformModule(entry, modules, order, new Set());
  const bundle = `(() => {\n'use strict';\n${order.map((f) => modules.get(f)).join('\n\n')}\n})();`;
  new vm.Script(bundle, { filename: 'neon-coast.bundle.js' }); // syntax check

  const safe = bundle.replace(/<\/script/gi, '<\\/script');
  const out = html.replace(tagRe, () => `<script>\n${safe}\n</script>`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, out);
  const size = Buffer.byteLength(out);
  if (size > MAX_SIZE) throw new Error(`Build too large: ${size} bytes (limit ${MAX_SIZE})`);
  process.stdout.write(`Built ${relative(ROOT, OUT_FILE)}: ${order.length} modules, ${(size / 1024).toFixed(1)} KB\n`);
}

try {
  build();
} catch (err) {
  process.stderr.write(`Build failed: ${err.message}\n`);
  process.exit(1);
}
