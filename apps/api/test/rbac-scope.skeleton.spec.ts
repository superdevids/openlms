/**
 * Skeleton test isolasi scope RBAC (F0-T5).
 * Di-skip sampai guard RBAC @RequirePermission + scope resolver terpasang (F1-T4).
 *
 * Asersi wajib saat guard aktif (docs/03 §7, docs/02 §14):
 * 1. SENDIRI: user hanya bisa baca/tulis data miliknya.
 * 2. KELAS: guru hanya akses data kelasnya (homeroom = scope override).
 * 3. SEKOLAH: role admin akses seluruh data sekolah.
 * 4. Lintas scope selalu gagal (403).
 */

describe.skip("RBAC scope isolation (skeleton — aktif setelah F1-T4)", () => {
  it("user scope SENDIRI gagal membaca submission siswa lain", () => {
    // TODO(F1): create submission milik user A; akses sebagai user B -> 403
    expect(true).toBe(true);
  });

  it("user scope KELAS hanya membaca kelasnya", () => {
    // TODO(F1): grade kelas X; akses sebagai guru kelas Y -> 403
    expect(true).toBe(true);
  });

  it("role scope SEKOLAH mengakses seluruh data", () => {
    // TODO(F1): akses sebagai OPERATOR -> 200 lintas kelas
    expect(true).toBe(true);
  });
});
