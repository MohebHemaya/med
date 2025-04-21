import { useState, useEffect } from "react";
import { drugService } from "~/services/drug.service";

interface MedicationFormProps {
  initialValues?: {
    brandName: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    instructions?: string;
    startDate?: string;
    endDate?: string;
    reminders: {
      time: string; // HH:MM format
      daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
    }[];
  };
  onSubmit: (values: any) => void;
  isSubmitting: boolean;
}

export default function MedicationForm({
  initialValues = {
    brandName: "",
    genericName: "",
    dosage: "",
    frequency: "",
    instructions: "",
    startDate: "",
    endDate: "",
    reminders: [{ time: "09:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }],
  },
  onSubmit,
  isSubmitting,
}: MedicationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drugSearchQuery, setDrugSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Handle drug search
  const handleDrugSearch = async () => {
    if (drugSearchQuery.trim().length < 2) return;

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const result = await drugService.searchDrugsByBrandName(drugSearchQuery);
      if (result.success) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching drugs:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle drug selection from search results
  const handleDrugSelect = (drug: any) => {
    setValues({
      ...values,
      brandName: drug.brandName,
      genericName: drug.genericName || "",
    });
    setShowSearchResults(false);
    setDrugSearchQuery("");
  };

  // Handle reminder changes
  const handleReminderChange = (index: number, field: string, value: any) => {
    const updatedReminders = [...values.reminders];
    updatedReminders[index] = {
      ...updatedReminders[index],
      [field]: value,
    };
    setValues({ ...values, reminders: updatedReminders });
  };

  // Handle day of week selection
  const handleDayToggle = (reminderIndex: number, dayIndex: number) => {
    const updatedReminders = [...values.reminders];
    const currentDays = updatedReminders[reminderIndex].daysOfWeek;

    if (currentDays.includes(dayIndex)) {
      // Remove day if already selected
      updatedReminders[reminderIndex].daysOfWeek = currentDays.filter(
        (day) => day !== dayIndex
      );
    } else {
      // Add day if not selected
      updatedReminders[reminderIndex].daysOfWeek = [
        ...currentDays,
        dayIndex,
      ].sort();
    }

    setValues({ ...values, reminders: updatedReminders });
  };

  // Add a new reminder
  const addReminder = () => {
    setValues({
      ...values,
      reminders: [
        ...values.reminders,
        { time: "09:00", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
      ],
    });
  };

  // Remove a reminder
  const removeReminder = (index: number) => {
    if (values.reminders.length <= 1) return; // Keep at least one reminder

    const updatedReminders = [...values.reminders];
    updatedReminders.splice(index, 1);
    setValues({ ...values, reminders: updatedReminders });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!values.brandName.trim()) {
      newErrors.brandName = "Medication name is required";
    }

    if (!values.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }

    if (!values.frequency.trim()) {
      newErrors.frequency = "Frequency is required";
    }

    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (end < start) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    // Check that at least one reminder has at least one day selected
    const hasValidReminder = values.reminders.some(
      (reminder) => reminder.daysOfWeek.length > 0
    );

    if (!hasValidReminder) {
      newErrors.reminders =
        "At least one reminder with selected days is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(values);
    }
  };

  // Drug search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (drugSearchQuery.trim().length >= 2) {
        handleDrugSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [drugSearchQuery]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drug Search Section */}
      <div className="space-y-1">
        <label
          htmlFor="drugSearch"
          className="block text-sm font-medium text-neutral-700">
          Search Medication
        </label>
        <div className="relative">
          <input
            type="text"
            id="drugSearch"
            value={drugSearchQuery}
            onChange={(e) => setDrugSearchQuery(e.target.value)}
            placeholder="Search for medications..."
            className="w-full px-4 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {isSearching && (
            <div className="absolute right-3 top-2">
              <div className="animate-spin h-5 w-5 border-t-2 border-primary-500 rounded-full"></div>
            </div>
          )}

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-neutral-50 rounded-md shadow-lg border border-neutral-200 max-h-60 overflow-y-auto">
              <ul className="divide-y divide-neutral-100">
                {searchResults.map((drug) => (
                  <li
                    key={drug._id}
                    className="px-4 py-2 hover:bg-primary-300/30 cursor-pointer"
                    onClick={() => handleDrugSelect(drug)}>
                    <div className="font-medium">{drug.brandName}</div>
                    {drug.genericName && (
                      <div className="text-sm text-neutral-500">
                        {drug.genericName}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Medication Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="brandName"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Brand Name*
          </label>
          <input
            type="text"
            id="brandName"
            name="brandName"
            value={values.brandName}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.brandName ? "border-error" : "border-neutral-300"
            } bg-neutral-50 text-neutral-900`}
          />
          {errors.brandName && (
            <p className="mt-1 text-sm text-error">{errors.brandName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="genericName"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Generic Name
          </label>
          <input
            type="text"
            id="genericName"
            name="genericName"
            value={values.genericName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label
            htmlFor="dosage"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Dosage*
          </label>
          <input
            type="text"
            id="dosage"
            name="dosage"
            value={values.dosage}
            onChange={handleChange}
            placeholder="e.g. 10mg tablet"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.dosage ? "border-error" : "border-neutral-300"
            } bg-neutral-50 text-neutral-900`}
          />
          {errors.dosage && (
            <p className="mt-1 text-sm text-error">{errors.dosage}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="frequency"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Frequency*
          </label>
          <input
            type="text"
            id="frequency"
            name="frequency"
            value={values.frequency}
            onChange={handleChange}
            placeholder="e.g. Once daily, Twice daily"
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.frequency ? "border-error" : "border-neutral-300"
            } bg-neutral-50 text-neutral-900`}
          />
          {errors.frequency && (
            <p className="mt-1 text-sm text-error">{errors.frequency}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="instructions"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Instructions
          </label>
          <textarea
            id="instructions"
            name="instructions"
            value={values.instructions}
            onChange={handleChange}
            rows={3}
            placeholder="e.g. Take with food"
            className="w-full px-4 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"></textarea>
        </div>

        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-neutral-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={values.startDate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-neutral-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={values.endDate}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.endDate ? "border-error" : "border-neutral-300"
            } bg-neutral-50 text-neutral-900`}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-error">{errors.endDate}</p>
          )}
        </div>
      </div>

      {/* Reminders Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-neutral-800">Reminders</h2>
          <button
            type="button"
            onClick={addReminder}
            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-300/30 hover:bg-primary-300/50 focus:outline-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Reminder
          </button>
        </div>
        
        {errors.reminders && (
          <p className="mt-1 text-sm text-error">{errors.reminders}</p>
        )}
        
        <div className="space-y-6">
          {values.reminders.map((reminder, index) => (
            <div key={index} className="p-4 border border-neutral-200 rounded-md bg-neutral-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-neutral-800">
                  Reminder #{index + 1}
                </h3>
                {values.reminders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReminder(index)}
                    className="text-error hover:text-error/80 focus:outline-none">
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
              
              <div className="mb-4">
                <label
                  htmlFor={`reminder-time-${index}`}
                  className="block text-sm font-medium text-neutral-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id={`reminder-time-${index}`}
                  value={reminder.time}
                  onChange={(e) =>
                    handleReminderChange(index, "time", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-neutral-300 bg-neutral-50 text-neutral-900 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, dayIndex) => (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => handleDayToggle(index, dayIndex)}
                        className={`px-3 py-1 rounded-full text-sm font-medium focus:outline-none ${
                          reminder.daysOfWeek.includes(dayIndex)
                            ? "bg-primary-500 text-white"
                            : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        }`}>
                        {day}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="pt-5 border-t border-neutral-200">
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Medication"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
