import { useEffect, useState } from "react";
import { Link, useNavigate } from "@remix-run/react";
import { authService } from "~/services/auth.service";
import { medicationService, Medication } from "~/services/medication.service";
import {
  socketService,
  MedicationReminderNotification,
} from "~/services/socket.service";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard - MedTrack" }];
};

interface UserInfo {
  id: string;
  email: string;
  username: string;
  userType: string;
  firstName: string;
  lastName: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<Medication[]>([]);
  const [activeReminders, setActiveReminders] = useState<
    MedicationReminderNotification[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Check user type and redirect if necessary
  useEffect(() => {
    const info = authService.getUserInfo();
    setUserInfo(info);

    // Redirect pharmacy users to pharmacy dashboard
    if (info?.userType === "pharmacy") {
      navigate("/pharmacy-dashboard");
    }
    // Redirect admin users to admin dashboard
    if (info?.userType === "admin") {
      navigate("/admin-dashboard");
    }
  }, [navigate]);

  // Fetch user medications and reminders
  useEffect(() => {
    // Skip fetching if user is not a patient
    if (userInfo?.userType !== "patient" && userInfo !== null) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      try {
        // Get all medications
        const medicationsResult =
          await medicationService.getPatientMedications();
        if (medicationsResult.success) {
          setMedications(medicationsResult.data);
        } else {
          setError("Failed to load medications");
        }

        // Get upcoming reminders
        const remindersResult = await medicationService.getUpcomingReminders(
          24
        );
        if (remindersResult.success) {
          setUpcomingReminders(remindersResult.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    if (userInfo?.userType === "patient") {
      fetchData();
    }
  }, [userInfo]);

  // Set up socket connection for real-time reminders
  useEffect(() => {
    // Only set up reminder notifications for patients
    if (userInfo?.userType !== "patient") return;

    // Handle reminder notification
    const handleReminderNotification = (
      reminder: MedicationReminderNotification
    ) => {
      console.log("Received reminder notification:", reminder);
      setActiveReminders((prev) => [...prev, reminder]);
    };

    // Set up socket listener
    socketService.setupMedicationReminderListener(handleReminderNotification);

    // Cleanup listener on unmount
    return () => {
      socketService.removeMedicationReminderListener();
    };
  }, [userInfo]);

  // Handle reminder response
  const handleReminderResponse = (
    medicationId: string,
    reminderId: string,
    action: "taken" | "snooze" | "missed"
  ) => {
    socketService.sendReminderResponse(medicationId, reminderId, action);

    // Remove the reminder from active reminders
    setActiveReminders((prev) =>
      prev.filter(
        (reminder) =>
          !(
            reminder.medicationId === medicationId && reminder.id === reminderId
          )
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Only render patient dashboard for patient users
  if (userInfo?.userType !== "patient" && userInfo !== null) {
    return null; // This should not happen as we redirect pharmacy users
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-neutral-800">
          Welcome back, {userInfo?.firstName || "Patient"}!
        </h1>
        <p className="text-neutral-600 mt-2">
          Here&apos;s a summary of your medications and upcoming reminders.
        </p>
      </div>

      {/* Active Reminders */}
      {activeReminders.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-warning flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 mr-2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
              />
            </svg>
            Active Reminders
          </h2>

          <div className="mt-4 space-y-4">
            {activeReminders.map((reminder) => (
              <div
                key={`${reminder.medicationId}-${reminder.id}`}
                className="bg-neutral-50 rounded-lg border border-warning/10 p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-neutral-800">
                      {reminder.medicationName} {reminder.dosage}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {reminder.instructions}
                    </p>
                    {reminder.isTestReminder && (
                      <span className="inline-block bg-primary-300/30 text-primary-700 text-xs px-2 py-1 rounded mt-2">
                        Test Reminder
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {new Date(reminder.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() =>
                      handleReminderResponse(
                        reminder.medicationId,
                        reminder.id,
                        "taken"
                      )
                    }
                    className="px-3 py-2 bg-success text-white text-sm font-medium rounded-md hover:bg-success/80 flex-1">
                    Taken
                  </button>
                  <button
                    onClick={() =>
                      handleReminderResponse(
                        reminder.medicationId,
                        reminder.id,
                        "snooze"
                      )
                    }
                    className="px-3 py-2 bg-warning text-white text-sm font-medium rounded-md hover:bg-warning/80 flex-1">
                    Snooze
                  </button>
                  <button
                    onClick={() =>
                      handleReminderResponse(
                        reminder.medicationId,
                        reminder.id,
                        "missed"
                      )
                    }
                    className="px-3 py-2 bg-error text-white text-sm font-medium rounded-md hover:bg-error/80 flex-1">
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medication Summary */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">
            Your Medications
          </h2>
          <Link
            to="/medications"
            className="text-primary-500 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.slice(0, 3).map((medication) => (
            <div
              key={medication._id}
              className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition">
              <h3 className="font-semibold text-neutral-800">
                {medication.brandName}
              </h3>
              <p className="text-sm text-neutral-500">{medication.dosage}</p>
              <p className="text-sm text-neutral-600 mt-2">
                {medication.instructions}
              </p>
              <div className="mt-4 flex justify-end">
                <Link
                  to={`/medications/${medication._id}`}
                  className="text-sm text-primary-500 hover:text-primary-700">
                  Details
                </Link>
              </div>
            </div>
          ))}

          {medications.length === 0 && (
            <div className="col-span-full text-center py-6 bg-neutral-100 rounded-lg">
              <p className="text-neutral-500">No medications found</p>
              <Link
                to="/medications/add"
                className="inline-block mt-2 text-primary-500 hover:text-primary-700">
                Add your first medication
              </Link>
            </div>
          )}

          {medications.length > 0 && medications.length < 3 && (
            <div className="border border-dashed border-neutral-300 rounded-lg p-4 flex flex-col items-center justify-center">
              <Link
                to="/medications/add"
                className="text-primary-500 hover:text-primary-700 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 mr-1">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add Medication
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Reminders */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">
            Upcoming Reminders
          </h2>
          <Link
            to="/reminders"
            className="text-primary-500 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>

        {upcomingReminders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingReminders.slice(0, 3).map((medication) => (
              <div
                key={medication._id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="text-right text-sm text-gray-500 mb-2">
                    {medication.nextReminder && (
                      new Date(medication.nextReminder).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    )}
                  </div>
                  <div className="uppercase font-bold text-gray-900">
                    {medication.brandName}
                  </div>
                  {medication.genericName && (
                    <div className="uppercase text-sm text-gray-600">
                      {medication.genericName}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-700">
                    <div className="font-medium">Directions:</div> 
                    <div className="text-xs mt-1">{medication.instructions}</div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded">
                      Skip
                    </button>
                    <button className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded">
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-neutral-100 rounded-lg">
            <p className="text-neutral-500">No upcoming reminders</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/medications/add"
            className="flex items-center p-4 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <div className="flex-shrink-0 bg-primary-300/30 p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary-700"
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
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Add Medication
              </h3>
              <p className="text-xs text-neutral-500">
                Add a new medication to your list
              </p>
            </div>
          </Link>

          <Link
            to="/reminders"
            className="flex items-center p-4 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <div className="flex-shrink-0 bg-primary-300/30 p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                View Reminders
              </h3>
              <p className="text-xs text-neutral-500">
                See your scheduled reminders
              </p>
            </div>
          </Link>

          <Link
            to="/drugs"
            className="flex items-center p-4 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <div className="flex-shrink-0 bg-primary-300/30 p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Browse Medications
              </h3>
              <p className="text-xs text-neutral-500">
                Search the medication database
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
