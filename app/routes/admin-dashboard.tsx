import { useEffect, useState } from "react";
import { authService } from "../services/auth.service";
import { useNavigate, Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Admin Dashboard - MedTrack" }];
};

interface UserInfo {
  id: string;
  email: string;
  username: string;
  userType: string;
  firstName: string;
  lastName: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPharmacies: 0,
    pendingApprovals: 0,
    totalDrugs: 0
  });

  useEffect(() => {
    const info = authService.getUserInfo();
    setUserInfo(info);
    // Only allow admin users
    if (info?.userType !== "admin") {
      if (info?.userType === "pharmacy") {
        navigate("/pharmacy-dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      // Fetch admin dashboard statistics from the database
      fetchAdminStats();
    }
  }, [navigate]);

  const fetchAdminStats = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Replace with actual API call to fetch statistics
      const response = await fetch("/api/admin/stats");
      const data = await response.json();
      setStats(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching admin statistics:", error);
      setError("Failed to load dashboard data");
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
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

  if (!userInfo || userInfo.userType !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Navigation Bar */}
      <nav className="bg-primary-700 text-white p-4 flex justify-between items-center">
        <div className="flex space-x-4">
          <Link to="/admin/users" className="flex items-center space-x-1 hover:text-primary-300">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4v6M3 16v6" /></svg>
            Users
          </Link>
          <Link to="/admin/pharmacies" className="flex items-center space-x-1 hover:text-primary-300">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Pharmacies
          </Link>
          <Link to="/admin/pending-approvals" className="flex items-center space-x-1 hover:text-primary-300">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Pending Approvals
          </Link>
          <Link to="/admin/drug-library" className="flex items-center space-x-1 hover:text-primary-300">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Drug Library
          </Link>
        </div>
        <div className="flex items-center space-x-4">
          <span>{userInfo.firstName} {userInfo.lastName}</span>
          <button onClick={handleLogout} className="hover:text-primary-300">Logout</button>
        </div>
      </nav>

      {/* Welcome Section */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">
              Welcome, Admin!
            </h1>
            <p className="text-neutral-600 mt-2">
              Manage all patients, pharmacies, and approve or deny pharmacy registrations.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-neutral-800">Total Users</h2>
              <p className="text-3xl font-bold text-primary-700">{stats.totalUsers}</p>
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-neutral-800">Total Pharmacies</h2>
              <p className="text-3xl font-bold text-success">{stats.totalPharmacies}</p>
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
              <h2 className="text-lg font-semibold text-neutral-800">Pending Approvals</h2>
              <p className="text-3xl font-bold text-warning">{stats.pendingApprovals}</p>
            </div>
          </div>
        </div>

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
              <h2 className="text-lg font-semibold text-neutral-800">Total Drugs</h2>
              <p className="text-3xl font-bold text-primary-700">{stats.totalDrugs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-neutral-50 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
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
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4v6M3 16v6"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Manage Users
              </h3>
              <p className="text-xs text-neutral-500">
                View and manage user accounts
              </p>
            </div>
          </Link>

          <Link
            to="/admin/pharmacies"
            className="flex items-center p-4 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <div className="flex-shrink-0 bg-success/20 p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Manage Pharmacies
              </h3>
              <p className="text-xs text-neutral-500">
                View and manage pharmacy accounts
              </p>
            </div>
          </Link>

          <Link
            to="/admin/pending-approvals"
            className="flex items-center p-4 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <div className="flex-shrink-0 bg-warning/20 p-2 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-warning"
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
                Pending Approvals
              </h3>
              <p className="text-xs text-neutral-500">
                Review and approve pharmacy registrations
              </p>
            </div>
          </Link>

          <Link
            to="/admin/drug-library"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-neutral-900">
                Drug Library
              </h3>
              <p className="text-xs text-neutral-500">
                Manage medications in the system
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Error message display */}
      {error && (
        <div className="bg-error/10 text-error p-4 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
} 