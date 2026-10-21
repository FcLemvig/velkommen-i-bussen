import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}

const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();

// Helpers called inside a scheduling transaction must use the same connection.
export const prisma = new Proxy(client, {
  get(target, key) {
    const tx = transactionContext.getStore();
    if (tx && key === "$transaction") {
      return (work: ((db: Prisma.TransactionClient) => unknown) | Promise<unknown>[]) =>
        typeof work === "function" ? work(tx) : Promise.all(work);
    }
    const source = tx ?? target;
    const value = Reflect.get(source, key);
    return typeof value === "function" ? value.bind(source) : value;
  },
});

export async function scheduleTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactionContext.getStore()) return work();
  return client.$transaction(
    async (tx) => {
      // Shared by all scheduling writes, including event capacity changes.
      // ReadCommitted ensures reads after waiting see the preceding commit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(76207660)`;
      return transactionContext.run(tx, work);
    },
    { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 30000 },
  );
}
