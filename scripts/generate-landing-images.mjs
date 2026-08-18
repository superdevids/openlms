/**
 * generate-landing-images.mjs
 *
 * Utilitas gambar asli landing (item 16 UI v2): menggantikan ilustrasi SVG
 * playful dengan foto/placeholder raster JPG di apps/web/public/landing/school/.
 *
 * Cara pakai (dari root workspace — sharp sudah tersedia via node_modules):
 *   node scripts/generate-landing-images.mjs
 *
 * Teknik: komposisi SVG (gradasi langit, gedung, pohon, dsb.) dirender oleh
 * sharp → JPEG kualitas 80. Bukan foto nyata — placeholder foto yang
 * profesional dan siap diganti foto asli sekolah tanpa mengubah kode.
 * Ukuran: hero 1600x900, lainnya 800x600.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../apps/web/public/landing/school");

// ============================================================
// Helper SVG
// ============================================================

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#3b82f6"/>
  <stop offset="55%" stop-color="#7cc4f8"/>
  <stop offset="100%" stop-color="#d9effc"/>
</linearGradient>
<linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#6366f1"/>
  <stop offset="60%" stop-color="#93c5fd"/>
  <stop offset="100%" stop-color="#fcd9a0"/>
</linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#4ade80"/>
  <stop offset="100%" stop-color="#16a34a"/>
</linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#fdfbf7"/>
  <stop offset="100%" stop-color="#e8e2d6"/>
</linearGradient>
<linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#475569"/>
  <stop offset="100%" stop-color="#1e293b"/>
</linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#a5f3fc"/>
  <stop offset="100%" stop-color="#7dd3fc"/>
</linearGradient>
<linearGradient id="interiorWall" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#f4f0e6"/>
  <stop offset="100%" stop-color="#ddd5c2"/>
</linearGradient>
<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0%" stop-color="#fff7d6"/>
  <stop offset="60%" stop-color="#ffe9a8" stop-opacity="0.9"/>
  <stop offset="100%" stop-color="#ffe9a8" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
  <stop offset="62%" stop-color="#000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#0b1e3a" stop-opacity="0.28"/>
</radialGradient>
<filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
  <feOffset dx="0" dy="6"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
</defs>
${body}
</svg>`;

const rect = (x, y, w, h, fill, opts = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${opts}/>`;

const circle = (cx, cy, r, fill, opts = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${opts}/>`;

const ellipse = (cx, cy, rx, ry, fill, opts = "") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${opts}/>`;

const poly = (points, fill, opts = "") => `<polygon points="${points}" fill="${fill}" ${opts}/>`;

/** Awan lembut: 3 lingkaran + alas persegi. */
function cloud(cx, cy, s, opacity = 0.9) {
  return `<g fill="#ffffff" opacity="${opacity}">
    ${ellipse(cx, cy, s * 1.35, s * 0.55)}
    ${circle(cx - s * 0.55, cy - s * 0.18, s * 0.42)}
    ${circle(cx + s * 0.5, cy - s * 0.22, s * 0.5)}
    ${circle(cx + s * 0.05, cy - s * 0.48, s * 0.4)}
  </g>`;
}

/** Pohon: batang + tajuk berlapis. */
function tree(x, baseY, s) {
  return `<g>
    ${rect(x - s * 0.07, baseY - s * 0.55, s * 0.14, s * 0.55, "#7c4a21")}
    ${circle(x, baseY - s * 0.85, s * 0.42, "#2f9e44", 'opacity="0.9"')}
    ${circle(x - s * 0.22, baseY - s * 0.6, s * 0.34, "#37b24d", 'opacity="0.9"')}
    ${circle(x + s * 0.2, baseY - s * 0.62, s * 0.36, "#2b8a3e", 'opacity="0.9"')}
  </g>`;
}

/** Semak kecil. */
function bush(x, baseY, s) {
  return `<g>
    ${circle(x, baseY, s * 0.3, "#2f9e44", 'opacity="0.95"')}
    ${circle(x - s * 0.22, baseY - s * 0.1, s * 0.22, "#37b24d", 'opacity="0.95"')}
    ${circle(x + s * 0.2, baseY - s * 0.12, s * 0.24, "#2b8a3e", 'opacity="0.95"')}
  </g>`;
}

