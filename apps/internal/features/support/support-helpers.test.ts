import { describe, expect, it } from "vitest";
import {
  filterThreads,
  formatMessageType,
  formatStatusBadgeVariant,
  getMessageAuthor,
  getThreadLabel,
  getWhatsAppLink,
  MESSAGES_LOAD_ERROR_FALLBACK,
  THREAD_LIMIT,
  THREAD_MESSAGES_LIMIT,
  THREADS_LOAD_ERROR_FALLBACK,
} from "./support-helpers";

describe("constants", () => {
  it("THREAD_LIMIT is 100", () => {
    expect(THREAD_LIMIT).toBe(100);
  });
  it("THREAD_MESSAGES_LIMIT is 500", () => {
    expect(THREAD_MESSAGES_LIMIT).toBe(500);
  });
  it("THREADS_LOAD_ERROR_FALLBACK reads as a user message", () => {
    expect(THREADS_LOAD_ERROR_FALLBACK).toMatch(/could not load/i);
  });
  it("MESSAGES_LOAD_ERROR_FALLBACK reads as a user message", () => {
    expect(MESSAGES_LOAD_ERROR_FALLBACK).toMatch(/could not load/i);
  });
});

describe("getThreadLabel", () => {
  it("uses senderName when present and non-empty", () => {
    expect(
      getThreadLabel({ senderName: "Asha", threadPhoneNumber: "919999999999" }),
    ).toBe("Asha");
  });

  it("trims whitespace before deciding", () => {
    expect(
      getThreadLabel({
        senderName: "   ",
        threadPhoneNumber: "919999999999",
      }),
    ).toBe("919999999999");
  });

  it("falls back to phone number when senderName is null", () => {
    expect(
      getThreadLabel({
        senderName: null,
        threadPhoneNumber: "919999999999",
      }),
    ).toBe("919999999999");
  });
});

describe("getWhatsAppLink", () => {
  it("strips non-digits and builds a wa.me link", () => {
    expect(getWhatsAppLink("+91 99999 99999")).toBe(
      "https://wa.me/919999999999",
    );
  });

  it("returns '#' when no digits are present", () => {
    expect(getWhatsAppLink("---")).toBe("#");
    expect(getWhatsAppLink("")).toBe("#");
  });
});

describe("formatMessageType", () => {
  it("returns 'Message' for empty input", () => {
    expect(formatMessageType("")).toBe("Message");
  });

  it("title-cases single words", () => {
    expect(formatMessageType("text")).toBe("Text");
  });

  it("title-cases kebab-case multi-words", () => {
    expect(formatMessageType("image-attachment")).toBe("Image Attachment");
  });
});

describe("formatStatusBadgeVariant", () => {
  it.each([
    ["PENDING", "secondary"],
    ["NEW", "default"],
    ["FAILED", "destructive"],
  ] as const)("%s → %s", (status, variant) => {
    expect(formatStatusBadgeVariant(status)).toBe(variant);
  });

  it("returns 'secondary' for any unknown status", () => {
    expect(formatStatusBadgeVariant("UNKNOWN")).toBe("secondary");
    expect(formatStatusBadgeVariant("")).toBe("secondary");
  });
});

describe("getMessageAuthor", () => {
  it("returns 'You' for OUTBOUND messages regardless of sender", () => {
    expect(
      getMessageAuthor({
        direction: "OUTBOUND",
        senderName: "Asha",
        senderPhoneNumber: "919999999999",
      }),
    ).toBe("You");
  });

  it("returns senderName for INBOUND messages when present", () => {
    expect(
      getMessageAuthor({
        direction: "INBOUND",
        senderName: "Asha",
        senderPhoneNumber: "919999999999",
      }),
    ).toBe("Asha");
  });

  it("falls back to phone number for INBOUND with no name", () => {
    expect(
      getMessageAuthor({
        direction: "INBOUND",
        senderName: undefined,
        senderPhoneNumber: "919999999999",
      }),
    ).toBe("919999999999");
  });
});

describe("filterThreads", () => {
  const base = {
    senderName: "Asha",
    threadPhoneNumber: "919999999991",
    supportPhoneNumber: "918000000000",
    lastMessageBody: "Hi, need help",
    lastMessageType: "text",
    lastMessageStatus: "DELIVERED",
    lastMessageDirection: "INBOUND",
  };
  const threads = [
    base,
    {
      ...base,
      senderName: "Vikram",
      threadPhoneNumber: "919999999992",
      lastMessageBody: "Subscription question",
    },
    {
      ...base,
      senderName: undefined,
      threadPhoneNumber: "919999999993",
      lastMessageBody: "Image",
      lastMessageType: "image",
    },
  ];

  it("returns all threads when search is empty", () => {
    expect(filterThreads(threads, "")).toHaveLength(3);
  });

  it("matches case-insensitively on senderName", () => {
    expect(filterThreads(threads, "VIK").map((t) => t.senderName)).toEqual([
      "Vikram",
    ]);
  });

  it("matches on last message body", () => {
    expect(
      filterThreads(threads, "subscription").map((t) => t.threadPhoneNumber),
    ).toEqual(["919999999992"]);
  });

  it("matches on message type", () => {
    expect(
      filterThreads(threads, "image").map((t) => t.threadPhoneNumber),
    ).toEqual(["919999999993"]);
  });

  it("returns [] when nothing matches", () => {
    expect(filterThreads(threads, "no-match-token-xyz")).toEqual([]);
  });
});
