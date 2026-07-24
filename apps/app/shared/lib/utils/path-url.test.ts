import { normalizePath, isAbsoluteHttpUrl } from "./path-url";

describe("normalizePath", () => {
  it("prepends / when path does not start with /", () => {
    expect(normalizePath("patients")).toBe("/patients");
  });

  it("keeps path unchanged when it already starts with /", () => {
    expect(normalizePath("/patients")).toBe("/patients");
  });

  it("handles empty string", () => {
    expect(normalizePath("")).toBe("/");
  });

  it("handles path with query params", () => {
    expect(normalizePath("patients?search=john")).toBe("/patients?search=john");
  });

  it("handles full URL as input", () => {
    expect(normalizePath("https://example.com/path")).toBe("/https://example.com/path");
  });
});

describe("isAbsoluteHttpUrl", () => {
  it("returns true for https URLs", () => {
    expect(isAbsoluteHttpUrl("https://example.com")).toBe(true);
  });

  it("returns true for http URLs", () => {
    expect(isAbsoluteHttpUrl("http://example.com")).toBe(true);
  });

  it("returns true for URL with path", () => {
    expect(isAbsoluteHttpUrl("https://api.example.com/v1/patients")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isAbsoluteHttpUrl("/patients")).toBe(false);
  });

  it("returns false for plain strings", () => {
    expect(isAbsoluteHttpUrl("patients")).toBe(false);
  });

  it("returns false for ftp URLs", () => {
    expect(isAbsoluteHttpUrl("ftp://example.com")).toBe(false);
  });

  it("is case insensitive for HTTP/HTTPS", () => {
    expect(isAbsoluteHttpUrl("HTTPS://example.com")).toBe(true);
    expect(isAbsoluteHttpUrl("HTTP://example.com")).toBe(true);
  });
});
