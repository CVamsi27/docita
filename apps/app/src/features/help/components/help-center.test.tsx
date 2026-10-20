import { expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { HelpCenter } from "./index";
import { HelpPage } from "@/features/help/pages/help-page";

it("keeps help category headings directly below the page heading", () => {
  render(<HelpCenter />);
  expect(
    screen.getByRole("heading", { name: "How can we help you?", level: 1 }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Getting Started", level: 2 }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Patient Management", level: 2 }),
  ).toBeVisible();
});

it("places FAQ questions directly below their section heading", () => {
  render(<HelpPage />);
  expect(
    screen.getByRole("heading", { name: "Frequently Asked Questions", level: 2 }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "How do I add a new patient?", level: 3 }),
  ).toBeVisible();
});
