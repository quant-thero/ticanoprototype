import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';

// Auth Pages
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
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
import MaintenanceMode from './components/common/MaintenanceMode';

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
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '18px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: '#ffffff',
                  color: '#1f2937',
                  boxShadow: '0 10px 30px rgba(17, 24, 39, 0.14)',
                  border: '1px solid #f1f1f4',
                },
                success: {
                  icon: '🎉',
                  style: {
                    background: '#f3fbf5',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  },
                },
                error: {
                  icon: '🙈',
                  style: {
                    background: '#fff5f5',
                    color: '#b42318',
                    border: '1px solid #fecaca',
                  },
                },
                loading: {
                  icon: '⏳',
                  style: {
                    background: '#fbf8ff',
                    color: '#5b21b6',
                    border: '1px solid #e9d5ff',
                  },
                },
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
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
            <MaintenanceMode />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
