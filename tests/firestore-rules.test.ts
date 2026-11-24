// @vitest-environment node
// Spec §4.1 C12: run with an emulator, e.g. FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx vitest run tests/firestore-rules.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

const projectId = `dwas-rules-${Date.now()}`;
const BOOKING = "bookings/b1";
const CONTACT = "users/client-1/private/contact";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("firestore rules — C12 privacy", () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(join(process.cwd(), "firestore.rules"), "utf8"),
        host,
        port: Number(port),
      },
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), BOOKING), { clientId: "client-1", technicianId: "tech-1", status: "accepted" });
      await setDoc(doc(ctx.firestore(), CONTACT), { phone: "+923001234567" });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it("does not let another user read a booking", async () => {
    const stranger = env.authenticatedContext("stranger-1").firestore();
    await assertFails(getDoc(doc(stranger, BOOKING)));
  });

  it("does not let any client read private/contact", async () => {
    for (const ctx of [env.authenticatedContext("client-1"), env.authenticatedContext("tech-1"), env.unauthenticatedContext()]) {
      await assertFails(getDoc(doc(ctx.firestore(), CONTACT)));
    }
  });

  it("lets the client and the assigned technician read their booking", async () => {
    for (const uid of ["client-1", "tech-1"]) {
      await assertSucceeds(getDoc(doc(env.authenticatedContext(uid).firestore(), BOOKING)));
    }
  });
});
