import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let signups: Array<{
  id: string;
  citizenProfileId: string;
  passengers: number;
}> = [];
let tail = Promise.resolve();
let locks = 0;
let lookups = 0;
let activeDriver = true;
let shift = {
  id: "shift",
  driverProfileId: null as string | null,
  rideRequestId: null,
  shiftDate: new Date("2099-01-01"),
  startTime: "12:00",
  endTime: "14:00",
};

// A transaction-aware test double: deliberately rejects queries outside the
// locked connection, and yields on reads to expose the old check/write race.
const fake = {
  async $transaction(work: (tx: unknown) => Promise<unknown>) {
    let release: (() => void) | undefined;
    let snapshot: typeof signups = [];
    let shiftSnapshot = structuredClone(shift);
    let locked = false;
    const tx = {
      async $executeRaw() {
        const previous = tail;
        tail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        snapshot = structuredClone(signups);
        shiftSnapshot = structuredClone(shift);
        locked = true;
        locks++;
      },
      event: {
        async findMany() {
          return [];
        },
        async findUnique() {
          assert.equal(locked, true);
          lookups++;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return {
            id: "event",
            title: "Testtur",
            eventDate: new Date("2099-01-01"),
            startTime: "12:00",
            status: "OPEN",
            capacity: 6,
            signups: structuredClone(signups),
            driverProfileId: null,
          };
        },
      },
      driverShift: {
        async findUnique() {
          assert.equal(locked, true);
          return structuredClone(shift);
        },
        async findMany() {
          return [];
        },
        async update({ data }: { data: { driverProfileId: string } }) {
          shift.driverProfileId = data.driverProfileId;
          return structuredClone(shift);
        },
      },
      driverProfile: {
        async findUnique() {
          return { isActive: activeDriver };
        },
      },
      busBooking: {
        async findMany() {
          return [];
        },
      },
      rideRequest: {
        async findMany() {
          return [];
        },
      },
      eventSignup: {
        async create({
          data,
        }: {
          data: { citizenProfileId: string; passengers: number };
        }) {
          assert.equal(locked, true);
          const signup = { ...data, id: String(signups.length + 1) };
          signups.push(signup);
          return signup;
        },
      },
    };
    try {
      return await work(tx);
    } catch (error) {
      if (locked) {
        signups = snapshot;
        shift = shiftSnapshot;
      }
      throw error;
    } finally {
      release?.();
    }
  },
};

(globalThis as unknown as { prisma: unknown }).prisma = fake;
const { prisma, scheduleTransaction } = require("../lib/prisma");

function stub(path: string, exports: unknown) {
  const filename = require.resolve(path);
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  } as NodeModule;
}
let userNumber = 0;
stub("../lib/auth", {
  requireUser: async () => {
    const id = String(++userNumber);
    return {
      id,
      name: "Test",
      citizenProfile: { id },
      driverProfile: { id: "driver-" + id, isActive: true },
      membership: { status: "ACTIVE", endsAt: null },
    };
  },
});
stub("../lib/audit", { createAuditLog: async () => {} });
stub("../lib/notifications", {
  createNotification: async () => {},
  createNotifications: async () => {},
});
stub("next/cache", { revalidatePath: () => {} });
stub("next/navigation", {
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
});
const {
  signupForEventAction,
} = require("../app/dashboard/citizen/events/actions");
const { claimShiftAction } = require("../app/dashboard/driver/actions");

test("simultaneous requests cannot overbook the last event seats", async () => {
  const form = () => {
    const data = new FormData();
    data.set("eventId", "event");
    data.set("passengers", "4");
    return data;
  };
  const results = await Promise.allSettled([
    signupForEventAction(form()),
    signupForEventAction(form()),
  ]);
  assert.equal(signups.length, 1);
  assert.equal(
    signups.reduce((n, s) => n + s.passengers, 0),
    4,
  );
  assert.equal(lookups, 2);
  assert.equal(locks, 2);
  const messages = results.map((r) =>
    r.status === "rejected" ? r.reason.message : "",
  );
  assert.equal(messages.filter((m) => m.includes("success=")).length, 1);
  assert.equal(messages.filter((m) => m.includes("error=")).length, 1);
});

test("nested helpers reuse the transaction; failure rolls all writes back", async () => {
  const count = signups.length;
  const initialLocks = locks;
  await assert.rejects(
    scheduleTransaction(async () => {
      await scheduleTransaction(async () => {
        await prisma.$transaction(async (tx: typeof prisma) => {
          await tx.eventSignup.create({
            data: { citizenProfileId: "rollback", passengers: 1 },
          });
        });
      });
      throw new Error("rollback");
    }),
    /rollback/,
  );
  assert.equal(locks, initialLocks + 1);
  assert.equal(signups.length, count);
});

test("only one of two drivers can claim the same shift", async () => {
  const form = () => {
    const data = new FormData();
    data.set("shiftId", "shift");
    return data;
  };
  const results = await Promise.allSettled([
    claimShiftAction(form()),
    claimShiftAction(form()),
  ]);
  const messages = results.map((r) =>
    r.status === "rejected" ? r.reason.message : "",
  );
  assert.equal(messages.filter((m) => m.includes("success=")).length, 1);
  assert.equal(messages.filter((m) => m.includes("error=")).length, 1);
  assert.ok(shift.driverProfileId);
});

test("driver activity is rechecked inside the transaction", async () => {
  shift.driverProfileId = null;
  activeDriver = false;
  const data = new FormData();
  data.set("shiftId", "shift");
  await assert.rejects(claimShiftAction(data), /error=/);
  assert.equal(shift.driverProfileId, null);
});