/** Siluet siswa kecil (kepala + badan). */
function student(x, baseY, s, color = "#1e293b") {
  return `<g fill="${color}" opacity="0.85">
    ${circle(x, baseY - s * 1.5, s * 0.22)}
    ${poly(`${x - s * 0.32},${baseY - s * 0.62} ${x + s * 0.32},${baseY - s * 0.62} ${x + s * 0.22},${baseY} ${x - s * 0.22},${baseY}`, color)}
  </g>`;
}

/** Jendela gedung (frame + kaca). */
function window(x, y, w, h) {
  return `<g>
    ${rect(x - 2, y - 2, w + 4, h + 4, "#f8fafc")}
    ${rect(x, y, w, h, "url(#glass)")}
    ${rect(x + w * 0.5 - 1, y, 2, h, "#e2e8f0")}
    ${rect(x, y + h * 0.5 - 1, w, 2, "#e2e8f0")}
  </g>`;
}

/** Rangka jendela besar (kaca bergaris). */
function glassWall(x, y, w, h) {
  let body = rect(x, y, w, h, "#a5f3fc");
  const step = 24;
  for (let gx = x + step; gx < x + w; gx += step) {
    body += rect(gx, y, 2, h, "#e0f2fe");
  }
  for (let gy = y + step; gy < y + h; gy += step) {
    body += rect(x, gy, w, 2, "#e0f2fe");
  }
  return `<g opacity="0.92">${body}${rect(x - 3, y - 3, w + 6, 3, "#94a3b8")}${rect(x - 3, y + h, w + 6, 3, "#94a3b8")}</g>`;
}

const vignette = (w, h) => rect(0, 0, w, h, "url(#vignette)");

