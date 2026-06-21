import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';

// Auth Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeedbackFormPage from './pages/FeedbackFormPage';

// Dashboards
import ClientDashboard from './pages/ClientDashboard';
import PmDashboard from './pages/PmDashboard';
import ServiceManagerDashboard from './pages/ServiceManagerDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MarketingDashboard from './pages/MarketingDashboard';
import ProfilePage from './pages/ProfilePage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'customer':          return <Navigate to="/client" replace />;
    case 'portfolio_manager': return <Navigate to="/pm" replace />;
    case 'service_manager':   return <Navigate to="/service-manager" replace />;
    case 'director':          return <Navigate to="/director" replace />;
    case 'marketing':         return <Navigate to="/marketing" replace />;
    case 'admin':             return <Navigate to="/admin" replace />;
    default:                  return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
          <Router>
            <Toaster position="top-right" />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/feedback/:token" element={<FeedbackFormPage />} />
              <Route path="/" element={<DashboardRouter />} />

              {/* Client */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['customer']}><ClientDashboard /></ProtectedRoute>} />
              <Route path="/client/profile" element={<ProtectedRoute allowedRoles={['customer']}><ProfilePage navTitle="Client" /></ProtectedRoute>} />

              {/* Portfolio Manager */}
              <Route path="/pm" element={<ProtectedRoute allowedRoles={['portfolio_manager']}><PmDashboard /></ProtectedRoute>} />
              <Route path="/pm/profile" element={<ProtectedRoute allowedRoles={['portfolio_manager']}><ProfilePage navTitle="Portfolio Manager" /></ProtectedRoute>} />

              {/* Service Manager (formerly Branch Manager) */}
              <Route path="/service-manager" element={<ProtectedRoute allowedRoles={['service_manager']}><ServiceManagerDashboard /></ProtectedRoute>} />
              <Route path="/service-manager/profile" element={<ProtectedRoute allowedRoles={['service_manager']}><ProfilePage navTitle="Service Manager" /></ProtectedRoute>} />

              {/* Director */}
              <Route path="/director" element={<ProtectedRoute allowedRoles={['director']}><DirectorDashboard /></ProtectedRoute>} />
              <Route path="/director/profile" element={<ProtectedRoute allowedRoles={['director']}><ProfilePage navTitle="Director" /></ProtectedRoute>} />

              {/* Marketing */}
              <Route path="/marketing" element={<ProtectedRoute allowedRoles={['marketing']}><MarketingDashboard /></ProtectedRoute>} />
              <Route path="/marketing/profile" element={<ProtectedRoute allowedRoles={['marketing']}><ProfilePage navTitle="Marketing" /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}><ProfilePage navTitle="Administrator" /></ProtectedRoute>} />

              <Route path="/unauthorized" element={
                <div className="min-h-screen flex items-center justify-center bg-ticano-bg dark:bg-ticano-dark-bg">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-ticano-charcoal dark:text-white mb-2">Access Denied</h1>
                    <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
                  </div>
                </div>
              } />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
