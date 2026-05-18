import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Menu from './pages/Menu';
import Locations from './pages/Locations';
import Reservations from './pages/Reservations';
import ManageReservations from './pages/ManageReservations';
import Catering from './pages/Catering';
import Contact from './pages/Contact';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminMenuManagement from './pages/admin/MenuManagement';
import AdminReservations from './pages/admin/ReservationManagement';
import AdminAnalytics from './pages/admin/Analytics';
import AdminCateringManagement from './pages/admin/CateringManagement';
import AdminContactManagement from './pages/admin/ContactManagement';
import AdminHomepageContentManagement from './pages/admin/HomepageContentManagement';
import AdminNotificationEmailSettings from './pages/admin/NotificationEmailSettings';
import AdminReservationSettings from './pages/admin/ReservationSettings';
import AdminLayout from './components/AdminLayout';
import ScrollToTop from './components/ScrollToTop';
import QuickBot from './components/QuickBot/QuickBot';

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

  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<><Navbar /><Home /><Footer /></>} />
          <Route path="/about" element={<><Navbar /><About /><Footer /></>} />
          <Route path="/menu" element={<><Navbar /><Menu /><Footer /></>} />
          <Route path="/locations" element={<><Navbar /><Locations /><Footer /></>} />
          <Route path="/reservations" element={<><Navbar /><Reservations /><Footer /></>} />
          <Route path="/manage-reservations" element={<><Navbar /><ManageReservations /><Footer /></>} />
          <Route path="/catering" element={<><Navbar /><Catering /><Footer /></>} />
          <Route path="/contact" element={<><Navbar /><Contact /><Footer /></>} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={
            adminToken ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={handleLogin} />
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminDashboard token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/menu" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminMenuManagement token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/homepage" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminHomepageContentManagement token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reservations" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminReservations token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/catering" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminCateringManagement token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/contact" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminContactManagement token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/notifications" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminNotificationEmailSettings token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reservation-settings" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminReservationSettings token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute>
              <AdminLayout admin={admin} onLogout={handleLogout}>
                <AdminAnalytics token={adminToken} />
              </AdminLayout>
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<><Navbar /><div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-6xl font-display text-gold-gradient mb-4">404</h1><p className="text-neutral-500 dark:text-neutral-400 mb-8">Page not found</p><a href="/" className="btn-gold">Return Home</a></div></div><Footer /></>} />
        </Routes>
      </Router>
      <QuickBot />
    </ThemeProvider>
  );
}

export default App;
