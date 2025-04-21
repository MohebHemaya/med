import { Link, Outlet, useNavigate, useLocation } from "@remix-run/react";
import { useEffect, useState, ReactNode } from "react";
import { authService } from "~/services/auth.service";
import { socketService } from "~/services/socket.service";

interface AuthLayoutProps {
  children?: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState<string>("");
  const [userType, setUserType] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate("/login");
      return;
    }

    // Get user info from token
    const userInfo = authService.getUserInfo();
    if (userInfo) {
      setUsername(userInfo.username);
      setUserType(userInfo.userType);
    }

    // Initialize socket connection
    socketService.initializeSocket();

    // Cleanup socket connection on unmount
    return () => {
      socketService.disconnectSocket();
    };
  }, [navigate]);

  const handleLogout = () => {
    socketService.disconnectSocket();
    authService.logout();
    navigate("/login");
  };

  // Check if a link is active
  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Top Navigation Header - Always visible */}
      <header className="bg-neutral-50 border-b border-neutral-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-10 h-10 bg-primary-500 text-white rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-6 h-6">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    />
                  </svg>
                </div>
                <span className="text-xl font-bold text-neutral-900">
                  Med-Track
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/dashboard")
                    ? "bg-primary-300/30 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
                } transition-colors`}>
                Dashboard
              </Link>
              <Link
                to="/medications"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/medications")
                    ? "bg-primary-300/30 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
                } transition-colors`}>
                Medications
              </Link>
              <Link
                to="/reminders"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/reminders")
                    ? "bg-primary-300/30 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
                } transition-colors`}>
                Reminders
              </Link>
              <Link
                to="/drugs"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/drugs")
                    ? "bg-primary-300/30 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
                } transition-colors`}>
                Drug Library
              </Link>
              <Link
                to="/pharmacies"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/pharmacies")
                    ? "bg-primary-300/30 text-primary-700"
                    : "text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"
                } transition-colors`}>
                Pharmacies
              </Link>
            </nav>

            {/* User Menu - Always visible */}
            <div className="flex items-center">
              <div className="mr-3 hidden md:block">
                <span className="text-sm text-neutral-500">Hello, </span>
                <span className="text-sm font-medium text-neutral-900">
                  {username}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {children ? children : <Outlet />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-50 border-t border-neutral-200 shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center justify-center ${
              isActive("/dashboard")
                ? "text-primary-500"
                : "text-neutral-500"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 truncate">Dashboard</span>
          </Link>
          <Link
            to="/medications"
            className={`flex flex-col items-center justify-center ${
              isActive("/medications")
                ? "text-primary-500"
                : "text-neutral-500"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-xs mt-1 truncate">Medications</span>
          </Link>
          <Link
            to="/reminders"
            className={`flex flex-col items-center justify-center ${
              isActive("/reminders")
                ? "text-primary-500"
                : "text-neutral-500"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1 truncate">Reminders</span>
          </Link>
          <Link
            to="/pharmacies"
            className={`flex flex-col items-center justify-center ${
              isActive("/pharmacies")
                ? "text-primary-500"
                : "text-neutral-500"
            }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-xs mt-1 truncate">Pharmacies</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
