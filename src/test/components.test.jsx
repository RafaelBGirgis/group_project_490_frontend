/**
 * Component tests — StatCard, DashboardCard, Navbar, StatusBadge.
 *
 * Uses React Testing Library to render components in jsdom
 * and assert on visible output and interactions.
 */

import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar, StatCard, DashboardCard } from "../components";
import StatusBadge from "../components/status_badge";
import {
  queryNotifications,
  readAllNotifications,
  readNotification,
} from "../api/notifications";

vi.mock("../api/notifications", () => ({
  queryNotifications: vi.fn(),
  readNotification: vi.fn(),
  readAllNotifications: vi.fn(),
}));

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
  const backendNotifications = [
    {
      id: 1,
      fav_category: "workout_plan",
      message: "Your coach prescribed a new workout plan.",
      details: "Workout plan 7 is ready.",
      is_read: false,
      created_at: "2026-04-30",
    },
    {
      id: 2,
      fav_category: "payment",
      message: "A new invoice was issued.",
      details: "Invoice 12",
      is_read: false,
      created_at: "2026-04-29",
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    queryNotifications.mockReset();
    readNotification.mockReset();
    readAllNotifications.mockReset();
    queryNotifications.mockResolvedValue(backendNotifications);
    readNotification.mockImplementation((id) =>
      Promise.resolve({
        ...backendNotifications.find((notification) => notification.id === id),
        is_read: true,
      })
    );
    readAllNotifications.mockResolvedValue({ message: "2 notifications marked as read" });
  });

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

  it("loads notifications from backend and shows dropdown on click", async () => {
    localStorage.setItem("jwt", "token");
    renderWithRouter(<Navbar role="client" userName="JD" />);
    await waitFor(() => expect(queryNotifications).toHaveBeenCalled());
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellButton);
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Your coach prescribed a new workout plan.")).toBeInTheDocument();
  });

  it("shows unread count badge", async () => {
    localStorage.setItem("jwt", "token");
    renderWithRouter(<Navbar role="client" userName="JD" />);
    expect(await screen.findByText("2")).toBeInTheDocument();
  });

  it("marks all notifications as read", async () => {
    localStorage.setItem("jwt", "token");
    renderWithRouter(<Navbar role="client" userName="JD" />);
    await screen.findByText("2");
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellButton);

    const markAllBtn = screen.getByText("Read all");
    fireEvent.click(markAllBtn);

    await waitFor(() => expect(readAllNotifications).toHaveBeenCalled());
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("marks one notification as read when selected", async () => {
    localStorage.setItem("jwt", "token");
    renderWithRouter(<Navbar role="client" userName="JD" />);
    await screen.findByText("2");
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellButton);

    fireEvent.click(screen.getByText("A new invoice was issued."));

    await waitFor(() => expect(readNotification).toHaveBeenCalledWith(2));
  });

  it("shows 'Switch to Coach' for approved client role", () => {
    renderWithRouter(<Navbar role="client" userName="JD" canSwitchToCoach />);
    expect(screen.getByText("Switch to Coach")).toBeInTheDocument();
  });

  it("shows 'Switch to Client' for coach role", () => {
    renderWithRouter(<Navbar role="coach" userName="AB" />);
    expect(screen.getByText("Switch to Client")).toBeInTheDocument();
  });

  it("closes notification dropdown on Escape", async () => {
    localStorage.setItem("jwt", "token");
    renderWithRouter(<Navbar role="client" userName="JD" />);
    await screen.findByText("2");
    const bellButton = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bellButton);
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });
});
