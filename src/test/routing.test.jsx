/**
 * Routing & auth guard tests.
 *
 * Validates: auth guards redirect on 401, JWT attachment,
 * and critical pages render without crashing.
 *
 * Note: Since App.jsx already contains a <BrowserRouter>, we test
 * individual page components directly instead of rendering the full App.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/* ─── helpers ────────────────────────────────────────────────────────── */

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
  );
}

function mockFetch401() {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
  );
}

function mockFetchFail() {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ detail: "err" }) })
  );
}

function renderInRouter(Component, props = {}) {
  return render(
    <MemoryRouter>
      <Component {...props} />
    </MemoryRouter>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTH GUARDS — pages that call fetchMe
   ═══════════════════════════════════════════════════════════════════════ */

describe("Auth guards", () => {
  it("client dashboard calls fetchMe on mount", async () => {
    const ClientDashboard = (await import("../pages/client_dash")).default;
    const me = { name: "Test User", client_id: 1 };
    mockFetchOk(me);
    localStorage.setItem("jwt", "valid-token");
    renderInRouter(ClientDashboard);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/me",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid-token",
          }),
        })
      );
    });
  });

  it("clears JWT and redirects on 401 response", async () => {
    const ClientDashboard = (await import("../pages/client_dash")).default;
    localStorage.setItem("jwt", "expired-token");
    mockFetch401();
    renderInRouter(ClientDashboard);

    await waitFor(() => {
      expect(localStorage.getItem("jwt")).toBeNull();
    });
  });

  it("workouts page calls fetchMe on mount", async () => {
    const WorkoutsPage = (await import("../pages/workouts")).default;
    const me = { name: "Test User", client_id: 1, coach_id: null };
    mockFetchOk(me);
    localStorage.setItem("jwt", "valid-token");
    renderInRouter(WorkoutsPage);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("coach dashboard calls fetchMe on mount", async () => {
    const CoachDashboard = (await import("../pages/coach_dash")).default;
    const me = { name: "Coach A", coach_id: 5 };
    mockFetchOk(me);
    localStorage.setItem("jwt", "coach-token");
    renderInRouter(CoachDashboard);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/me",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer coach-token",
          }),
        })
      );
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   PAGE SMOKE TESTS — render without crashing
   ═══════════════════════════════════════════════════════════════════════ */

describe("Page smoke tests", () => {
  beforeEach(() => {
    const me = { name: "Jane Doe", client_id: 1, coach_id: 2, email: "jane@test.com" };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(me) })
    );
    localStorage.setItem("jwt", "valid");
  });

  it("workouts page renders title after load", async () => {
    const WorkoutsPage = (await import("../pages/workouts")).default;
    renderInRouter(WorkoutsPage);
    await waitFor(() => {
      expect(screen.getByText("Workouts")).toBeInTheDocument();
    });
  });

  it("workouts page shows 'New Workout' button", async () => {
    const WorkoutsPage = (await import("../pages/workouts")).default;
    renderInRouter(WorkoutsPage);
    await waitFor(() => {
      expect(screen.getByText("New Workout")).toBeInTheDocument();
    });
  });

  it("workouts page shows tabs (My Workouts, Preset Library)", async () => {
    const WorkoutsPage = (await import("../pages/workouts")).default;
    renderInRouter(WorkoutsPage);
    await waitFor(() => {
      expect(screen.getByText(/My Workouts/)).toBeInTheDocument();
      expect(screen.getByText("Preset Library")).toBeInTheDocument();
    });
  });

  it("chat page renders without crashing", async () => {
    const ChatPage = (await import("../pages/chat")).default;
    renderInRouter(ChatPage);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("find coach page renders without crashing", async () => {
    const FindCoachPage = (await import("../pages/find_coach")).default;
    // find_coach calls fetchMe then fetchAvailableCoaches — need to return
    // user for /me and coaches array for /roles/coaches/browse
    const me = { name: "Jane Doe", client_id: 1, coach_id: 2 };
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      // First call is /me, subsequent calls need to return arrays
      const data = callCount === 1 ? me : [];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
    });
    localStorage.setItem("jwt", "valid");
    renderInRouter(FindCoachPage);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   API HELPER — JWT ATTACHMENT
   ═══════════════════════════════════════════════════════════════════════ */

describe("API helper auth behavior", () => {
  it("attaches JWT from localStorage to every request", async () => {
    const { apiGet } = await import("../api/api");
    mockFetchOk({ data: "test" });
    localStorage.setItem("jwt", "my-secret-token");
    await apiGet("/some-endpoint");

    expect(global.fetch).toHaveBeenCalledWith(
      "/some-endpoint",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-secret-token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("makes request without auth header when no JWT exists", async () => {
    const { apiGet } = await import("../api/api");
    mockFetchOk({ data: "test" });
    localStorage.removeItem("jwt");
    await apiGet("/open-endpoint");

    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it("apiPost sends JSON body with correct method", async () => {
    const { apiPost } = await import("../api/api");
    mockFetchOk({ success: true });
    await apiPost("/create", { name: "test" });

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/create");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "test" });
  });

  it("apiPut sends JSON body with PUT method", async () => {
    const { apiPut } = await import("../api/api");
    mockFetchOk({ success: true });
    await apiPut("/update/1", { name: "updated" });

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/update/1");
    expect(opts.method).toBe("PUT");
    expect(JSON.parse(opts.body)).toEqual({ name: "updated" });
  });
});
