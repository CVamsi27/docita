import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableRow } from "./table";

describe("Table keyboard scrolling", () => {
  it("makes the scroll container reachable by keyboard", () => {
    render(<Table><TableBody><TableRow><TableCell>Entry</TableCell></TableRow></TableBody></Table>);
    const container = screen.getByRole("table").parentElement;
    expect(container).toHaveAttribute("tabindex", "0");
    container?.focus();
    expect(container).toHaveFocus();
  });
});
