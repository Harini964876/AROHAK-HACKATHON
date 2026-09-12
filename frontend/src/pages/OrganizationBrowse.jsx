import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, ArrowRight, BedDouble, Sparkles } from 'lucide-react';
import api from '../api/client';

const hotelImages = {
  1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', // Mumbai
  2: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80', // Delhi
  3: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80', // Goa
  4: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', // Jaipur
};

const defaultHotelImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

export default function OrganizationBrowse({ onSelectHotel }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const res = await api.get('/organizations');
        setOrganizations(res.data);
        if (res.data.length > 0) {
          setSelectedOrgId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizations();
  }, []);

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold mb-3 border border-teal-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Brand Hospitality Portfolio</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Explore Our Premier Collections
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Discover handpicked luxury hospitality groups and boutique heritage resorts across India.
        </p>

        {/* Organization Switcher Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrgId(org.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
                selectedOrgId === org.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>{org.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hotels Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-slate-500">Loading hotel portfolio...</p>
        </div>
      ) : !currentOrg || !currentOrg.hotels || currentOrg.hotels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <p className="text-xs text-slate-500">No active hotels listed under this organization yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {currentOrg.hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col group"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                <img
                  src={hotelImages[hotel.id] || defaultHotelImage}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>{hotel.city}</span>
                </div>
                <div className="absolute top-4 right-4 bg-teal-600 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-sm">
                  {currentOrg.name}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-teal-700 transition">
                    {hotel.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{hotel.address}</span>
                  </p>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed line-clamp-3">
                    {hotel.description}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                    {hotel.contact_number && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        {hotel.contact_number}
                      </span>
                    )}
                    {hotel.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                        {hotel.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                    Live Booking Open
                  </span>
                  <button
                    onClick={() => onSelectHotel(hotel)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-teal-600/20"
                  >
                    <BedDouble className="w-4 h-4" />
                    <span>View Rooms & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
