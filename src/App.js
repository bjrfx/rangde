import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import HiringBanner from './components/HiringBanner';
import AdminLayout from './components/AdminLayout';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Menu = lazy(() => import('./pages/Menu'));
const MenuItem = lazy(() => import('./pages/MenuItem'));
const Locations = lazy(() => import('./pages/Locations'));
const Reservations = lazy(() => import('./pages/Reservations'));
const ManageReservations = lazy(() => import('./pages/ManageReservations'));
const Catering = lazy(() => import('./pages/Catering'));
const CateringByTray = lazy(() => import('./pages/CateringByTray'));
const CateringByTrayOrderSummary = lazy(() => import('./pages/CateringByTrayOrderSummary'));
const Contact = lazy(() => import('./pages/Contact'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminMenuManagement = lazy(() => import('./pages/admin/MenuManagement'));
const AdminReservations = lazy(() => import('./pages/admin/ReservationManagement'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminCateringManagement = lazy(() => import('./pages/admin/CateringManagement'));
const AdminCateringByTrayManagement = lazy(() => import('./pages/admin/CateringByTrayManagement'));
const AdminContactManagement = lazy(() => import('./pages/admin/ContactManagement'));
const AdminHomepageContentManagement = lazy(() => import('./pages/admin/HomepageContentManagement'));
const AdminLocationManagement = lazy(() => import('./pages/admin/LocationManagement'));
const AdminNotificationEmailSettings = lazy(() => import('./pages/admin/NotificationEmailSettings'));
const AdminReservationSettings = lazy(() => import('./pages/admin/ReservationSettings'));
const AdminHiringBannerManagement = lazy(() => import('./pages/admin/HiringBannerManagement'));
const AdminOnlineOrderPopupManagement = lazy(() => import('./pages/admin/OnlineOrderPopupManagement'));
const AdminEmailTemplatesManagement = lazy(() => import('./pages/admin/EmailTemplatesManagement'));
const AdminSmartCalendar = lazy(() => import('./pages/admin/SmartCalendar'));
const QuickBot = lazy(() => import('./components/QuickBot/QuickBot'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" aria-hidden="true">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

function AdminFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-hidden="true">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

function PublicLayout() {
  return (
    <>
      <HiringBanner />
      <Navbar />
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
      <Footer />
    </>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-display text-gold-gradient mb-4">404</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8">Page not found</p>
        <a href="/" className="btn-gold">Return Home</a>
      </div>
    </div>
  );
}

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (adminToken) {
      try {
        const stored = localStorage.getItem('adminData');
        if (stored) setAdmin(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        setAdminToken(null);
      }
    }
  }, [adminToken]);

  const handleLogin = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    setAdminToken(token);
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setAdminToken(null);
    setAdmin(null);
  };

  const ProtectedRoute = ({ children }) => {
    if (!adminToken) return <Navigate to="/admin/login" replace />;
    return children;
  };

  const AdminPage = ({ children }) => (
    <ProtectedRoute>
      <AdminLayout admin={admin} onLogout={handleLogout}>
        <Suspense fallback={<AdminFallback />}>
          {children}
        </Suspense>
      </AdminLayout>
    </ProtectedRoute>
  );

  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:itemSlug" element={<MenuItem />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/manage-reservations" element={<ManageReservations />} />
            <Route path="/catering" element={<Catering />} />
            <Route path="/catering-by-tray" element={<CateringByTray />} />
            <Route path="/catering-by-tray/order-summary/:id" element={<CateringByTrayOrderSummary />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          <Route path="/cateringbytray" element={<Navigate to="/catering-by-tray" replace />} />

          <Route path="/admin/login" element={
            <Suspense fallback={<AdminFallback />}>
              {adminToken ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={handleLogin} />}
            </Suspense>
          } />
          <Route path="/admin" element={<AdminPage><AdminDashboard token={adminToken} /></AdminPage>} />
          <Route path="/admin/menu" element={<AdminPage><AdminMenuManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/homepage" element={<AdminPage><AdminHomepageContentManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/locations" element={<AdminPage><AdminLocationManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/online-order-popup" element={<AdminPage><AdminOnlineOrderPopupManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/email-templates" element={<AdminPage><AdminEmailTemplatesManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/reservations" element={<AdminPage><AdminReservations token={adminToken} /></AdminPage>} />
          <Route path="/admin/catering" element={<AdminPage><AdminCateringManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/catering-by-tray" element={<AdminPage><AdminCateringByTrayManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/contact" element={<AdminPage><AdminContactManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/notifications" element={<AdminPage><AdminNotificationEmailSettings token={adminToken} /></AdminPage>} />
          <Route path="/admin/reservation-settings" element={<AdminPage><AdminReservationSettings token={adminToken} /></AdminPage>} />
          <Route path="/admin/analytics" element={<AdminPage><AdminAnalytics token={adminToken} /></AdminPage>} />
          <Route path="/admin/hiring" element={<AdminPage><AdminHiringBannerManagement token={adminToken} /></AdminPage>} />
          <Route path="/admin/smart-calendar" element={<AdminPage><AdminSmartCalendar token={adminToken} /></AdminPage>} />

          <Route element={<PublicLayout />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
      <Suspense fallback={null}>
        <QuickBot />
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
