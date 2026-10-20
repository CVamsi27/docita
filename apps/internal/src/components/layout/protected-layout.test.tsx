import { StrictMode } from "react";
import { RootLayout } from "@/components/layout/root-layout";
import { MemoryRouter, Route, Routes } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@/test-utils";
import { AuthContext } from "@/lib/auth/auth-context-inner";
import { ThemeContext } from "@/components/layout/theme-context";
import { ProtectedLayout } from "@/components/layout/protected-layout";

function renderLayout() {
  const logout = vi.fn();
  const setTheme = vi.fn();
  render(
    <AuthContext.Provider
      value={{
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: true,
        isInternal: true,
        login: vi.fn(),
        logout,
        validateToken: async () => true,
      }}
    >
      <ThemeContext.Provider
        value={{ theme: "light", resolvedTheme: "light", setTheme }}
      >
        <TooltipProvider>
          <StrictMode>
            <HelmetProvider>
              <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                  <Route element={<RootLayout />}>
                    <Route element={<ProtectedLayout />}>
                      <Route
                        path="dashboard"
                        element={<p>Facility workspace</p>}
                      />
                      <Route path="users" element={<p>User workspace</p>} />
                    </Route>
                  </Route>
                </Routes>
              </MemoryRouter>
            </HelmetProvider>
          </StrictMode>
        </TooltipProvider>
      </ThemeContext.Provider>
    </AuthContext.Provider>,
  );
  return { logout, setTheme };
}

describe("internal console shell", () => {
  it("retains named destinations and footer controls when collapsed", async () => {
    const { logout, setTheme } = renderLayout();
    expect(screen.getByText("Internal console")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    const users = screen.getByRole("link", { name: "Users" });
    expect(users).toHaveAttribute("href", "/users");
    users.focus();
    fireEvent.click(users);
    expect(await screen.findByText("User workspace")).toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Switch to dark mode" }),
    );
    expect(setTheme).toHaveBeenCalledWith("dark");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("opens mobile navigation and restores menu focus after Escape", async () => {
    renderLayout();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    fireEvent.click(trigger);
    const navigation = screen.getByRole("dialog", {
      name: "Internal navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: "Enterprise Contracts" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(navigation, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("updates the browser title and current destination after navigation", async () => {
    renderLayout();
    await waitFor(() =>
      expect(document.title).toBe("Dashboard – Docita Internal"),
    );
    fireEvent.click(screen.getByRole("link", { name: "Users" }));
    await waitFor(() => expect(document.title).toBe("Users – Docita Internal"));
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("names collapsed destinations in a keyboard tooltip", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    screen.getByRole("link", { name: "Payment Processing" }).focus();
    expect(
      await screen.findByRole("tooltip", { name: "Payment Processing" }),
    ).toBeVisible();
  });

  it("closes mobile navigation after following a destination", async () => {
    renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const navigation = screen.getByRole("dialog", {
      name: "Internal navigation",
    });
    fireEvent.click(within(navigation).getByRole("link", { name: "Users" }));
    expect(await screen.findByText("User workspace")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