// ============================================================
// Adegan 1 — HERO sekolah (1600x900)
// ============================================================
function heroScene() {
  const w = 1600;
  const h = 900;
  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="1280" cy="150" r="210" fill="url(#sun)"/>
    ${cloud(330, 150, 70, 0.95)}
    ${cloud(920, 110, 55, 0.8)}
    ${cloud(1450, 250, 62, 0.75)}
    <ellipse cx="800" cy="640" rx="900" ry="300" fill="#3b9e5f"/>
    <ellipse cx="800" cy="672" rx="980" ry="300" fill="url(#ground)"/>
    <path d="M0 660 Q 200 640 420 662 T 820 656 T 1200 664 T 1600 650 L1600 900 L0 900 Z" fill="#16a34a"/>
    <!-- gedung utama -->
    <g filter="url(#softShadow)">
      <rect x="480" y="300" width="640" height="360" fill="url(#wall)"/>
      <polygon points="455,300 800,180 1145,300" fill="url(#roof)"/>
      <rect x="455" y="300" width="690" height="14" fill="#cbd5e1"/>
      <rect x="455" y="286" width="690" height="16" fill="#64748b"/>
      <!-- lantai 1 & 2 -->
      ${[352, 448]
        .map((y, i) => {
          let row = "";
          for (let k = 0; k < 6; k++) row += window(540 + k * 96, y, 56, 72);
          return row;
        })
        .join("")}
      <!-- pintu masuk -->
      <rect x="748" y="470" width="104" height="190" fill="#0f766e"/>
      <rect x="752" y="474" width="96" height="186" fill="#134e4a"/>
      <circle cx="834" cy="566" r="5" fill="#fbbf24"/>
      <rect x="720" y="452" width="160" height="24" fill="#94a3b8"/>
      <!-- kanopi -->
      <rect x="700" y="430" width="200" height="18" fill="#64748b"/>
      <!-- tiang bendera + bendera -->
      <rect x="410" y="200" width="10" height="460" fill="#64748b"/>
      <polygon points="420,208 560,232 420,256" fill="#dc2626"/>
    </g>
    <!-- gedung sayap kanan (lebih kecil) -->
    <g filter="url(#softShadow)">
      <rect x="1150" y="360" width="330" height="300" fill="url(#wall)"/>
      <polygon points="1145,360 1315,290 1485,360" fill="#64748b"/>
      ${[408, 490]
        .map((y) => [1186, 1278, 1370].map((x) => window(x, y, 48, 62)).join(""))
        .join("")}
    </g>
    <!-- gedung sayap kiri -->
    <g filter="url(#softShadow)">
      <rect x="150" y="380" width="310" height="280" fill="#f1ece1"/>
      <polygon points="145,380 305,312 465,380" fill="#64748b"/>
      ${[428, 504].map((y) => [186, 272].map((x) => window(x, y, 46, 58)).join("")).join("")}
    </g>
    <!-- pohon & semak -->
    ${tree(210, 660, 120)}
    ${tree(1220, 660, 130)}
    ${tree(1380, 662, 105)}
    ${bush(560, 668, 60)}
    ${bush(1050, 668, 66)}
    ${bush(250, 668, 46)}
    <!-- siswa di halaman depan -->
    ${student(700, 668, 34)}
    ${student(760, 668, 32, "#334155")}
    ${student(900, 668, 34, "#0f172a")}
    ${student(970, 668, 31, "#334155")}
    ${student(860, 672, 27, "#475569")}
    ${student(1010, 670, 29, "#1e293b")}
    ${vignette(w, h)}
  `
  );
}

// ============================================================
// Adegan 2 — FASILITAS (800x600): lab komputer modern
// ============================================================
function facilityScene() {
  const w = 800;
  const h = 600;
  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="660" cy="110" r="150" fill="url(#sun)"/>
    ${cloud(180, 120, 46, 0.9)}
    ${cloud(600, 200, 40, 0.7)}
    <rect x="0" y="430" width="${w}" height="170" fill="url(#ground)"/>
    <!-- ruang lab interior -->
    <g filter="url(#softShadow)">
      <rect x="90" y="150" width="620" height="330" fill="url(#interiorWall)"/>
      <rect x="90" y="150" width="620" height="26" fill="#7c6f57"/>
      ${glassWall(560, 190, 120, 150)}
      <!-- meja baris -->
      ${[0, 1, 2]
        .map((i) => {
          const y = 300 + i * 58;
          return `<g>
          ${rect(130, y, 400, 34, "#8a5a2b")}
          ${rect(130, y, 400, 6, "#a47038")}
          ${rect(150, y - 14, 10, 14, "#6b4423")}
          ${rect(500, y - 14, 10, 14, "#6b4423")}
        </g>`;
        })
        .join("")}
      <!-- monitor -->
      ${[0, 1, 2]
        .map((i) => {
          const y = 300 + i * 58;
          return [170, 260, 350, 440]
            .map(
              (x) =>
                `<g>
            ${rect(x + 4, y - 22, 40, 24, "#1f2937")}
            ${rect(x + 9, y - 17, 30, 14, "#67e8f9")}
            ${rect(x + 16, y + 2, 16, 6, "#374151")}
          </g>`
            )
            .join("");
        })
        .join("")}
      <!-- papan tulis -->
      <rect x="130" y="196" width="210" height="70" fill="#f8fafc"/>
      <rect x="138" y="204" width="194" height="54" fill="#1e3a5f"/>
      <rect x="146" y="216" width="140" height="7" fill="#f8fafc" opacity="0.85"/>
      <rect x="146" y="230" width="100" height="7" fill="#f8fafc" opacity="0.6"/>
      <!-- kursi -->
      ${[0, 1, 2]
        .map((i) => {
          const y = 348 + i * 58;
          return [150, 240, 330, 420]
            .map(
              (x) =>
                `<g>
            ${rect(x + 4, y, 34, 5, "#334155")}
            ${rect(x + 16, y + 5, 6, 20, "#475569")}
          </g>`
            )
            .join("");
        })
        .join("")}
      <!-- meja guru -->
      ${rect(620, 380, 70, 60, "#8a5a2b")}
      ${rect(618, 372, 74, 12, "#a47038")}
    </g>
    ${bush(60, 500, 44)}
    ${bush(740, 502, 50)}
    ${tree(70, 500, 90)}
    ${tree(730, 505, 100)}
    ${vignette(w, h)}
  `
  );
}

