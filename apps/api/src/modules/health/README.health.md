# README.health.md — Modul Health (apps/api/src/modules/health)

## Fungsi Folder

Modul healthcheck sederhana untuk memantau ketersediaan API. Endpoint ini
dibypass oleh `AuthGuard` (selalu publik) meskipun tidak memakai `@Public()`.

## Daftar Fitur

- Healthcheck HTTP dasar (status + nama service).

## Endpoint (prefix global `/api/v1`)

| Method | Path       | Permission                        | Deskripsi                                                              |
| ------ | ---------- | --------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/health`  | Publik (bypass guard)             | `{ status: "ok", service: "opensis-api" }`                             |
| GET    | `/metrics` | SUPERADMIN (`system:status:read`) | Metrik proses (uptime, memori, event loop lag) — lihat modul `metrics` |

## Struktur File

| File                   | Isi                   |
| ---------------------- | --------------------- |
| `health.controller.ts` | Handler `GET /health` |
| `health.module.ts`     | Registrasi modul      |
