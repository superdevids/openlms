# Global Features — Maintenance & Onboarding (hand-off)

Dibuat oleh global-features coder. Dua fitur global siap dipakai, **perlu di-mount** oleh agent
pemilik layout/app-shell:

## 1. MaintenanceGate (mode maintenance global)

Komponen: `apps/web/src/components/maintenance/maintenance-gate.tsx`

**MOUNT di `apps/web/src/app/layout.tsx`** (agent pemilik layout):

```tsx
import { MaintenanceGate } from "@/components/maintenance/maintenance-gate";
// di dalam <body>:
<BrandingProvider>
  <MaintenanceGate>{children}</MaintenanceGate>
</BrandingProvider>;
```

- Fetch `GET /api/v1/public/system-status` saat mount; bila `maintenanceEnabled` → overlay
  full-screen halaman pemeliharaan (blocking children). Offline/error → anggap normal.
- Catatan desain: endpoint `PUT /admin/system/maintenance` di-allowlist middleware agar
  SUPERADMIN tetap bisa mematikan mode dari UI. Otorisasi tetap di-enforce guard (SUPERADMIN only).
- Bila landing page publik ingin tetap tampil saat maintenance, mount gate hanya pada route group
  terautentikasi (mis. di masing-masing `(grup)/layout.tsx`) — tidak di root layout.

## 2. OnboardingTour (tur fitur per role)

Komponen: `apps/web/src/components/onboarding/onboarding-tour.tsx`

**MOUNT di `apps/web/src/components/layout/app-shell.tsx`** (di dalam `AuthProvider`, agent pemilik
app-shell):

```tsx
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
// di dalam <div> root app-shell, setelah <main>:
<OnboardingTour />;
```

- Auto-show saat pertama login bila `GET /api/v1/onboarding/me` belum selesai & belum dismissed.
- Berisi tombol apung "Panduan" (kanan-bawah) untuk membuka tur kapan saja.
- Langkah role-specific dikirim API (`SUPERADMIN/KEPSEK/WAKEPSEK/OPERATOR/KEUANGAN/GURU/SISWA/WALI_MURID`).
- Membutuhkan `useAuth` (AuthProvider) — jangan di-mount di luar provider.

## API endpoints baru

- `GET  /api/v1/public/system-status` (public)
- `GET  /api/v1/admin/system/maintenance` (SUPERADMIN)
- `PUT  /api/v1/admin/system/maintenance` (SUPERADMIN, permission `system:maintenance:write`)
- `GET  /api/v1/onboarding/me`
- `PUT  /api/v1/onboarding/me/complete`
- `PUT  /api/v1/onboarding/me/dismiss`
- `PUT  /api/v1/onboarding/me/progress` `{ stepKey, done }`
