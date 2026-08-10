# README.metrics.md — Modul Metrics (apps/api/src/modules/metrics)

## Fungsi Folder

Observability proses ringan (tanpa dependency npm tambahan): `GET /api/v1/metrics`
membaca `process.memoryUsage()`, `process.uptime()`, `process.pid`,
`process.version`, dan mengukur **event loop lag** via delta waktu `setImmediate`
(latensi tick loop). Respons memakai `Cache-Control: no-store` — metrik selalu
real-time dan tidak boleh di-cache.

## Daftar Fitur

- Metrik runtime proses: uptime, memori (rss/heap_used/heap_total/external),
  event loop lag (ms), pid, versi Node, timestamp ISO.
- RBAC fail-closed: hanya **SUPERADMIN** dengan permission `system:status:read`.
- Endpoint read-only; tidak menyimpan state.

## Endpoint (prefix global `/api/v1`)

| Method | Path       | Permission                        | Deskripsi                                 |
| ------ | ---------- | --------------------------------- | ----------------------------------------- |
| GET    | `/metrics` | SUPERADMIN (`system:status:read`) | Metrik proses + `Cache-Control: no-store` |

Respons (`MetricsView`):

```json
{
  "uptime_seconds": 1234.56,
  "memory": {
    "rss": 123456789,
    "heap_used": 98765432,
    "heap_total": 150000000,
    "external": 1234567
  },
  "event_loop_lag_ms": 0.5,
  "pid": 4242,
  "node_version": "v20.11.0",
  "timestamp": "2026-08-10T00:00:00.000Z"
}
```

Catatan: contoh di atas berbentuk (shape) sesuai `MetricsView` di
`metrics.service.ts`; nilai riil tergantung proses.

## Struktur File

| File                    | Isi                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `metrics.controller.ts` | Route `GET /metrics` + guard RBAC + header no-store                                   |
| `metrics.service.ts`    | `collect()`: baca process.* + ukur event loop lag; tipe `MetricsView`/`MetricsMemory` |
| `metrics.module.ts`     | Registrasi modul                                                                      |
