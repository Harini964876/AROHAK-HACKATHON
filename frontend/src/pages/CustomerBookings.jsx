import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Eye,
  X,
  MapPin,
  Building,
  Phone,
  ShieldCheck
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CustomerBookings({ onFindRooms }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, upcoming, completed, cancelled
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = async (category = activeTab) => {
    setLoading(true);
    setError(null);
    try {
      const params = category !== 'all' ? { category } : {};
      const res = await api.get('/bookings/my', { params });
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load your reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you wish to cancel this reservation?')) return;

    setActionLoading(bookingId);
    setMessage(null);
    setError(null);

    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      const { status, message: cancelMsg, requires_approval } = res.data;

      setMessage({
        type: requires_approval ? 'warning' : 'success',
        text: cancelMsg,
      });

      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status });
      }

      fetchBookings(activeTab);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cancel reservation.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'PENDING_CANCELLATION':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            Pending Staff Approval (&le;24h)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed Stay
          </span>
        );
      default:
        return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Booking Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your upcoming getaways, historical stays, and manage 24-hour cancellations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBookings(activeTab)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Bookings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onFindRooms}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Explore Hotels & Book
          </button>
        </div>
      </div>

      {/* Categorized Tabs */}
      <div className="flex flex-wrap gap-2 my-6">
        {[
          { id: 'all', label: 'All Stays' },
          { id: 'upcoming', label: 'Upcoming Stays' },
          { id: 'completed', label: 'Past / Completed' },
          { id: 'cancelled', label: 'Cancelled / Pending' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert notifications */}
      {message && (
        <div
          className={`my-4 p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            message.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {message.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed font-medium">{message.text}</div>
        </div>
      )}

      {error && (
        <div className="my-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Retrieving reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Reservations In This Category</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You do not have any {activeTab !== 'all' ? activeTab : ''} bookings registered under your account.
          </p>
          <button
            onClick={onFindRooms}
            className="mt-5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            Find a Room
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">Ref #{b.id}</span>
                  {getStatusBadge(b.status)}
                </div>

                <div className="text-base font-bold text-slate-900">
                  {b.hotel?.name || 'Hotel'} • Room {b.room?.room_number || b.room_id} ({b.room?.room_type})
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    {b.check_in_date} &rarr; {b.check_out_date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    {b.guests} guest{b.guests > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                    ${b.total_amount} Total
                  </span>
                </div>
              </div>

              {/* Action column */}
              <div className="w-full md:w-auto flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setSelectedBooking(b)}
                  className="flex items-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>

                {b.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancelBooking(b.id)}
                    disabled={actionLoading === b.id}
                    className="px-3 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition"
                  >
                    {actionLoading === b.id ? 'Processing...' : 'Cancel Stay'}
                  </button>
                )}

                {b.status === 'PENDING_CANCELLATION' && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 font-medium">
                    Awaiting staff confirmation
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-slate-400">Booking #{selectedBooking.id}</span>
              {getStatusBadge(selectedBooking.status)}
            </div>

            <h3 className="text-xl font-bold text-slate-900">
              {selectedBooking.hotel?.name || 'Hotel Stay'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedBooking.hotel?.address}, {selectedBooking.hotel?.city}</span>
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 my-4 border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500">Room Details:</span>
                <span className="font-bold text-slate-900">
                  Room {selectedBooking.room?.room_number} ({selectedBooking.room?.room_type})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Check-In Date:</span>
                <span className="font-bold text-slate-900">{selectedBooking.check_in_date}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Check-Out Date:</span>
                <span className="font-bold text-slate-900">{selectedBooking.check_out_date}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Guests:</span>
                <span className="font-bold text-slate-900">{selectedBooking.guests}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Rate per night:</span>
                <span className="font-bold text-slate-900">${selectedBooking.room?.price_per_night}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                <span>Total Charged:</span>
                <span className="text-teal-700">${selectedBooking.total_amount}</span>
              </div>
            </div>

            {/* Policy Reminder */}
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-[11px] text-teal-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
              <div>
                <strong>Cancellation Policy:</strong> Free direct cancellation up to 24 hours prior to check-in. Cancellations within 24 hours require staff approval.
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              {selectedBooking.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  disabled={actionLoading === selectedBooking.id}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition"
                >
                  {actionLoading === selectedBooking.id ? 'Cancelling...' : 'Cancel Reservation'}
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
