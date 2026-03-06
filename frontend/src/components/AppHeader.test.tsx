import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";

vi.mock("@/hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({ theme: "light", toggleTheme: vi.fn() })),
}));

describe("AppHeader", () => {
  it("renders My Tasks title", () => {
    render(<AppHeader />);
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
  });

  it("renders theme toggle button with aria-label for switching to dark mode", () => {
    render(<AppHeader />);
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeInTheDocument();
  });
});
