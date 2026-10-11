import { MemoryRouter, Route, Routes } from "react-router";
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
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route element={<ProtectedLayout />}>
                <Route path="dashboard" element={<p>Facility workspace</p>} />
                <Route path="users" element={<p>User workspace</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
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
    const users = screen.getByRole("button", { name: "Users" });
    users.focus();
    fireEvent.click(users);
    expect(await screen.findByText("User workspace")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
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
      within(navigation).getByRole("button", { name: "Enterprise Contracts" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(navigation, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
