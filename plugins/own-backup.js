// plugins/sys-backup.js
// .backup — ZIP project (exclude node_modules, session(s)/seassion, npm, package-lock.json, etc) and send as document

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const fg = require('fast-glob');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const IGNORE_DIRS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.github/**',
  '**/.cache/**',
  '**/cache/**',
  '**/tmp/**',
  '**/temp/**',
  '**/npm/**',
  '**/session/**',
  '**/sessions/**',
  '**/seassion/**',        // common typo
];

const IGNORE_FILES_CASE = [
  'package-lock.json', 'Package-lock.json', 'PACKAGE-LOCK.JSON',
  'yarn.lock', 'pnpm-lock.yaml', 'nohup.out',
  '*.log'
];

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function collectFiles(root) {
  // patterns: include all files, then exclude specific filenames (case variants)
  const patterns = ['**/*', ...IGNORE_FILES_CASE.map(f => `!**/${f}`)];
  const list = await fg(patterns, {
    cwd: root,
    onlyFiles: true,
    dot: true,
    followSymbolicLinks: false,
    ignore: IGNORE_DIRS,
  });
  return list;
}

async function zipProject(srcDir, outZipPath, baseDirName) {
  await ensureDir(path.dirname(outZipPath));

  const files = await collectFiles(srcDir);
  if (!files.length) throw new Error('Tidak ada file yang bisa dibackup (semua terabaikan).');

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outZipPath);
    const arc = archiver('zip', { zlib: { level: 9 } });

    out.on('close', resolve);
    arc.on('warning', (err) => (err.code === 'ENOENT' ? console.warn('[backup warning]', err.message) : reject(err)));
    arc.on('error', reject);

    arc.pipe(out);
    for (const rel of files) {
      const abs = path.join(srcDir, rel);
      const name = baseDirName ? path.join(baseDirName, rel) : rel;
      arc.file(abs, { name });
    }
    arc.finalize();
  });

  const stat = await fs.promises.stat(outZipPath);
  return stat.size;
}

async function handler(ctx) {
  try {
    const text = String(ctx.text || '');
    if (!/^[.!]backup\b/i.test(text)) return;

    if (ctx.role !== 'owner') {
      return ctx.reply('Fitur ini khusus Owner.');
    }

    await ctx.reply('⏳ Menyiapkan arsip backup…');

    const projectRoot = process.cwd();
    const baseName = path.basename(projectRoot) || 'project';
    const outDir = path.join(projectRoot, 'backups');
    const fileName = `backup-${ts()}.zip`;
    const outPath = path.join(outDir, fileName);

    const t0 = Date.now();
    const bytes = await zipProject(projectRoot, outPath, baseName);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const sizeMB = (bytes / (1024 * 1024)).toFixed(2);

    // send as Buffer to avoid stream-related toString errors
    const buffer = await fs.promises.readFile(outPath);

    await ctx.client.sendMessage(ctx.from, {
      document: buffer,
      fileName,
      mimetype: 'application/zip',
      caption: [
        '《 Backup Selesai 》',
        `- Nama : ${fileName}`,
        `- Ukuran : ${sizeMB} MB`,
        `- Waktu  : ${dt}s`,
      ].join('\n')
    }, { quoted: ctx.message });

  } catch (e) {
    // echo exact error so you can see root cause
    const msg = e && e.message ? e.message : String(e);
    await ctx.reply(`❌ Gagal membuat backup: ${msg}`);
  }
}

// metadata
handler.command  = (ctx) => /^[.!]backup\b/i.test(ctx.text || '');
handler.role     = 'owner';
handler.scope    = 'all';
handler.enabled  = true;
handler.key      = 'sys_backup';
handler.tags     = ['system','owner'];
handler.cost     = 0;
handler.help     = ['.backup — arsipkan project (skip node_modules, session, npm, package-lock.json)'];

module.exports = handler;