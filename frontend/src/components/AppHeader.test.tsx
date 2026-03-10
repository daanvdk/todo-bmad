import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

const mockUseTheme = vi.fn(() => ({
  theme: "light" as const,
  toggleTheme: vi.fn(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => mockUseTheme(),
}));

describe("AppHeader", () => {
  it("renders My Tasks title", () => {
    render(<AppHeader />);
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
  });

  it("renders aria-label for switching to dark mode when in light theme", () => {
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    render(<AppHeader />);
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });

  it("renders aria-label for switching to light mode when in dark theme", () => {
    mockUseTheme.mockReturnValue({
      theme: "dark" as const,
      toggleTheme: vi.fn(),
    });
    render(<AppHeader />);
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeInTheDocument();
  });
});
