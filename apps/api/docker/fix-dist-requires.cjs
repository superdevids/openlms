#!/usr/bin/env node
/**
 * fix-dist-requires.cjs — perbaiki path require @opensis di output dist NestJS.
 *
 * LATAR BELAKANG (hasil verifikasi build nyata):
 * - tsconfig.base.json memetakan `@opensis/database` dan `@opensis/types` ke
 *   `./packages/database/src` dan `./packages/types/src` (source TypeScript).
 *   nest build memakai rootDir "../..", sehingga source package ikut
 *   ter-kompilasi ke apps/api/dist/packages/<pkg>/src.
 * - `tsc-alias` (dijalankan setelah nest build) menulis ulang `@opensis/...`
 *   menjadi path relatif TANPA akhiran target: `require("../../../../..")`
 *   yang resolve ke `apps/api/dist` -> MODULE_NOT_FOUND saat runtime.
 *   (Opsi --resolve-full-paths tidak memperbaikinya.)
 * - Script ini mengembalikan require tersebut ke path relatif yang benar
 *   menuju dist/packages/<pkg>/src/index.js. Package asal ditentukan dari
 *   source .ts (urutan value-import @opensis sama dengan urutan require
 *   di output; import type tidak menghasilkan require).
 *
 * DETERMINISME: jika jumlah value-import != jumlah require rusak, script
 * EXIT 1 (gagalkan build) — tidak pernah menebak.
 *
 * Dipanggil di apps/api/Dockerfile setelah `nest build && tsc-alias`.
 * Idempotent: build kedua tidak menemukan require rusak -> no-op.
 */
"use strict";

const fs = require("fs");
const path = require("path");

// Lokasi script: apps/api/docker/fix-dist-requires.cjs -> repo root = 3 level up.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const DIST_ROOT = path.join(REPO_ROOT, "apps", "api", "dist");

const isBrokenRequire = (spec) => /^\.\.(\/\.\.)*$/.test(spec);

/** Semua file .js di bawah dir (rekursif). */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".js")) out.push(p);
  }
  return out;
}

/**
 * Value-import `@opensis/<pkg>` dalam urutan kemunculan.
 * - Memproses per-statement import (dibatasi `;`) agar `[\s\S]*?` tidak
 *   melintasi beberapa statement sekaligus.
 * - Melewatkan `import type { ... }` (tidak menghasilkan require).
 * - Menangani import multi-baris dan `{ type X, y }` (count = require).
 */
function opensisValueImports(tsContent) {
  const out = [];
  const stmtRe = /import\s+[^;]+;/g;
  const pkgRe = /from\s+["']@opensis\/([^"']+)["']/;
  let s;
  while ((s = stmtRe.exec(tsContent)) !== null) {
    const stmt = s[0];
    if (/^import\s+type\b/.test(stmt.trimStart())) continue;
    const pm = stmt.match(pkgRe);
    if (pm) out.push(pm[1]);
  }
  return out;
}

/** Posisi (index) semua require di konten JS. */
function requireMatches(jsContent) {
  const matches = [];
  const re = /require\("([^"]+)"\)/g;
  let m;
  while ((m = re.exec(jsContent)) !== null) {
    matches.push({ index: m.index, end: m.index + m[0].length, spec: m[1] });
  }
  return matches;
}

function main() {
  if (!fs.existsSync(DIST_ROOT)) {
    console.error(`[fix-dist-requires] dist tidak ditemukan: ${DIST_ROOT}`);
    process.exit(1);
  }

  const files = walk(DIST_ROOT);
  let fixedFiles = 0;
  let fixedRequires = 0;

  for (const jsFile of files) {
    const js = fs.readFileSync(jsFile, "utf8");
    const matches = requireMatches(js);
    const broken = matches.filter((m) => isBrokenRequire(m.spec));
    if (broken.length === 0) continue;

    // Sumber .ts dari source map (sources[0]).
    const mapPath = jsFile + ".map";
    let srcAbs = null;
    if (fs.existsSync(mapPath)) {
      try {
        const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
        if (map.sources && map.sources[0]) {
          srcAbs = path.resolve(path.dirname(jsFile), map.sources[0]);
        }
      } catch {
        /* map rusak -> tetap gagal di bawah */
      }
    }
    if (!srcAbs || !fs.existsSync(srcAbs)) {
      console.error(
        `[fix-dist-requires] GAGAL: tidak ada source .ts untuk ${path.relative(REPO_ROOT, jsFile)}`
      );
      process.exit(1);
    }

    const ts = fs.readFileSync(srcAbs, "utf8");
    const valueImports = opensisValueImports(ts);

    if (valueImports.length !== broken.length) {
      console.error(
        `[fix-dist-requires] GAGAL: jumlah value-import @opensis/* (${valueImports.length}) ` +
          `!= jumlah require rusak (${broken.length}) di ${path.relative(REPO_ROOT, jsFile)}. ` +
          `Cek source: ${path.relative(REPO_ROOT, srcAbs)}`
      );
      process.exit(1);
    }

    // Hitung path target untuk tiap require rusak (urut) lalu splice dari belakang.
    const replacements = [];
    for (let i = 0; i < broken.length; i++) {
      const pkg = valueImports[i];
      const target = path.join(DIST_ROOT, "packages", pkg, "src", "index.js");
      if (!fs.existsSync(target)) {
        console.error(
          `[fix-dist-requires] GAGAL: target tidak ada: ${target} (dibutuhkan oleh ${jsFile})`
        );
        process.exit(1);
      }
      const rel = path.relative(path.dirname(jsFile), target).replace(/\\/g, "/");
      replacements.push({ index: broken[i].index, end: broken[i].end, rel });
    }

    // Splice dari indeks terbesar agar posisi tetap valid.
    let fixed = js;
    for (const r of [...replacements].sort((a, b) => b.index - a.index)) {
      fixed = fixed.slice(0, r.index) + `require("${r.rel}")` + fixed.slice(r.end);
    }

    fs.writeFileSync(jsFile, fixed, "utf8");
    fixedFiles++;
    fixedRequires += replacements.length;
  }

  console.log(
    `[fix-dist-requires] selesai: ${fixedRequires} require diperbaiki di ${fixedFiles} file (dist: ${DIST_ROOT})`
  );
}

main();
