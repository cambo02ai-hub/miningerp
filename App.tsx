import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
const DashboardView = React.lazy(() => import('./components/DashboardView'))
const ProductionView = React.lazy(() => import('./components/ProductionView'))
const FleetView = React.lazy(() => import('./components/FleetView'))
const AuditLogView = React.lazy(() => import('./components/AuditLogView'))
const HSEView = React.lazy(() => import('./components/HSEView'))
const InventoryView = React.lazy(() => import('./components/InventoryView'))
const StoreEmployeeInventoryView = React.lazy(() => import('./components/StoreEmployeeInventoryView'))
const MutationView = React.lazy(() => import('./components/MutationView'))
const EmployeeView = React.lazy(() => import('./components/EmployeeView'))
const SupplierView = React.lazy(() => import('./components/SupplierView'))
const LocationView = React.lazy(() => import('./components/LocationView'))
const TimesheetView = React.lazy(() => import('./components/TimesheetView'))
const DebtView = React.lazy(() => import('./components/DebtView'))
const UserManagementView = React.lazy(() => import('./components/UserManagementView'))
const ContractorMiningView = React.lazy(() => import('./components/ContractorMiningView'))
import LoginPage from './components/LoginPage';
import AIChatWidget from './components/AIChatWidget';
import { getAuthToken, getCurrentUser, setAuthData, clearAuthData } from './services/authStorage';
import { authAPI } from './services/api';
import { hasPermission } from './services/rbac';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const cachedUser = getCurrentUser();
      if (cachedUser) {
        let resolvedUser = cachedUser;
        try {
          const remoteUser = await authAPI.getMe();
          resolvedUser = { ...cachedUser, ...(remoteUser?.user || remoteUser) };
          const token = getAuthToken();
          if (token) setAuthData(token, resolvedUser);
        } catch {
          // Keep the cached profile when the profile endpoint is temporarily unavailable.
        }
        setCurrentUser(resolvedUser);
        setIsAuthenticated(true);
      }
      // Auto-login disabled - users must login manually
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    setCurrentUser(null);
    navigate('/');
  };

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen transition-colors duration-300 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">တင်နေပါသည်...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen transition-colors duration-300 bg-bg-page">
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto animate-fade-in">
          <React.Suspense fallback={<div className="text-center py-20 text-text-muted">တင်နေပါသည်...</div>}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><DashboardView /></ErrorBoundary>} />
              <Route path="/fleet" element={<ErrorBoundary><FleetView /></ErrorBoundary>} />
              <Route path="/mutation" element={<ErrorBoundary><MutationView /></ErrorBoundary>} />
              <Route path="/inventory" element={<ErrorBoundary><InventoryView /></ErrorBoundary>} />
              <Route path="/store-inventory" element={<ErrorBoundary><StoreEmployeeInventoryView currentUser={currentUser} /></ErrorBoundary>} />
              <Route path="/production" element={<ErrorBoundary><ProductionView /></ErrorBoundary>} />
              <Route path="/contractor-mining" element={<ErrorBoundary><ContractorMiningView /></ErrorBoundary>} />
              <Route path="/timesheet" element={<ErrorBoundary><TimesheetView /></ErrorBoundary>} />
              <Route path="/employee" element={<ErrorBoundary><EmployeeView /></ErrorBoundary>} />
              <Route path="/supplier" element={<ErrorBoundary><SupplierView /></ErrorBoundary>} />
              <Route path="/debt" element={<ErrorBoundary><DebtView /></ErrorBoundary>} />
              <Route path="/location" element={<ErrorBoundary><LocationView /></ErrorBoundary>} />
              <Route path="/hse" element={<ErrorBoundary><HSEView /></ErrorBoundary>} />
              <Route path="/audit" element={<ErrorBoundary><AuditLogView /></ErrorBoundary>} />
              <Route path="/user-management" element={hasPermission(currentUser, 'user_management.manage') ? <ErrorBoundary><UserManagementView currentUser={currentUser} /></ErrorBoundary> : <Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </div>
      </main>
      <AIChatWidget />
    </div>
  );
};

export default App;
