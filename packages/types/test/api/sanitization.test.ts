import { describe, it, expect } from "vitest";
import { stripHtmlTags } from "../../src/api/sanitization";

describe("stripHtmlTags", () => {
  it("returns empty string for null", () => {
    expect(stripHtmlTags(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(stripHtmlTags(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtmlTags("John Doe")).toBe("John Doe");
  });

  it("strips simple HTML tags preserving text", () => {
    expect(stripHtmlTags("<script>alert(1)</script>")).toBe("alert(1)");
  });

  it("strips tags and preserves text content", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
  });

  it("strips tags with attributes", () => {
    expect(
      stripHtmlTags(
        '<a href="javascript:alert(1)">Click me</a>',
      ),
    ).toBe("Click me");
  });

  it("strips nested tags", () => {
    expect(
      stripHtmlTags("<div><p><b>Bold text</b></p></div>"),
    ).toBe("Bold text");
  });

  it("decodes HTML entities before stripping", () => {
    expect(stripHtmlTags("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
      "alert(1)",
    );
  });

  it("decodes numeric character references", () => {
    expect(stripHtmlTags("&#60;script&#62;content&#60;/script&#62;")).toBe(
      "content",
    );
  });

  it("decodes hex character references", () => {
    expect(stripHtmlTags("&#x3C;b&#x3E;bold&#x3C;/b&#x3E;")).toBe("bold");
  });

  it("handles malformed nested tags", () => {
    const result = stripHtmlTags("<<script>script>alert(1)");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
  });

  it("handles self-closing tags", () => {
    expect(stripHtmlTags("Hello<br/>World")).toBe("HelloWorld");
  });

  it("handles img tags with event handlers", () => {
    expect(
      stripHtmlTags('<img src=x onerror="alert(1)">'),
    ).toBe("");
  });

  it("handles mixed content preserving all text", () => {
    expect(
      stripHtmlTags(
        "Patient: <b>John</b> <script>steal()</script> <i>Doe</i>",
      ),
    ).toBe("Patient: John steal() Doe");
  });

  it("trims whitespace", () => {
    expect(stripHtmlTags("  <p>Hello</p>  ")).toBe("Hello");
  });

  it("decodes &amp; entity correctly", () => {
    expect(stripHtmlTags("AT&amp;T")).toBe("AT&T");
  });

  it("handles encoded tags with nested entities", () => {
    expect(
      stripHtmlTags(
        "&lt;img src=x onerror=&#x61;&#x6C;&#x65;&#x72;&#x74;(1)&gt;",
      ),
    ).toBe("");
  });
});
