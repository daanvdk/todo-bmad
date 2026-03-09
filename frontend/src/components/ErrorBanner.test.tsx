import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the message", () => {
    render(<ErrorBanner message="Network issue" />);
    expect(screen.getByText("Network issue")).toBeInTheDocument();
  });

  it("has role=alert for screen reader announcement", () => {
    render(<ErrorBanner message="Failed to save" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("displays the correct message text in the alert element", () => {
    render(<ErrorBanner message="Failed to delete" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to delete");
  });
});