// ============================================================
// Adegan 3 — KEGIATAN (800x600): siswa upacara/berkumpul di halaman
// ============================================================
function activityScene() {
  const w = 800;
  const h = 600;
  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="url(#skyWarm)"/>
    <circle cx="120" cy="120" r="170" fill="url(#sun)"/>
    ${cloud(560, 100, 52, 0.9)}
    ${cloud(300, 190, 38, 0.75)}
    <ellipse cx="400" cy="470" rx="520" ry="180" fill="#3b9e5f"/>
    <ellipse cx="400" cy="496" rx="560" ry="170" fill="url(#ground)"/>
    <!-- gedung latar -->
    <g opacity="0.85">
      <rect x="520" y="200" width="230" height="280" fill="#e7e0d0"/>
      <polygon points="515,200 635,140 755,200" fill="#64748b"/>
      ${[260, 330].map((y) => [545, 615, 685].map((x) => window(x, y, 40, 52)).join("")).join("")}
    </g>
    ${tree(80, 520, 110)}
    ${tree(730, 522, 118)}
    ${bush(140, 530, 42)}
    ${bush(650, 530, 46)}
    <!-- barisan siswa upacara -->
    <g>
      ${[0, 1, 2, 3, 4, 5]
        .map((i) => {
          const x = 250 + i * 52;
          return student(x, 512, 40, i % 2 ? "#1e293b" : "#0f172a");
        })
        .join("")}
      ${[0, 1, 2, 3, 4]
        .map((i) => {
          const x = 232 + i * 52;
          return student(x, 556, 38, "#334155");
        })
        .join("")}
      ${[0, 1, 2, 3]
        .map((i) => {
          const x = 280 + i * 52;
          return student(x, 596, 36, "#1e293b");
        })
        .join("")}
    </g>
    <!-- bendera merah putih di tengah -->
    <g>
      <rect x="392" y="230" width="7" height="290" fill="#94a3b8"/>
      <polygon points="399,232 520,250 399,268" fill="#dc2626"/>
      <polygon points="399,268 520,250 399,286" fill="#f8fafc"/>
    </g>
    ${vignette(w, h)}
  `
  );
}

// ============================================================
// Adegan 4 — PERPUSTAKAAN (800x600)
// ============================================================
function libraryScene() {
  const w = 800;
  const h = 600;
  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="#f2e8d5"/>
    <ellipse cx="400" cy="0" rx="560" ry="240" fill="#e8dcc4"/>
    <ellipse cx="400" cy="600" rx="600" ry="120" fill="#8a5a2b"/>
    <rect x="0" y="560" width="${w}" height="40" fill="#8a5a2b"/>
    <!-- dinding rak buku kiri -->
    <g filter="url(#softShadow)">
      <rect x="80" y="120" width="220" height="340" fill="#6b4423"/>
      ${[150, 210, 270, 330]
        .map((y) =>
          [100, 160, 220]
            .map((x) => {
              const r = Math.floor(160 + ((x + y) % 90));
              const g = Math.floor(90 + ((x * 2) % 70));
              const b = Math.floor(70 + ((y * 3) % 80));
              return rect(x + 4, y + 4, 50, 22, `rgb(${r},${g},${b})`, 'rx="2"');
            })
            .join("")
        )
        .join("")}
    </g>
    <!-- dinding rak kanan -->
    <g filter="url(#softShadow)">
      <rect x="560" y="120" width="200" height="340" fill="#6b4423"/>
      ${[150, 210, 270, 330]
        .map((y) =>
          [580, 636]
            .map((x) => {
              const r = Math.floor(140 + ((x * 3) % 100));
              const g = Math.floor(80 + ((y * 2) % 80));
              const b = Math.floor(60 + ((x + y) % 90));
              return rect(x + 4, y + 4, 48, 22, `rgb(${r},${g},${b})`, 'rx="2"');
            })
            .join("")
        )
        .join("")}
    </g>
    <!-- meja baca + kursi -->
    <g filter="url(#softShadow)">
      <rect x="320" y="360" width="200" height="26" fill="#8a5a2b"/>
      <rect x="320" y="360" width="200" height="5" fill="#a47038"/>
      <rect x="336" y="386" width="10" height="60" fill="#6b4423"/>
      <rect x="494" y="386" width="10" height="60" fill="#6b4423"/>
      ${rect(300, 420, 40, 8, "#334155")}
      ${rect(312, 428, 6, 26, "#475569")}
      ${rect(500, 420, 40, 8, "#334155")}
      ${rect(522, 428, 6, 26, "#475569")}
      <!-- buku terbuka -->
      <path d="M380 356 Q 420 330 440 356 L 460 356 Q 420 340 380 356 Z" fill="#f8fafc"/>
    </g>
    <!-- jendela + tanaman -->
    ${glassWall(400, 140, 130, 120)}
    ${bush(360, 560, 40)}
    ${bush(620, 560, 44)}
    ${vignette(w, h)}
  `
  );
}

