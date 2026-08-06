import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { describe, it, expect } from "vitest";
import { PageMeta } from "./page-meta";

function renderWithHelmet(ui: React.ReactElement) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe("PageMeta", () => {
  it("sets the document title with app suffix", async () => {
    renderWithHelmet(<PageMeta title="Dashboard" />);
    await waitFor(() => {
      expect(document.title).toBe("Dashboard – Docita");
    });
  });

  it("sets title without suffix when noSuffix is true", async () => {
    renderWithHelmet(<PageMeta title="Custom Page" noSuffix />);
    await waitFor(() => {
      expect(document.title).toBe("Custom Page");
    });
  });

  it("sets description meta tag", async () => {
    renderWithHelmet(<PageMeta title="Test" description="Test description" />);
    await waitFor(() => {
      const meta = document.querySelector("meta[name='description']");
      expect(meta?.getAttribute("content")).toBe("Test description");
    });
  });

  it("uses default description when not provided", async () => {
    renderWithHelmet(<PageMeta title="Test" />);
    await waitFor(() => {
      const meta = document.querySelector("meta[name='description']");
      expect(meta?.getAttribute("content")).toBe("The operating system for modern healthcare facilities");
    });
  });

  it("sets og:title and og:description", async () => {
    renderWithHelmet(<PageMeta title="OG Test" description="OG desc" />);
    await waitFor(() => {
      expect(document.title).toBe("OG Test – Docita");
    });
    await waitFor(() => {
      const ogTitle = document.querySelector("meta[property='og:title']");
      expect(ogTitle?.getAttribute("content")).toBe("OG Test – Docita");
    });
    await waitFor(() => {
      const ogDesc = document.querySelector("meta[property='og:description']");
      expect(ogDesc?.getAttribute("content")).toBe("OG desc");
    });
  });
});
