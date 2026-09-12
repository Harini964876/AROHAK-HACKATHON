import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Building,
  Check,
  Eye,
  X
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // Detail Modal
  const [detailBooking, setDetailBooking] = useState(null);

  // Fetch hotels for this organization
  useEffect(() => {
    const fetchOrgHotels = async () => {
      if (user?.organization_id) {
        try {
          const res = await api.get(`/organizations/${user.organization_id}/hotels`);
          setHotels(res.data);
        } catch (err) {
          console.error('Failed to load organization hotels:', err);
        }
      }
    };
    fetchOrgHotels();
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status_filter = statusFilter;
      if (selectedHotelId) params.hotel_id = selectedHotelId;
      if (searchQuery) params.customer_query = searchQuery;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get('/bookings', { params });
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, selectedHotelId, startDate, endDate]);

  const handleReviewCancellation = async (bookingId, action) => {
    setReviewLoading(bookingId);
    setNotification(null);
    try {
      await api.post(`/bookings/${bookingId}/review-cancellation`, {
        action: action,
      });

      setNotification({
        type: 'success',
        text: `Booking #${bookingId} cancellation has been ${action === 'approve' ? 'APPROVED (status: CANCELLED)' : 'REJECTED (status: CONFIRMED)'}.`,
      });

      if (detailBooking && detailBooking.id === bookingId) {
        setDetailBooking(null);
      }

      fetchBookings();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to review cancellation.',
      });
    } finally {
      setReviewLoading(null);
    }
  };

  const handleMarkCompleted = async (bookingId) => {
    setReviewLoading(bookingId);
    setNotification(null);
    try {
      await api.post(`/bookings/${bookingId}/complete`);
      setNotification({
        type: 'success',
        text: `Booking #${bookingId} successfully marked as COMPLETED.`,
      });
      if (detailBooking && detailBooking.id === bookingId) {
        setDetailBooking(null);
      }
      fetchBookings();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to complete booking.',
      });
    } finally {
      setReviewLoading(null);
    }
  };

  // Metrics
  const pendingCount = bookings.filter((b) => b.status === 'PENDING_CANCELLATION').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;
  const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Organization Operations Dashboard
            </h1>
            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
              Tenant ID: {user?.organization_id} • {user?.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Strict tenant-isolated view of all bookings, cancellations, and guest arrivals for your organization.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold">Total Bookings</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{bookings.length}</div>
        </div>

        <div
          onClick={() => setStatusFilter('PENDING_CANCELLATION')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm ${
            statusFilter === 'PENDING_CANCELLATION'
              ? 'bg-amber-100 border-amber-300 ring-2 ring-amber-400'
              : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="text-xs text-amber-800 font-bold flex items-center justify-between">
            <span>Pending Review (&le;24h)</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold">Confirmed Active</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{confirmedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold">Completed / Historical</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {notification.text}
        </div>
      )}

      {/* Filters and search panel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        
        {/* Top filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pb-5 border-b border-slate-100">
          
          {/* Hotel selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Select Hotel
            </label>
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">All Organization Hotels</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Check-In From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Check-Out To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Customer live search */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Customer
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchBookings()}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Status buttons */}
        <div className="flex flex-wrap gap-1.5 py-4 border-b border-slate-100">
          {['ALL', 'PENDING_CANCELLATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'PENDING_CANCELLATION' ? `Pending Review (${pendingCount})` : tab}
            </button>
          ))}
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Retrieving filtered bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No bookings found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Hotel & Room</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                      #{b.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.customer?.name || 'Customer'}</div>
                      <div className="text-[11px] text-slate-400">{b.customer?.email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.hotel?.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Room {b.room?.room_number} ({b.room?.room_type})
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>{b.check_in_date}</div>
                      <div className="text-[11px] text-slate-400">&rarr; {b.check_out_date}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${b.total_amount}
                    </td>

                    <td className="py-3.5 px-4">
                      {b.status === 'CONFIRMED' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          CONFIRMED
                        </span>
                      )}
                      {b.status === 'PENDING_CANCELLATION' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          PENDING APPROVAL
                        </span>
                      )}
                      {b.status === 'CANCELLED' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          CANCELLED
                        </span>
                      )}
                      {b.status === 'COMPLETED' && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          COMPLETED
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailBooking(b)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {b.status === 'PENDING_CANCELLATION' && (
                          <>
                            <button
                              onClick={() => handleReviewCancellation(b.id, 'approve')}
                              disabled={reviewLoading === b.id}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                              title="Approve Cancellation"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewCancellation(b.id, 'reject')}
                              disabled={reviewLoading === b.id}
                              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-xs transition border border-red-200"
                              title="Reject Cancellation"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {b.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleMarkCompleted(b.id)}
                            disabled={reviewLoading === b.id}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition border border-blue-200 flex items-center gap-1"
                            title="Mark Completed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Detail Modal */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setDetailBooking(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-xs font-mono font-bold text-slate-400 mb-1">
              Booking Inspection #{detailBooking.id}
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {detailBooking.hotel?.name}
            </h3>

            <div className="bg-slate-50 rounded-2xl p-4 my-4 text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">
                  {detailBooking.customer?.name} ({detailBooking.customer?.email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room:</span>
                <span className="font-bold text-slate-900">
                  Room {detailBooking.room?.room_number} • {detailBooking.room?.room_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-bold text-slate-900">
                  {detailBooking.check_in_date} to {detailBooking.check_out_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guests:</span>
                <span className="font-bold text-slate-900">{detailBooking.guests}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm">
                <span>Total Amount:</span>
                <span className="text-teal-700">${detailBooking.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-slate-900">{detailBooking.status}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {detailBooking.status === 'PENDING_CANCELLATION' && (
                <>
                  <button
                    onClick={() => handleReviewCancellation(detailBooking.id, 'approve')}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Approve Cancellation
                  </button>
                  <button
                    onClick={() => handleReviewCancellation(detailBooking.id, 'reject')}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Reject Cancellation
                  </button>
                </>
              )}
              {detailBooking.status === 'CONFIRMED' && (
                <button
                  onClick={() => handleMarkCompleted(detailBooking.id)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Mark Completed
                </button>
              )}
              <button
                onClick={() => setDetailBooking(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