// ============================================================
// Adegan 5 — KELAS (800x600)
// ============================================================
function classroomScene() {
  const w = 800;
  const h = 600;
  return svg(
    w,
    h,
    `
    <rect width="${w}" height="${h}" fill="#eef2f7"/>
    <ellipse cx="400" cy="0" rx="620" ry="200" fill="#dfe7f0"/>
    <ellipse cx="400" cy="600" rx="620" ry="140" fill="#8a5a2b"/>
    <rect x="0" y="540" width="${w}" height="60" fill="#8a5a2b"/>
    <!-- dinding kelas -->
    <g filter="url(#softShadow)">
      <rect x="70" y="120" width="660" height="340" fill="#f4f0e6"/>
      <rect x="70" y="120" width="660" height="22" fill="#9aa5b1"/>
      ${glassWall(600, 160, 110, 130)}
      <!-- papan tulis -->
      <rect x="110" y="170" width="240" height="86" fill="#1e3a5f"/>
      <rect x="120" y="182" width="220" height="64" fill="#14304f"/>
      <rect x="132" y="198" width="120" height="7" fill="#f8fafc" opacity="0.9"/>
      <rect x="132" y="214" width="160" height="7" fill="#f8fafc" opacity="0.7"/>
      <rect x="132" y="230" width="90" height="7" fill="#f8fafc" opacity="0.5"/>
      <!-- meja & kursi siswa -->
      ${[0, 1, 2]
        .map((r) => {
          const y = 300 + r * 56;
          return [130, 250, 370, 490]
            .map(
              (x) =>
                `<g>
            ${rect(x, y, 100, 28, "#a47038")}
            ${rect(x + 8, y + 28, 8, 30, "#6b4423")}
            ${rect(x + 84, y + 28, 8, 30, "#6b4423")}
            ${rect(x + 4, y - 10, 34, 10, "#334155")}
            ${rect(x + 16, y, 6, 18, "#475569")}
          </g>`
            )
            .join("");
        })
        .join("")}
      <!-- meja guru -->
      ${rect(560, 300, 90, 60, "#8a5a2b")}
      ${rect(556, 294, 98, 12, "#a47038")}
    </g>
    ${tree(70, 540, 100)}
    ${tree(740, 545, 110)}
    ${bush(560, 548, 42)}
    ${vignette(w, h)}
  `
  );
}

// ============================================================
// Render
// ============================================================

const IMAGES = [
  { file: "hero.jpg", width: 1600, height: 900, scene: heroScene, alt: "hero" },
  { file: "facility.jpg", width: 800, height: 600, scene: facilityScene, alt: "facility" },
  { file: "activity.jpg", width: 800, height: 600, scene: activityScene, alt: "activity" },
  { file: "library.jpg", width: 800, height: 600, scene: libraryScene, alt: "library" },
  { file: "classroom.jpg", width: 800, height: 600, scene: classroomScene, alt: "classroom" }
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const img of IMAGES) {
    const outPath = path.join(OUT_DIR, img.file);
    await sharp(Buffer.from(img.scene())).jpeg({ quality: 80, progressive: true }).toFile(outPath);
    const stat = fs.statSync(outPath);
    results.push({ file: img.file, size: stat.size, width: img.width, height: img.height });
    console.log(`✓ ${img.file} (${img.width}x${img.height}) — ${(stat.size / 1024).toFixed(1)} KB`);
  }
  console.log("\nSelesai. File di:", OUT_DIR);
}

main().catch((err) => {
  console.error("Gagal generate gambar:", err);
  process.exit(1);
});
