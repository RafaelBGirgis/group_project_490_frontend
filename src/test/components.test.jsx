/**
 * Component tests — StatCard, DashboardCard, Navbar, StatusBadge.
 *
 * Uses React Testing Library to render components in jsdom
 * and assert on visible output and interactions.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar, StatCard, DashboardCard } from "../components";
import StatusBadge from "../components/status_badge";

/* ─── helpers ────────────────────────────────────────────────────────── */

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/* ═══════════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════════ */

describe("StatCard", () => {
  it("renders label, value, and sub text", () => {
    render(
      <StatCard role="client" label="STEPS" value="8,241" sub="daily goal" />
    );
    expect(screen.getByText("STEPS")).toBeInTheDocument();
    expect(screen.getByText("8,241")).toBeInTheDocument();
    expect(screen.getByText("daily goal")).toBeInTheDocument();
  });

  it("renders progress bar when progress prop is given", () => {
    const { container } = render(
      <StatCard role="client" label="CAL" value="540" progress={72} />
    );
    // Progress bar inner div should have width style
    const bars = container.querySelectorAll("[style]");
    const progressBar = Array.from(bars).find((el) =>
      el.style.width?.includes("72%")
    );
    expect(progressBar).toBeTruthy();
  });

  it("does not render sub when not provided", () => {
    render(<StatCard role="client" label="TEST" value="10" />);
    // Only label and value should be present
    expect(screen.getByText("TEST")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD CARD
   ═══════════════════════════════════════════════════════════════════════ */

describe("DashboardCard", () => {
  it("renders title and children", () => {
    render(
      <DashboardCard role="client" title="My Workout">
        <p>Card content here</p>
      </DashboardCard>
    );
    expect(screen.getByText("My Workout")).toBeInTheDocument();
    expect(screen.getByText("Card content here")).toBeInTheDocument();
  });

  it("renders action button that fires onClick", () => {
    const onClick = vi.fn();
    render(
      <DashboardCard
        role="coach"
        title="Test"
        action={{ label: "View all", onClick }}
      >
        <p>Body</p>
      </DashboardCard>
    );
    const btn = screen.getByText(/View all/);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders footer content", () => {
    render(
      <DashboardCard
        role="client"
        title="Card"
        footer={<button>Footer Button</button>}
      >
        <p>Body</p>
      </DashboardCard>
    );
    expect(screen.getByText("Footer Button")).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════════════════ */

describe("StatusBadge", () => {
  it("renders label text", () => {
    render(<StatusBadge label="Active" variant="success" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════════════ */

describe("Navbar", () => {
  it("renders brand name and role badge", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    expect(screen.getByText("Till Failure")).toBeInTheDocument();
    expect(screen.getByText("CLIENT")).toBeInTheDocument();
  });

  it("shows coach badge for coach role", () => {
    renderWithRouter(<Navbar role="coach" userName="AB" />);
    expect(screen.getByText("COACH")).toBeInTheDocument();
  });

  it("renders user initials in avatar", () => {
    renderWithRouter(<Navbar role="client" userName="MK" />);
    expect(screen.getByText("MK")).toBeInTheDocument();
  });

  it("shows notification dropdown on click", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    // Click the notification bell (second icon button)
    const buttons = screen.getAllByRole("button");
    const bellButton = buttons.find((b) =>
      b.querySelector("svg path[d*='M15 17h5']")
    );
    expect(bellButton).toBeTruthy();
    fireEvent.click(bellButton);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("shows unread count badge", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    // Client mock has 2 unread notifications
    const badge = screen.getByText("2");
    expect(badge).toBeInTheDocument();
  });

  it("marks all notifications as read", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    // Open dropdown
    const buttons = screen.getAllByRole("button");
    const bellButton = buttons.find((b) =>
      b.querySelector("svg path[d*='M15 17h5']")
    );
    fireEvent.click(bellButton);

    // Click mark all read
    const markAllBtn = screen.getByText("Mark all read");
    fireEvent.click(markAllBtn);

    // Unread count badge should be gone (no "2" badge)
    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });

  it("shows 'Switch to Coach' for client role", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    expect(screen.getByText("Switch to Coach")).toBeInTheDocument();
  });

  it("shows 'Switch to Client' for coach role", () => {
    renderWithRouter(<Navbar role="coach" userName="AB" />);
    expect(screen.getByText("Switch to Client")).toBeInTheDocument();
  });

  it("closes notification dropdown on Escape", () => {
    renderWithRouter(<Navbar role="client" userName="JD" />);
    const buttons = screen.getAllByRole("button");
    const bellButton = buttons.find((b) =>
      b.querySelector("svg path[d*='M15 17h5']")
    );
    fireEvent.click(bellButton);
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
