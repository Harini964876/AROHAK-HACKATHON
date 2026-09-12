import React, { useState } from 'react';
import { X, Calendar, Users, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function BookingModal({ room, isOpen, onClose, initialCheckIn, initialCheckOut, initialGuests, onBookingSuccess }) {
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState(initialCheckOut || '');
  const [guests, setGuests] = useState(initialGuests || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);

  if (!isOpen || !room) return null;

  // Calculate nights & total
  const calculateTotal = () => {
    if (!checkIn || !checkOut) return { nights: 0, total: 0 };
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { nights: 0, total: 0 };
    return {
      nights: diffDays,
      total: (diffDays * room.price_per_night).toFixed(2),
    };
  };

  const { nights, total } = calculateTotal();

  const handleBooking = async (e) => {
    e.preventDefault();
    if (nights <= 0) {
      setError('Check-out date must be after check-in date.');
      return;
    }
    if (guests > room.capacity) {
      setError(`Maximum capacity for this room is ${room.capacity} guests.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/bookings', {
        room_id: room.id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guests: parseInt(guests, 10),
      });

      setSuccessBooking(res.data);
      if (onBookingSuccess) {
        onBookingSuccess(res.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 409) {
        setError('Booking Conflict: This room was just booked for the selected dates. Please choose another date range or room.');
      } else {
        setError(err.response?.data?.detail || 'Failed to complete booking. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {successBooking ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Reservation Confirmed!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Booking ID: <span className="font-mono font-bold text-teal-700">#{successBooking.id}</span>
            </p>

            <div className="bg-slate-50 rounded-xl p-4 my-4 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Room:</span>
                <span className="font-semibold text-slate-900">Room {room.room_number} ({room.room_type})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold text-slate-900">{successBooking.check_in_date} to {successBooking.check_out_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guests:</span>
                <span className="font-semibold text-slate-900">{successBooking.guests}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900">
                <span>Total Charged:</span>
                <span className="text-teal-700">${successBooking.total_amount}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm transition"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                Room {room.room_number}
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{room.room_type}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Grand Horizon Mumbai • Marine Drive</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Guests (Max {room.capacity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={room.capacity}
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>${room.price_per_night} x {nights} night{nights > 1 ? 's' : ''}</span>
                  <span>${total}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & Service Fees</span>
                  <span>$0.00 (Included)</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                  <span>Total Amount</span>
                  <span className="text-teal-700">${total}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-teal-50/50 p-2.5 rounded-lg border border-teal-100">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Free cancellation up to 24 hours prior to check-in.</span>
              </div>

              <button
                type="submit"
                disabled={loading || nights <= 0}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm transition shadow-sm"
              >
                {loading ? 'Securing Room...' : `Confirm & Pay $${total}`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
