/**
 * Helper mock Prisma (DatabaseClient) untuk unit test service modul.
 * Pola Proxy: delegasi apa pun (db.<model>.<method>) otomatis menjadi jest.fn()
 * yang bisa di-stub per test. Gunakan `(db.<model>.<method> as jest.Mock)`.
 */
import type { DatabaseClient } from "../../src/modules/database/database.constants";

type ModelProxy = Record<string, jest.Mock>;

function createModelProxy(): ModelProxy {
  return new Proxy({} as ModelProxy, {
    get: (target, prop: string) => {
      if (!(prop in target)) {
        target[prop] = jest.fn();
      }
      return target[prop];
    }
  });
}

export function createMockDb(): DatabaseClient {
  const store: Record<string, ModelProxy> = {};
  const proxy = new Proxy(store, {
    get: (target: Record<string, ModelProxy>, model: string) => {
      // $transaction: mock yang meneruskan callback dengan db (pola transaksi).
      if (model === "$transaction") {
        if (!target[model]) {
          const tx = jest.fn((fn: (tx: unknown) => unknown) => fn(proxy));
          target[model] = tx as unknown as ModelProxy;
        }
        return target[model];
      }
      if (!(model in target)) {
        target[model] = createModelProxy();
      }
      return target[model];
    }
  });
  return proxy as unknown as DatabaseClient;
}

export type MockDb = DatabaseClient;

/** Ambil jest.Mock untuk satu delegasi, mis. mockFn(db, "rolloverRun", "findUnique"). */
export function mockFn(db: MockDb, model: string, method: string): jest.Mock {
  const delegate = (db as unknown as Record<string, Record<string, unknown>>)[model]?.[method];
  return delegate as jest.Mock;
}
