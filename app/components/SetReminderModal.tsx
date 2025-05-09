import { useState, useEffect, useRef } from "react";
import { medicationService } from "~/services/medication.service";
import type { Medication } from "~/services/medication.service";

interface SetReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication;
}

export default function SetReminderModal({
  isOpen,
  onClose,
  medication,
}: SetReminderModalProps) {
  const [reminders, setReminders] = useState([
    { time: "09:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize reminders from medication if they exist
  useEffect(() => {
    if (medication.reminders && medication.reminders.length > 0) {
      setReminders(
        medication.reminders.map((reminder) => ({
          time: reminder.time,
          daysOfWeek: reminder.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
        }))
      );
    }
  }, [medication]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleTimeChange = (index: number, time: string) => {
    const updatedReminders = [...reminders];
    updatedReminders[index].time = time;
    setReminders(updatedReminders);
  };

  const handleDayToggle = (reminderIndex: number, dayIndex: number) => {
    const updatedReminders = [...reminders];
    const currentDays = updatedReminders[reminderIndex].daysOfWeek;

    if (currentDays.includes(dayIndex)) {
      updatedReminders[reminderIndex].daysOfWeek = currentDays.filter(
        (day) => day !== dayIndex
      );
    } else {
      updatedReminders[reminderIndex].daysOfWeek = [...currentDays, dayIndex].sort();
    }

    setReminders(updatedReminders);
  };

  const addReminder = () => {
    setReminders([
      ...reminders,
      { time: "09:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    ]);
  };

  const removeReminder = (index: number) => {
    if (reminders.length <= 1) return;
    const updatedReminders = [...reminders];
    updatedReminders.splice(index, 1);
    setReminders(updatedReminders);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      // Format reminders for the API
      const formattedReminders = reminders.map((reminder) => {
        // Ensure time is in HH:mm format
        const [hours, minutes] = reminder.time.split(":").map(Number);
        const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

        return {
          time: formattedTime,
          daysOfWeek: reminder.daysOfWeek,
          status: "active",
        };
      });

      const response = await medicationService.updateMedication(medication._id, {
        reminders: formattedReminders,
      });

      if (response.success) {
        onClose();
      } else {
        setError(response.message || "Failed to update reminders");
      }
    } catch (err) {
      console.error("Error updating reminders:", err);
      setError("Failed to update reminders");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Set Reminders for {medication.brandName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {reminders.map((reminder, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">Reminder {index + 1}</h3>
                  {reminders.length > 1 && (
                    <button
                      onClick={() => removeReminder(index)}
                      className="text-red-600 hover:text-red-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={reminder.time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (day, dayIndex) => (
                          <button
                            key={day}
                            onClick={() => handleDayToggle(index, dayIndex)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              reminder.daysOfWeek.includes(dayIndex)
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                            {day}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addReminder}
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Add Another Reminder
            </button>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save Reminders"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 