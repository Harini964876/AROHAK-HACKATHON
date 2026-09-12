import React, { useState, useEffect } from 'react';
import { BedDouble, Plus, Edit2, CheckCircle, AlertTriangle, ShieldCheck, X, Building } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminRooms() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const orgId = user?.organization_id;

  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotelFilter, setSelectedHotelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    hotel_id: '',
    room_number: '',
    room_type: 'Deluxe Suite',
    capacity: 2,
    price_per_night: 150.0,
    availability_status: 'active',
    description: '',
    amenities: 'WiFi, AC, TV',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const fetchOrgHotels = async () => {
      if (orgId) {
        try {
          const res = await api.get(`/organizations/${orgId}/hotels`);
          setHotels(res.data);
          if (res.data.length > 0 && !formData.hotel_id) {
            setFormData((prev) => ({ ...prev, hotel_id: res.data[0].id }));
          }
        } catch (err) {
          console.error('Failed to load hotels:', err);
        }
      }
    };
    fetchOrgHotels();
  }, [orgId]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const params = selectedHotelFilter ? { hotel_id: selectedHotelFilter } : {};
      const res = await api.get('/rooms', { params });
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedHotelFilter]);

  const handleToggleStatus = async (roomId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'maintenance' : 'active';
    setStatusLoading(roomId);
    setNotification(null);
    try {
      await api.patch(`/rooms/${roomId}/status`, {
        availability_status: nextStatus,
      });
      setNotification({
        type: 'success',
        text: `Room status updated to ${nextStatus.toUpperCase()}.`,
      });
      fetchRooms();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update status.',
      });
    } finally {
      setStatusLoading(null);
    }
  };

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      hotel_id: hotels.length > 0 ? hotels[0].id : 1,
      room_number: '',
      room_type: 'Deluxe Suite',
      capacity: 2,
      price_per_night: 150.0,
      availability_status: 'active',
      description: '',
      amenities: 'WiFi, AC, TV',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      hotel_id: room.hotel_id,
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: room.capacity,
      price_per_night: room.price_per_night,
      availability_status: room.availability_status,
      description: room.description || '',
      amenities: room.amenities || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingRoom) {
        await api.put(`/rooms/${editingRoom.id}`, {
          room_number: formData.room_number,
          room_type: formData.room_type,
          capacity: parseInt(formData.capacity, 10),
          price_per_night: parseFloat(formData.price_per_night),
          description: formData.description,
          amenities: formData.amenities,
        });
        setNotification({ type: 'success', text: `Room ${formData.room_number} details successfully updated.` });
      } else {
        await api.post('/rooms', {
          hotel_id: parseInt(formData.hotel_id || hotels[0]?.id || 1, 10),
          room_number: formData.room_number,
          room_type: formData.room_type,
          capacity: parseInt(formData.capacity, 10),
          price_per_night: parseFloat(formData.price_per_night),
          availability_status: formData.availability_status,
          description: formData.description,
          amenities: formData.amenities,
        });
        setNotification({ type: 'success', text: `Room ${formData.room_number} successfully added to inventory.` });
      }
      setIsModalOpen(false);
      fetchRooms();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save room details.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Room Inventory Management</h1>
            <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded-md ${
              isAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              Org #{orgId} • {user.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure room inventory, operational availability status, capacity, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hotels.length > 1 && (
            <select
              value={selectedHotelFilter}
              onChange={(e) => setSelectedHotelFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700"
            >
              <option value="">All Hotels</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}

          {isAdmin ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Room</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              Room creation & pricing restricted to Admin
            </div>
          )}
        </div>
      </div>

      {/* Role Boundary Notice */}
      {!isAdmin && (
        <div className="my-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <strong>RBAC Boundary Notice:</strong> As a Receptionist, you have full privileges to manage room operational status (Active / Maintenance) and bookings, but modification of core room definitions and hotel pricing is reserved for Administrators.
          </div>
        </div>
      )}

      {notification && (
        <div className={`my-6 p-4 rounded-2xl text-xs font-medium border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          {notification.text}
        </div>
      )}

      {/* Rooms Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mt-6">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Loading inventory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Room #</th>
                  <th className="py-3 px-4">Hotel ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Price / Night</th>
                  <th className="py-3 px-4">Operational Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      Room {room.room_number}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      Hotel #{room.hotel_id}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {room.room_type}
                    </td>

                    <td className="py-3.5 px-4">
                      {room.capacity} Guests
                    </td>

                    <td className="py-3.5 px-4 font-bold text-teal-700">
                      ${room.price_per_night}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        room.availability_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {room.availability_status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(room.id, room.availability_status)}
                        disabled={statusLoading === room.id}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200"
                        title="Toggle Operational Status"
                      >
                        {room.availability_status === 'active' ? 'Mark Maintenance' : 'Activate'}
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenEdit(room)}
                          className="px-2.5 py-1 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition border border-teal-200"
                          title="Edit Room Information"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Room Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="space-y-3">
              {!editingRoom && hotels.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel Property</label>
                  <select
                    value={formData.hotel_id}
                    onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g. 401"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Type</label>
                <input
                  type="text"
                  required
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  placeholder="e.g. Executive Sea Suite"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Night ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.price_per_night}
                    onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amenities</label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  placeholder="Comma separated: WiFi, Sea View, Mini Bar"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of the room..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm mt-4"
              >
                {formLoading ? 'Saving...' : 'Save Room'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
