import { describe, expect, it } from "vitest";
import {
  detectDocumentType,
  formatFileSize,
  getFileIcon,
  isValidFileExtension,
  isValidFileSize,
} from "./document-rules";

describe("Document Rules", () => {
  describe("isValidFileExtension", () => {

    it("should validate allowed extension (e.g. .pdf)", () => {

      expect(isValidFileExtension("test.pdf")).toBe(true);
    });
  });

  describe("isValidFileSize", () => {
    it("should validate size within limit", () => {
      expect(isValidFileSize(100)).toBe(true);
    });
  });

  describe("detectDocumentType", () => {
    it("should detect lab report", () => {
      expect(detectDocumentType("blood_test_result.pdf")).toBe("lab_report");
    });

    it("should detect prescription", () => {
      expect(detectDocumentType("rx_meds.pdf")).toBe("prescription");
    });

    it("should detect imaging", () => {
      expect(detectDocumentType("chest_xray.jpg")).toBe("xray");
      expect(detectDocumentType("brain_mri.jpg")).toBe("mri");
    });

    it("should default to other", () => {
      expect(detectDocumentType("unknown.txt")).toBe("other");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format KB", () => {
      expect(formatFileSize(1500)).toBe("1.5 KB");
    });

    it("should format MB", () => {
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });
  });

  describe("getFileIcon", () => {
    it("should return pdf icon", () => {
      expect(getFileIcon("application/pdf")).toBe("pdf");
    });

    it("should return image icon", () => {
      expect(getFileIcon("image/jpeg")).toBe("image");
    });
  });
});
