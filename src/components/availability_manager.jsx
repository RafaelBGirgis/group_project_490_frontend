import { useState, useEffect } from "react";
import {
  listMyAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  listMyBusySlots,
  createManualBusySlot,
  deleteBusySlot,
} from "../api/plan_my_week";

export default function AvailabilityManager() {
  const [availabilities, setAvailabilities] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showBusyForm, setShowBusyForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    start_dt: "",
    end_dt: "",
    repeats_weekly: false,
    recurrence_end_dt: "",
  });

  const [busyFormData, setBusyFormData] = useState({
    start_dt: "",
    end_dt: "",
    note: "",
  });

  // Load availability and busy slots
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      const [avail, busy] = await Promise.all([
        listMyAvailability({
          from_dt: now.toISOString(),
          to_dt: twoWeeksAhead.toISOString(),
        }),
        listMyBusySlots({
          from_dt: now.toISOString(),
          to_dt: twoWeeksAhead.toISOString(),
        }),
      ]);

      setAvailabilities(avail);
      setBusySlots(busy);
      setError(null);
    } catch (err) {
      setError("Failed to load availability data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      if (!formData.start_dt || !formData.end_dt) {
        setError("Please fill in start and end times");
        return;
      }

      const payload = {
        start_dt: formData.start_dt,
        end_dt: formData.end_dt,
        repeats_weekly: formData.repeats_weekly,
        recurrence_end_dt: formData.recurrence_end_dt || null,
      };

      if (editingId) {
        await updateAvailability(editingId, payload);
      } else {
        await createAvailability(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        start_dt: "",
        end_dt: "",
        repeats_weekly: false,
        recurrence_end_dt: "",
      });
      await loadData();
    } catch (err) {
      setError("Failed to save availability");
      console.error(err);
    }
  };

  const handleEditAvailability = (avail) => {
    setFormData({
      start_dt: avail.start_dt || "",
      end_dt: avail.end_dt || "",
      repeats_weekly: avail.repeats_weekly || false,
      recurrence_end_dt: avail.recurrence_end_dt || "",
    });
    setEditingId(avail.id);
    setShowForm(true);
  };

  const handleDeleteAvailability = async (id) => {
    if (confirm("Delete this availability window?")) {
      try {
        await deleteAvailability(id);
        await loadData();
      } catch (err) {
        setError("Failed to delete availability");
        console.error(err);
      }
    }
  };

  const handleSaveBusySlot = async () => {
    try {
      if (!busyFormData.start_dt || !busyFormData.end_dt) {
        setError("Please fill in start and end times");
        return;
      }

      await createManualBusySlot({
        start_dt: busyFormData.start_dt,
        end_dt: busyFormData.end_dt,
        note: busyFormData.note || null,
      });

      setShowBusyForm(false);
      setBusyFormData({ start_dt: "", end_dt: "", note: "" });
      await loadData();
    } catch (err) {
      setError("Failed to save busy slot");
      console.error(err);
    }
  };

  const handleDeleteBusySlot = async (id) => {
    if (confirm("Delete this busy slot?")) {
      try {
        await deleteBusySlot(id);
        await loadData();
      } catch (err) {
        setError("Failed to delete busy slot");
        console.error(err);
      }
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return "N/A";
    try {
      const date = typeof dt === "string" ? new Date(dt) : dt;
      return date.toLocaleString();
    } catch {
      return dt;
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Availability Section */}
      <div className="bg-[#1a1f2e] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Availability</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                start_dt: "",
                end_dt: "",
                repeats_weekly: false,
                recurrence_end_dt: "",
              });
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
          >
            {showForm ? "Cancel" : "+ New Window"}
          </button>
        </div>

        {showForm && (
          <div className="bg-[#0f1419] rounded p-4 mb-4 space-y-4 border border-[#2a3142]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_dt}
                  onChange={(e) =>
                    setFormData({ ...formData, start_dt: e.target.value })
                  }
                  className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_dt}
                  onChange={(e) =>
                    setFormData({ ...formData, end_dt: e.target.value })
                  }
                  className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="repeatsWeekly"
                checked={formData.repeats_weekly}
                onChange={(e) =>
                  setFormData({ ...formData, repeats_weekly: e.target.checked })
                }
                className="w-4 h-4 rounded"
              />
              <label htmlFor="repeatsWeekly" className="text-sm">
                Repeats weekly
              </label>
            </div>

            {formData.repeats_weekly && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Recurrence End Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.recurrence_end_dt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence_end_dt: e.target.value,
                    })
                  }
                  className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveAvailability}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : availabilities.length === 0 ? (
          <div className="text-gray-400">No availability windows set</div>
        ) : (
          <div className="space-y-2">
            {availabilities.map((avail) => (
              <div
                key={avail.id}
                className="bg-[#0f1419] border border-[#2a3142] rounded p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {formatDateTime(avail.start_dt)} to{" "}
                    {formatDateTime(avail.end_dt)}
                  </div>
                  {avail.repeats_weekly && (
                    <div className="text-xs text-gray-400 mt-1">
                      Repeats weekly
                      {avail.recurrence_end_dt &&
                        ` until ${formatDateTime(avail.recurrence_end_dt)}`}
                    </div>
                  )}
                  {avail.occurrences && avail.occurrences.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {avail.occurrences.length} occurrences in range
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAvailability(avail)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAvailability(avail.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Busy Slots Section */}
      <div className="bg-[#1a1f2e] rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Blocked Time</h2>
          <button
            onClick={() => {
              setShowBusyForm(!showBusyForm);
              setBusyFormData({ start_dt: "", end_dt: "", note: "" });
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
          >
            {showBusyForm ? "Cancel" : "+ Block Time"}
          </button>
        </div>

        {showBusyForm && (
          <div className="bg-[#0f1419] rounded p-4 mb-4 space-y-4 border border-[#2a3142]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={busyFormData.start_dt}
                  onChange={(e) =>
                    setBusyFormData({
                      ...busyFormData,
                      start_dt: e.target.value,
                    })
                  }
                  className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={busyFormData.end_dt}
                  onChange={(e) =>
                    setBusyFormData({ ...busyFormData, end_dt: e.target.value })
                  }
                  className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Note (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Meeting, Personal time"
                value={busyFormData.note}
                onChange={(e) =>
                  setBusyFormData({ ...busyFormData, note: e.target.value })
                }
                className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveBusySlot}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
              >
                Block
              </button>
              <button
                onClick={() => setShowBusyForm(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {busySlots.length === 0 ? (
          <div className="text-gray-400">No blocked time</div>
        ) : (
          <div className="space-y-2">
            {busySlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-[#0f1419] border border-[#2a3142] rounded p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {formatDateTime(slot.start_dt)} to{" "}
                    {formatDateTime(slot.end_dt)}
                  </div>
                  {slot.note && (
                    <div className="text-xs text-gray-400 mt-1">{slot.note}</div>
                  )}
                  {slot.source !== "manual" && (
                    <div className="text-xs text-yellow-600 mt-1">
                      From: {slot.source}
                    </div>
                  )}
                </div>
                {slot.source === "manual" && (
                  <button
                    onClick={() => handleDeleteBusySlot(slot.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
