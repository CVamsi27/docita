import { describe, expect, it } from "vitest";
import {
  BROADCAST_LIST_LIMIT,
  CSV_NO_VALID_PHONES_ERROR,
  CSV_UNREADABLE_ERROR,
  buildDefaultTitle,
  buildRecipientPayload,
  getBroadcastsErrorMessage,
  getBroadcastsListStatus,
  getCsvReadError,
} from "./broadcasts-helpers";

describe("constants", () => {
  it("BROADCAST_LIST_LIMIT is 50", () => {
    expect(BROADCAST_LIST_LIMIT).toBe(50);
  });

  it("CSV_NO_VALID_PHONES_ERROR mentions phone numbers", () => {
    expect(CSV_NO_VALID_PHONES_ERROR).toMatch(/phone numbers/i);
  });

  it("CSV_UNREADABLE_ERROR is a user-facing message", () => {
    expect(CSV_UNREADABLE_ERROR).toMatch(/could not read/i);
  });
});

describe("buildDefaultTitle", () => {
  it("combines label and a formatted date", () => {
    const title = buildDefaultTitle("April campaign");
    expect(title).toMatch(/^April campaign — /);
  });
});

describe("buildRecipientPayload", () => {
  it("passes phone and name through, adds variables when name is set", () => {
    const result = buildRecipientPayload([
      { phoneNumber: "919999999999", name: "Asha" },
    ]);
    expect(result).toEqual([
      {
        phoneNumber: "919999999999",
        name: "Asha",
        variables: { name: "Asha" },
      },
    ]);
  });

  it("omits variables when name is missing", () => {
    const result = buildRecipientPayload([{ phoneNumber: "919999999999" }]);
    expect(result).toEqual([
      { phoneNumber: "919999999999", name: undefined, variables: undefined },
    ]);
  });

  it("handles an empty recipients array", () => {
    expect(buildRecipientPayload([])).toEqual([]);
  });
});

describe("getCsvReadError", () => {
  it("returns the Error.message when given an Error instance", () => {
    expect(getCsvReadError(new Error("bad encoding"))).toBe("bad encoding");
  });

  it("falls back to CSV_UNREADABLE_ERROR for non-Error values", () => {
    expect(getCsvReadError("nope")).toBe(CSV_UNREADABLE_ERROR);
    expect(getCsvReadError(null)).toBe(CSV_UNREADABLE_ERROR);
    expect(getCsvReadError(undefined)).toBe(CSV_UNREADABLE_ERROR);
    expect(getCsvReadError({ message: "x" })).toBe(CSV_UNREADABLE_ERROR);
  });
});

describe("getBroadcastsListStatus", () => {
  it("returns 'loading' when isLoading", () => {
    expect(getBroadcastsListStatus({ isLoading: true, isError: false })).toBe(
      "loading",
    );
  });

  it("returns 'error' when isError and not loading", () => {
    expect(getBroadcastsListStatus({ isLoading: false, isError: true })).toBe(
      "error",
    );
  });

  it("returns 'success' when neither loading nor errored", () => {
    expect(getBroadcastsListStatus({ isLoading: false, isError: false })).toBe(
      "success",
    );
  });
});

describe("getBroadcastsErrorMessage", () => {
  it("returns the fallback for null / undefined errors", () => {
    expect(
      getBroadcastsErrorMessage(null, "load", "Could not load broadcasts"),
    ).toBe("Could not load broadcasts");
    expect(
      getBroadcastsErrorMessage(
        undefined,
        "save",
        "Could not save broadcast",
      ),
    ).toBe("Could not save broadcast");
  });

  it("passes the error through user-facing mapping for Error instances", () => {
    const error = new Error("server 500");
    const result = getBroadcastsErrorMessage(error, "load", "fallback");
    expect(typeof result).toBe("string");
    expect(result).toBeTruthy();
  });
});
