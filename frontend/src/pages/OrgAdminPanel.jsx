import React, { useState, useEffect } from 'react';
import { Building2, Plus, UserPlus, Users, MapPin, Phone, Mail, X, ShieldCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OrgAdminPanel() {
  const { user } = useAuth();
  const orgId = user?.organization_id;

  const [hotels, setHotels] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('hotels'); // 'hotels' | 'staff'
  const [notification, setNotification] = useState(null);

  // Add / Edit Hotel Modal
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    city: '',
    description: '',
    contact_number: '',
    email: '',
    status: 'active',
  });

  // Add Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'receptionist',
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [hotelsRes, staffRes] = await Promise.all([
        api.get(`/organizations/${orgId}/hotels`),
        api.get(`/organizations/${orgId}/staff`),
      ]);
      setHotels(hotelsRes.data);
      setStaff(staffRes.data);
    } catch (err) {
      console.error('Failed to load organization details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const handleOpenAddHotel = () => {
    setEditingHotel(null);
    setHotelForm({
      name: '',
      address: '',
      city: '',
      description: '',
      contact_number: '',
      email: '',
      status: 'active',
    });
    setModalError(null);
    setIsHotelModalOpen(true);
  };

  const handleOpenEditHotel = (hotel) => {
    setEditingHotel(hotel);
    setHotelForm({
      name: hotel.name,
      address: hotel.address,
      city: hotel.city,
      description: hotel.description || '',
      contact_number: hotel.contact_number || '',
      email: hotel.email || '',
      status: hotel.status || 'active',
    });
    setModalError(null);
    setIsHotelModalOpen(true);
  };

  const handleSaveHotel = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      if (editingHotel) {
        await api.put(`/hotels/${editingHotel.id}`, hotelForm);
        setNotification({ type: 'success', text: `Hotel "${hotelForm.name}" updated successfully.` });
      } else {
        await api.post(`/organizations/${orgId}/hotels`, {
          organization_id: orgId,
          ...hotelForm,
        });
        setNotification({ type: 'success', text: `Hotel "${hotelForm.name}" created successfully.` });
      }
      setIsHotelModalOpen(false);
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to save hotel.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await api.post(`/organizations/${orgId}/staff`, staffForm);
      setNotification({ type: 'success', text: `Staff member "${staffForm.name}" assigned to organization.` });
      setIsStaffModalOpen(false);
      setStaffForm({ name: '', email: '', password: '', role: 'receptionist' });
      fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to assign staff.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Organization Administration</h1>
            <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              Org #{orgId} Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your organization's hotel properties and assign receptionists to your front desks.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenAddHotel}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hotel</span>
          </button>
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Staff</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          {notification.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 my-6">
        <button
          onClick={() => setActiveTab('hotels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            activeTab === 'hotels' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hotels ({hotels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            activeTab === 'staff' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Receptionists ({staff.length})</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading organization data...</p>
        </div>
      ) : activeTab === 'hotels' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotels.map((h) => (
            <div key={h.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{h.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{h.address}, {h.city}</span>
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    h.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {h.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2">{h.description}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                  {h.contact_number && <span>{h.contact_number}</span>}
                  {h.email && <span>{h.email}</span>}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => handleOpenEditHotel(h)}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl transition border border-teal-200"
                >
                  Edit Hotel Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-400">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organization ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">{s.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-slate-100 text-slate-800">
                      {s.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">#{s.organization_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Hotel Modal */}
      {isHotelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setIsHotelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingHotel ? `Edit Hotel Details` : 'Add Hotel Property'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveHotel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel Name</label>
                <input
                  type="text"
                  required
                  value={hotelForm.name}
                  onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                  placeholder="e.g. Grand Horizon Palace"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={hotelForm.city}
                    onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                    placeholder="e.g. Udaipur"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact #</label>
                  <input
                    type="text"
                    value={hotelForm.contact_number}
                    onChange={(e) => setHotelForm({ ...hotelForm, contact_number: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={hotelForm.address}
                  onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                  placeholder="Street Address..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={hotelForm.email}
                    onChange={(e) => setHotelForm({ ...hotelForm, email: e.target.value })}
                    placeholder="hotel@domain.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={hotelForm.status}
                    onChange={(e) => setHotelForm({ ...hotelForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={hotelForm.description}
                  onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
                  placeholder="Property overview..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm mt-4"
              >
                {modalLoading ? 'Saving Property...' : (editingHotel ? 'Update Hotel Details' : 'Save Hotel Property')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">Assign Staff to Organization #{orgId}</h3>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="jane@hotel.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="receptionist">Receptionist (Front Desk)</option>
                  <option value="admin">Administrator (Co-Manager)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-sm mt-4"
              >
                {modalLoading ? 'Assigning...' : 'Assign Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
