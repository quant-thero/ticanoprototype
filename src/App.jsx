import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import SessionExpiredScreen from './components/common/SessionExpiredScreen';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import { AIAssistantProvider } from './context/AIAssistantContext';
import TicanoAssistantWidget from './components/ai/TicanoAssistantWidget';
import ForcePasswordChangeModal from './components/common/ForcePasswordChangeModal';
import { LoadingSpinner } from './components/common/UI';

// Auth Pages, small, needed for first paint, loaded eagerly.
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import OurJourneyPage from './pages/OurJourneyPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import FeedbackFormPage from './pages/FeedbackFormPage';

// After a new deployment, a browser tab that's been open since before the
// deploy still has the OLD main bundle in memory, if it then tries to
// lazy-load a dashboard chunk, it asks for that chunk's OLD hashed
// filename, which no longer exists on the server (the new build has
// different hashes). Vercel's SPA rewrite serves index.html for any
// unmatched path rather than a 404, so the browser gets back HTML where
// it expected JavaScript and refuses to run it ("Expected a
// JavaScript-or-Wasm module script but the server responded with a MIME
// type of text/html"). This is a standard, well-known consequence of
// content-hashed chunk filenames plus an SPA fallback, not a bug in the
// dashboard code itself. A plain page reload always fixes it because the
// reload fetches the current index.html, which references the CURRENT
// chunk hashes. This wrapper does that reload automatically, once, so
// nobody has to figure out "just refresh" themselves.
function lazyWithReload(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(err?.message || '');
      const reloadKey = 'ticano_chunk_reload_attempted';
      if (isChunkError && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        // Never resolves, the reload is already in flight, and resolving
        // here with nothing would just flash a broken render first.
        return new Promise(() => {});
      }
      throw err;
    })
  );
}

// Dashboards, large (charts, analytics, many tabs each), split into their
// own chunks so signing in as a Client doesn't also download the Director/
// Admin/Marketing bundles.
const ClientDashboard = lazyWithReload(() => import('./pages/ClientDashboard'));
const PmDashboard = lazyWithReload(() => import('./pages/PmDashboard'));
const ServiceManagerDashboard = lazyWithReload(() => import('./pages/ServiceManagerDashboard'));
const DirectorDashboard = lazyWithReload(() => import('./pages/DirectorDashboard'));
const AdminDashboard = lazyWithReload(() => import('./pages/AdminDashboard'));
const MarketingDashboard = lazyWithReload(() => import('./pages/MarketingDashboard'));
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage'));
import MaintenanceMode from './components/common/MaintenanceMode';

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-ticano-bg dark:bg-ticano-dark-bg">
    <LoadingSpinner />
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

const DashboardRouter = () => {
  const { user } = useAuth();
  switch (user?.role) {
    case 'customer': return <Navigate to="/client" replace />;
    case 'portfolio_manager': return <Navigate to="/pm" replace />;
    case 'service_manager': return <Navigate to="/service-manager" replace />;
    case 'director': return <Navigate to="/director" replace />;
    case 'marketing': return <Navigate to="/marketing" replace />;
    case 'admin': return <Navigate to="/admin" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

// The public marketing site at "/" for anonymous visitors, but a signed-in
// person landing on "/" (or refreshing there) should go straight to their
// dashboard instead of seeing the homepage again.
const RootRoute = () => {
  const { user, token, loading } = useAuth();
  if (loading) return <PageFallback />;
  if (token && user) return <DashboardRouter />;
  return <LandingPage />;
};

// Sits inside AuthProvider so it can check sessionExpiredReason before
// anything else renders, this is what guarantees a timed-out session
// always shows a clear message immediately, rather than leaving the
// previous dashboard mounted for even one render with a suddenly-null
// user (the kind of thing that can throw and land on the error screen
// instead of a friendly one).
function AppRoutes() {
  const { sessionExpiredReason } = useAuth();
  if (sessionExpiredReason) return <SessionExpiredScreen reason={sessionExpiredReason} />;

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/our-journey" element={<OurJourneyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/feedback/:token" element={<FeedbackFormPage />} />

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

              {/* Any unknown/typo'd URL, send back to the root, which then
                  routes to the dashboard if logged in or the homepage if
                  not, instead of rendering a blank page. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
  );
}

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
          <AIAssistantProvider>
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
                  style: {
                    background: '#f3fbf5',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                  },
                },
                error: {
                  style: {
                    background: '#fff5f5',
                    color: '#b42318',
                    border: '1px solid #fecaca',
                  },
                },
                loading: {
                  style: {
                    background: '#fbf8ff',
                    color: '#5b21b6',
                    border: '1px solid #e9d5ff',
                  },
                },
              }}
            />
            <AppRoutes />
            <MaintenanceMode />
            <TicanoAssistantWidget />
            <ForcePasswordChangeModal />
          </Router>
          </AIAssistantProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
