import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Hotel, User, LogOut, CalendarCheck, ShieldCheck, BedDouble, FileText, Building2, Users } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenPolicy }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab(user?.role === 'customer' ? 'browse-orgs' : 'dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
            <Hotel className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
              {user?.organization_id === 2 ? 'Aura Collection' : 'Grand Horizon'}
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase">
              {user?.organization_id ? `Org #${user.organization_id}` : 'Hospitality Network'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs based on Role */}
        {user && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {user.role === 'customer' && (
              <>
                <button
                  onClick={() => setActiveTab('browse-orgs')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'browse-orgs'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Explore Brands
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'search'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  Search Rooms
                </button>
                <button
                  onClick={() => setActiveTab('my-bookings')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'my-bookings'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  My Stays
                </button>
              </>
            )}

            {(user.role === 'receptionist' || user.role === 'admin') && (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Operations Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('rooms')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'rooms'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BedDouble className="w-3.5 h-3.5" />
                  Room Inventory
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('org-admin')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === 'org-admin'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    Org & Staff
                  </button>
                )}
              </>
            )}
          </nav>
        )}

        {/* Right side Profile & Role Badges */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPolicy}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
            title="View 24h Cancellation Rules"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">24h Policy</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : user.role === 'receptionist'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-teal-100 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('login')}
                className="text-xs font-bold text-teal-700 hover:text-teal-800 px-3 py-1.5 rounded-lg hover:bg-teal-50"
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3.5 py-1.5 rounded-lg shadow-sm transition"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
