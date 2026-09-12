import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Hotel, Lock, Mail, UserCheck, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

export default function Login({ onSwitchToRegister, onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setLoading(true);
    setError(null);
    try {
      await login(userEmail, userPass);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/25">
            <Hotel className="w-8 h-8" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Hotel Management
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Multi-Organization Booking System
          </p>
        </div>

        {/* Quick Demo Login Preset Buttons for Multi-Tenancy */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Multi-Tenant Demo Switcher</span>
            </div>
            <span className="text-[10px] text-slate-400">1-Click Login</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Tenant 1: Grand Horizon (Mumbai / Delhi)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@grandhorizon.com', 'Admin@123')}
                className="px-2.5 py-1.5 text-left bg-white hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl transition text-xs shadow-sm"
              >
                <div className="text-purple-700 font-bold">Org 1 Admin</div>
                <div className="text-[10px] text-slate-400 truncate">admin@grandhorizon.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('reception@grandhorizon.com', 'Recept@123')}
                className="px-2.5 py-1.5 text-left bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl transition text-xs shadow-sm"
              >
                <div className="text-blue-700 font-bold">Org 1 Receptionist</div>
                <div className="text-[10px] text-slate-400 truncate">reception@grandhorizon.com</div>
              </button>
            </div>

            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pt-1">
              Tenant 2: Aura Collection (Goa / Jaipur)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@auracollection.com', 'Admin@123')}
                className="px-2.5 py-1.5 text-left bg-white hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-xl transition text-xs shadow-sm"
              >
                <div className="text-purple-700 font-bold">Org 2 Admin</div>
                <div className="text-[10px] text-slate-400 truncate">admin@auracollection.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('reception@auracollection.com', 'Recept@123')}
                className="px-2.5 py-1.5 text-left bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl transition text-xs shadow-sm"
              >
                <div className="text-blue-700 font-bold">Org 2 Receptionist</div>
                <div className="text-[10px] text-slate-400 truncate">reception@auracollection.com</div>
              </button>
            </div>

            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pt-1">
              Cross-Org Guest
            </div>
            <button
              type="button"
              onClick={() => handleQuickLogin('customer@example.com', 'Cust@123')}
              className="w-full px-3 py-1.5 text-center bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition text-xs font-bold text-teal-800 shadow-sm"
            >
              Login as Customer (Browse all Orgs & Book)
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition shadow-sm"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-teal-700 hover:text-teal-800 underline"
          >
            Create one now
          </button>
        </div>

      </div>
    </div>
  );
}
