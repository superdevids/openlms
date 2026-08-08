import "@testing-library/jest-dom/vitest";

/**
 * Polyfill window.localStorage / window.sessionStorage untuk jsdom.
 *
 * Node >= 22 menyediakan global localStorage eksperimental (objek kosong
 * tanpa method) yang menimpa implementasi Storage jsdom — gejala:
 * `window.localStorage.clear is not a function`. Jangan memakai Storage
 * jsdom asli; pasang in-memory Storage yang lengkap agar unit test
 * lib/storage (R-39) deterministik.
 */
function installStoragePolyfill(): void {
  const broken = (store: unknown): boolean =>
    store == null ||
    typeof store !== "object" ||
    typeof (store as Storage).getItem !== "function" ||
    typeof (store as Storage).setItem !== "function" ||
    typeof (store as Storage).removeItem !== "function" ||
    typeof (store as Storage).clear !== "function";

  const memoryStorage = (): Storage => {
    const data = new Map<string, string>();
    return {
      get length() {
        return data.size;
      },
      clear() {
        data.clear();
      },
      getItem(key: string) {
        return data.has(key) ? data.get(key)! : null;
      },
      key(index: number) {
        return [...data.keys()][index] ?? null;
      },
      removeItem(key: string) {
        data.delete(key);
      },
      setItem(key: string, value: string) {
        data.set(key, String(value));
      }
    };
  };

  if (typeof window !== "undefined") {
    if (broken(window.localStorage)) {
      Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
    }
    if (broken(window.sessionStorage)) {
      Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        value: memoryStorage()
      });
    }
  }
}

installStoragePolyfill();
