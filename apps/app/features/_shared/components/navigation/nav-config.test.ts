import { describe, expect, it } from "vitest";

import {
  AI_ASSISTANT_NAV_ITEM,
  HELP_NAV_ITEM,
  navItems,
  navSections,
} from "./nav-config";

describe("navSections", () => {
  it("groups primary nav into TRACK and SERVICES sections", () => {
    const ids = navSections.map((section) => section.id);
    expect(ids).toEqual(["track", "services"]);
  });

  it("places /today and /patients in TRACK and /invoices in SERVICES", () => {
    const track = navSections.find((s) => s.id === "track");
    const services = navSections.find((s) => s.id === "services");
    expect(track?.items.some((item) => item.href === "/today")).toBe(true);
    expect(track?.items.some((item) => item.href === "/patients")).toBe(true);
    expect(services?.items.some((item) => item.href === "/invoices")).toBe(true);
    expect(services?.items.some((item) => item.href === "/whatsapp")).toBe(true);
  });

  it("exports flat navItems that match the union of section items", () => {
    const sectionHrefs = navSections.flatMap((s) => s.items.map((i) => i.href));
    const flatHrefs = navItems.map((i) => i.href);
    expect(flatHrefs).toEqual(sectionHrefs);
  });

  it("exports stable nav items for the assistant and help routes", () => {
    expect(AI_ASSISTANT_NAV_ITEM.href).toBe("/ai-assistant");
    expect(HELP_NAV_ITEM.href).toBe("/help");
  });
});
