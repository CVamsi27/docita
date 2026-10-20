import { describe, expect, it } from "vitest";
import {
  clinicWhatsappConversationMessageSchema,
  clinicWhatsappSentMessageSchema,
  clinicWhatsappTemplateSchema,
  whatsappLogStatusSchema,
  whatsappMessageStatusSchema,
  whatsappTemplateStatusSchema,
} from "@workspace/types";

/**
 * Both schemas declared `status: z.string()` while the database has two
 * enums behind them (`WhatsappLogStatus`, `WhatsappTemplateStatus`) that had no
 * Zod counterpart at all. A loose string is precisely what let a display map
 * drift unnoticed: `WhatsappRecentSentView` keys its badge map off the wire
 * value and renders `{msg.status}` raw, so nothing pinned the two together.
 *
 * `apps/api/.../legacy-whatsapp-templates.controller.ts` passes
 * `row.status` straight through from the Prisma entity, so the wire value is
 * exactly the enum member.
 */
describe("WhatsApp status wire contracts", () => {
  it("parses every sent-message log status the database can emit", () => {
    for (const status of [
      "QUEUED",
      "SENT",
      "DELIVERED",
      "FAILED",
      "READ",
    ] as const) {
      const parsed = clinicWhatsappSentMessageSchema.safeParse({
        id: "m1",
        message: "hi",
        type: "text",
        status,
        phoneNumber: "+919876543210",
        createdAt: "2026-01-01T00:00:00Z",
      });
      expect({ status, ok: parsed.success }).toEqual({ status, ok: true });
    }
  });

  it("rejects a sent-message status the database cannot emit", () => {
    const parsed = clinicWhatsappSentMessageSchema.safeParse({
      id: "m1",
      message: "hi",
      type: "text",
      // `WhatsappLogStatus` has no such member; accepting it is what allows a
      // misspelled status to reach a display map unnoticed.
      status: "PARTIALLY_DELIVERED",
      phoneNumber: "+919876543210",
      createdAt: "2026-01-01T00:00:00Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("parses every template status the database can emit", () => {
    for (const status of [
      "DRAFT",
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
    ] as const) {
      const parsed = clinicWhatsappTemplateSchema.safeParse({
        id: "t1",
        name: "Reminder",
        category: "MARKETING",
        content: "Hello",
        status,
        isDefault: false,
        isActive: true,
        updatedAt: "2026-01-01T00:00:00Z",
      });
      expect({ status, ok: parsed.success }).toEqual({ status, ok: true });
    }
  });

  it("rejects a template status the database cannot emit", () => {
    const parsed = clinicWhatsappTemplateSchema.safeParse({
      id: "t1",
      name: "Reminder",
      category: "MARKETING",
      content: "Hello",
      status: "PUBLISHED",
      isDefault: false,
      isActive: true,
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("parses every conversation-message status the database can emit", () => {
    for (const status of [
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
      "PENDING",
      "QUEUED",
    ] as const) {
      const parsed = clinicWhatsappConversationMessageSchema.safeParse({
        id: "c1",
        direction: "OUTBOUND",
        messageType: "text",
        content: "hi",
        status,
        createdAt: "2026-01-01T00:00:00Z",
        errorMessage: null,
      });
      expect({ status, ok: parsed.success }).toEqual({ status, ok: true });
    }
  });

  it("rejects a conversation-message status the database cannot emit", () => {
    const parsed = clinicWhatsappConversationMessageSchema.safeParse({
      id: "c1",
      direction: "OUTBOUND",
      messageType: "text",
      content: "hi",
      // `REPLIED` belongs to the support-message enum, not `whatsappMessage`.
      status: "REPLIED",
      createdAt: "2026-01-01T00:00:00Z",
      errorMessage: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps the three WhatsApp status enums correctly separated", () => {
    // The log, message and template tables each have their own Prisma enum.
    // `WhatsappMessageStatus` is a strict superset of `WhatsappLogStatus`
    // (it adds PENDING), so the meaningful invariants are: nothing in the log
    // enum is absent from the message enum, the message enum adds exactly
    // PENDING, and template statuses are disjoint from both.
    const log = new Set(whatsappLogStatusSchema.options);
    const message = new Set(whatsappMessageStatusSchema.options);
    expect([...log].filter((s) => !message.has(s))).toEqual([]);
    expect([...message].filter((s) => !log.has(s))).toEqual(["PENDING"]);

    const template = new Set(whatsappTemplateStatusSchema.options);
    expect([...template].filter((s) => message.has(s))).toEqual([]);
    expect([...template].filter((s) => log.has(s))).toEqual([]);
  });
});