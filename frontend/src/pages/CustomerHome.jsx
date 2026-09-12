import React, { useState, useEffect } from 'react';
import { Calendar, Users, Search, Sparkles, MapPin, Check, Building, Filter, X } from 'lucide-react';
import api from '../api/client';
import RoomCard from '../components/RoomCard';
import BookingModal from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';

export default function CustomerHome({ initialHotel, onNavigateToBookings, onRequireLogin, onClearInitialHotel }) {
  const { user } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 4);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const [checkIn, setCheckIn] = useState(formatDate(tomorrow));
  const [checkOut, setCheckOut] = useState(formatDate(dayAfter));
  const [guests, setGuests] = useState(2);
  const [cityFilter, setCityFilter] = useState('');
  const [hotelFilter, setHotelFilter] = useState(initialHotel ? initialHotel.id : '');
  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Booking modal state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load all hotels for dropdown
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await api.get('/hotels');
        setHotels(res.data);
      } catch (err) {
        console.error('Failed to load hotels', err);
      }
    };
    fetchHotels();
  }, []);

  const searchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
      };
      if (hotelFilter) params.hotel_id = hotelFilter;
      if (cityFilter) params.city = cityFilter;

      const res = await api.get('/rooms/search', { params });
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to search rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchRooms();
  }, [hotelFilter, cityFilter]);

  const handleBookClick = (room) => {
    if (!user) {
      onRequireLogin();
      return;
    }
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  const handleBookingSuccess = (newBooking) => {
    searchRooms();
  };

  return (
    <div className="min-h-screen pb-16">
      {/* Hero Section */}
      <div className="relative bg-slate-950 text-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Luxury Marine Drive • Connaught Place • Goa Beach • Jaipur Palace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            Find & Reserve Your Perfect Hotel Stay
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Dynamic room search, guaranteed race-condition free booking, and flexible 24-hour cancellations.
          </p>

          {/* Search Card */}
          <div className="mt-8 max-w-5xl mx-auto bg-white rounded-3xl p-4 sm:p-5 shadow-2xl text-slate-900 border border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                searchRooms();
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center"
            >
              {/* Hotel / Destination Selector */}
              <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Destination / Hotel</label>
                <div className="flex items-center gap-1.5 mt-1">
                  <Building className="w-4 h-4 text-teal-600 shrink-0" />
                  <select
                    value={hotelFilter}
                    onChange={(e) => setHotelFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full cursor-pointer"
                  >
                    <option value="">All Destinations</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.city} - {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Check-in */}
              <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Check-In</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <input
                    type="date"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Check-out */}
              <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Check-Out</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <input
                    type="date"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Guests</label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-teal-600 shrink-0" />
                  <select
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none w-full cursor-pointer"
                  >
                    <option value={1}>1 Guest</option>
                    <option value={2}>2 Guests</option>
                    <option value={3}>3 Guests</option>
                    <option value={4}>4+ Guests</option>
                  </select>
                </div>
              </div>

              {/* Search button */}
              <button
                type="submit"
                disabled={loading}
                className="h-full min-h-[52px] bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Checking...' : 'Find Rooms'}</span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-100 gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Available Accommodations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic real-time availability for <span className="font-semibold text-teal-700">{checkIn}</span> to <span className="font-semibold text-teal-700">{checkOut}</span> ({guests} guest{guests > 1 ? 's' : ''})
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{rooms.length}</span> rooms available
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-500">Scanning room schedules and overlap locks...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Available Rooms Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All rooms matching your capacity are currently booked or undergoing maintenance for this date window. Try selecting another date range or destination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onBook={handleBookClick}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Booking Modal */}
      {selectedRoom && (
        <BookingModal
          room={selectedRoom}
          isOpen={isModalOpen}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRoom(null);
          }}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
