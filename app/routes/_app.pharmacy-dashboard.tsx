import { useEffect, useState } from "react";
import { Link, useNavigate } from "@remix-run/react";
import { authService } from "~/services/auth.service";
import { socketService } from "~/services/socket.service";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Pharmacy Dashboard - MedTrack" }];
};

interface UserInfo {
  id: string;
  email: string;
  username: string;
  userType: string;
  firstName: string;
  lastName: string;
  pharmacyName?: string;
}

// Mock data - in a real app, you'd fetch this from your API
interface PendingRequest {
  id: string;
  patientName: string;
  medicationName: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
}

interface RecentChat {
  id: string;
  patientName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

export default function PharmacyDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [stats, setStats] = useState({
    totalPrescriptionsFilled: 0,
    pendingRefills: 0,
    activePatients: 0,
  });

  // Check user type and redirect if necessary
  useEffect(() => {
    const info = authService.getUserInfo();
    setUserInfo(info);

    // Redirect patient users to patient dashboard
    if (info?.userType === "patient") {
      navigate("/dashboard");
      return;
    }
    // Redirect admin users to admin dashboard
    if (info?.userType === "admin") {
      navigate("/admin-dashboard");
      return;
    }

    // Load pharmacy dashboard data
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError("");

      try {
        // In a real app, you'd fetch this data from your API
        // For now, we'll use mock data
        setTimeout(() => {
          setPendingRequests([
            {
              id: "req1",
              patientName: "John Doe",
              medicationName: "Lisinopril 10mg",
              status: "pending",
              requestDate: "2023-06-15T10:30:00Z",
            },
            {
              id: "req2",
              patientName: "Jane Smith",
              medicationName: "Metformin 500mg",
              status: "pending",
              requestDate: "2023-06-14T14:45:00Z",
            },
            {
              id: "req3",
              patientName: "Michael Johnson",
              medicationName: "Atorvastatin 20mg",
              status: "pending",
              requestDate: "2023-06-14T09:15:00Z",
            },
          ]);

          setRecentChats([
            {
              id: "chat1",
              patientName: "John Doe",
              lastMessage: "Do you have my prescription ready?",
              timestamp: "2023-06-15T11:30:00Z",
              unread: true,
            },
            {
              id: "chat2",
              patientName: "Sarah Williams",
              lastMessage: "Thank you for the information!",
              timestamp: "2023-06-14T16:20:00Z",
              unread: false,
            },
            {
              id: "chat3",
              patientName: "Robert Brown",
              lastMessage: "I'll pick up my medication tomorrow.",
              timestamp: "2023-06-13T13:45:00Z",
              unread: false,
            },
          ]);

          setStats({
            totalPrescriptionsFilled: 157,
            pendingRefills: 12,
            activePatients: 83,
          });

          setIsLoading(false);
        }, 1000);
      } catch (err) {
        console.error("Error fetching pharmacy dashboard data:", err);
        setError("Failed to load dashboard data");
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  // Only render pharmacy dashboard for pharmacy users
  if (userInfo?.userType !== "pharmacy" && userInfo !== null) {
    return null; // This should not happen as we redirect patient users
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-neutral-800">
          Welcome, {userInfo?.pharmacyName || userInfo?.firstName}!
        </h1>
        <p className="text-neutral-600 mt-2">
          Manage your pharmacy operations and patient communications from this dashboard.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-50 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-primary-300/30 text-primary-700">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-neutral-800">Total Prescriptions</h2>
              <p className="text-3xl font-bold text-primary-700">{stats.totalPrescriptionsFilled}</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-warning/20 text-warning">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-neutral-800">Pending Refills</h2>
              <p className="text-3xl font-bold text-warning">{stats.pendingRefills}</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success/20 text-success">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-neutral-800">Active Patients</h2>
              <p className="text-3xl font-bold text-success">{stats.activePatients}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Prescription Requests */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">
            Pending Prescription Requests
          </h2>
          <Link
            to="/prescription-requests"
            className="text-primary-500 hover:text-primary-700 text-sm font-medium">
            View All
          </Link>
        </div>

        {error && (
          <div className="bg-error/10 text-error p-4 rounded-md mb-4">
            {error}
          </div>
        )}

        {pendingRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Medication
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Request Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-neutral-50 divide-y divide-neutral-200">
                {pendingRequests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-800">
                      {request.patientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {request.medicationName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {formatDate(request.requestDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning/20 text-warning">
                        Pending
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-500 hover:text-primary-700 mr-4">
                        Approve
                      </button>
                      <button className="text-error hover:text-error/80">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-neutral-100 rounded-lg">
            <p className="text-neutral-500">No pending prescription requests</p>
          </div>
        )}
      </div>

      {/* Recent Patient Messages */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-neutral-800">
            Recent Patient Messages
          </h2>
          <Link
            to="/pharmacies/chat"
            className="text-primary-500 hover:text-primary-700 text-sm font-medium">
            View All Conversations
          </Link>
        </div>

        {recentChats.length > 0 ? (
          <div className="space-y-4">
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                to={`/pharmacies/chat/${chat.id}`}
                className="block border border-neutral-200 rounded-lg p-4 hover:bg-neutral-100 transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary-300/30 flex items-center justify-center text-primary-700 font-semibold">
                        {chat.patientName.split(" ").map(name => name[0]).join("")}
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-neutral-900 flex items-center">
                        {chat.patientName}
                        {chat.unread && <span className="ml-2 inline-block w-2 h-2 bg-primary-500 rounded-full"></span>}
                      </h3>
                      <p className="text-sm text-neutral-600 line-clamp-1">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatTime(chat.timestamp)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-neutral-100 rounded-lg">
            <p className="text-neutral-500">No recent messages</p>
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
            to="/prescription-requests"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Manage Prescriptions
              </h3>
              <p className="text-xs text-neutral-500">
                Process pending prescription requests
              </p>
            </div>
          </Link>

          <Link
            to="/pharmacies/chat"
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
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Patient Messages
              </h3>
              <p className="text-xs text-neutral-500">
                Respond to patient inquiries
              </p>
            </div>
          </Link>

          <Link
            to="/inventory"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Inventory Management
              </h3>
              <p className="text-xs text-neutral-500">
                Check and update medication inventory
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
} 