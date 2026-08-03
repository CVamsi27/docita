import { describe, expect, it } from "vitest";
import {
  createUploadFormData,
  resolveUploadResult,
} from "./upload-file-helpers";

describe("upload-file-helpers", () => {
  describe("createUploadFormData", () => {
    it("appends the file under the 'file' field", () => {
      const file = new File(["hello"], "report.pdf", {
        type: "application/pdf",
      });

      const formData = createUploadFormData(file);

      expect(formData.get("file")).toBe(file);
    });
  });

  describe("resolveUploadResult", () => {
    const file = new File(["hello"], "report.pdf", { type: "application/pdf" });

    it("uses server-provided values when present", () => {
      const result = resolveUploadResult(
        {
          fileUrl: "https://cdn.example/reports/1.pdf",
          fileName: "uploaded.pdf",
          fileSize: 42,
        },
        file,
      );

      expect(result).toEqual({
        fileUrl: "https://cdn.example/reports/1.pdf",
        fileName: "uploaded.pdf",
        fileSize: 42,
      });
    });

    it("falls back to the client file name and size when the server omits them", () => {
      const result = resolveUploadResult(
        { fileUrl: "https://cdn.example/reports/1.pdf" },
        file,
      );

      expect(result).toEqual({
        fileUrl: "https://cdn.example/reports/1.pdf",
        fileName: "report.pdf",
        fileSize: 5,
      });
    });

    it("falls back to an empty fileUrl when the server omits it", () => {
      const result = resolveUploadResult({}, file);

      expect(result.fileUrl).toBe("");
      expect(result.fileName).toBe("report.pdf");
      expect(result.fileSize).toBe(5);
    });
  });
});
