import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CancellationPolicyModal from './components/CancellationPolicyModal';
import OrganizationBrowse from './pages/OrganizationBrowse';
import CustomerHome from './pages/CustomerHome';
import CustomerBookings from './pages/CustomerBookings';
import StaffDashboard from './pages/StaffDashboard';
import AdminRooms from './pages/AdminRooms';
import OrgAdminPanel from './pages/OrgAdminPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatbotWidget from './components/ChatbotWidget';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('browse-orgs');
  const [selectedHotelForBooking, setSelectedHotelForBooking] = useState(null);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  // Automatically adjust default view when user logs in or out
  useEffect(() => {
    if (user) {
      if (user.role === 'customer') {
        if (activeTab === 'login' || activeTab === 'register' || activeTab === 'dashboard' || activeTab === 'rooms' || activeTab === 'org-admin') {
          setActiveTab('browse-orgs');
        }
      } else if (user.role === 'receptionist' || user.role === 'admin') {
        if (activeTab === 'login' || activeTab === 'register' || activeTab === 'my-bookings' || activeTab === 'browse-orgs') {
          setActiveTab('dashboard');
        }
      }
    } else {
      if (activeTab === 'my-bookings' || activeTab === 'dashboard' || activeTab === 'rooms' || activeTab === 'org-admin') {
        setActiveTab('browse-orgs');
      }
    }
  }, [user]);

  const handleSelectHotelFromBrowse = (hotel) => {
    setSelectedHotelForBooking(hotel);
    setActiveTab('search');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPolicy={() => setIsPolicyOpen(true)}
      />

      <main className="flex-1">
        {/* Unauthenticated Auth screens */}
        {activeTab === 'login' && (
          <Login
            onSwitchToRegister={() => setActiveTab('register')}
            onSuccess={() => {}}
          />
        )}

        {activeTab === 'register' && (
          <Register
            onSwitchToLogin={() => setActiveTab('login')}
            onSuccess={() => {}}
          />
        )}

        {/* Customer Experience */}
        {activeTab === 'browse-orgs' && (
          <OrganizationBrowse onSelectHotel={handleSelectHotelFromBrowse} />
        )}

        {activeTab === 'search' && (
          <CustomerHome
            initialHotel={selectedHotelForBooking}
            onNavigateToBookings={() => setActiveTab('my-bookings')}
            onRequireLogin={() => setActiveTab('login')}
            onClearInitialHotel={() => setSelectedHotelForBooking(null)}
          />
        )}

        {activeTab === 'my-bookings' && (
          <CustomerBookings onFindRooms={() => setActiveTab('search')} />
        )}

        {/* Staff & Admin Portals */}
        {activeTab === 'dashboard' && <StaffDashboard />}
        {activeTab === 'rooms' && <AdminRooms />}
        {activeTab === 'org-admin' && <OrgAdminPanel />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            &copy; {new Date().getFullYear()} Multi-Tenant Hospitality Group Network. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPolicyOpen(true)}
              className="hover:text-teal-700 transition underline"
            >
              24h Cancellation Policy
            </button>
            <span>•</span>
            <span className="font-semibold text-slate-600">Phase 2 Multi-Tenant Architecture</span>
          </div>
        </div>
      </footer>

      {/* Cancellation Policy Modal */}
      <CancellationPolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
      />

      {/* Floating AI Booking Concierge Widget */}
      <ChatbotWidget onNavigateToTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
