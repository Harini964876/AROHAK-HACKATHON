import React from 'react';
import { Users, BedDouble, Check, Sparkles, Tag } from 'lucide-react';

const roomImages = {
  101: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
  102: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
  103: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&q=80',
  201: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600&q=80',
  202: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&q=80',
  301: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&q=80',
};

const defaultImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80';

export default function RoomCard({ room, onBook, checkIn, checkOut }) {
  const imageUrl = roomImages[room.id] || defaultImage;
  const amenitiesList = room.amenities ? room.amenities.split(',').map(a => a.trim()) : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group">
      {/* Image header */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={room.room_type}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide">
          Room {room.room_number}
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-teal-800 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm">
          <Users className="w-3.5 h-3.5" />
          Up to {room.capacity} Guests
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-teal-700 transition">
            {room.room_type}
          </h3>

          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {room.description || 'Luxurious comfort with exquisite hospitality and first-class room service.'}
          </p>

          {/* Amenities tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {amenitiesList.slice(0, 4).map((amenity, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-teal-600" />
                {amenity}
              </span>
            ))}
            {amenitiesList.length > 4 && (
              <span className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                +{amenitiesList.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing and Action */}
        <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-2xl font-black text-slate-900">${room.price_per_night}</span>
            <span className="text-xs text-slate-500"> / night</span>
          </div>

          <button
            onClick={() => onBook(room)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
          >
            <span>Book Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
