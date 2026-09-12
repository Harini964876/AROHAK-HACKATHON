import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const QUICK_PROMPTS = [
  { label: '🏨 Rooms in Mumbai', prompt: 'Find available rooms in Mumbai for 2 guests next weekend' },
  { label: '📅 Available Rooms', prompt: 'Show available rooms for 2 people' },
  { label: '📋 My Bookings', prompt: 'Show my upcoming bookings' },
  { label: '🛡️ Cancellation Policy', prompt: 'What is the hotel cancellation policy?' },
];

export default function ChatbotWidget({ onNavigateToTab }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your AI Booking Concierge. I can help you search live room availability, confirm instant bookings, and manage your reservations. How may I assist you today?",
      intent: 'WELCOME',
      data: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(() => 'conv_' + Math.random().toString(36).substring(2, 9));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isTyping]);

  const handleReset = () => {
    setConversationId('conv_' + Math.random().toString(36).substring(2, 9));
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'assistant',
        text: "Conversation reset. How can I help you find or manage your hotel stay today?",
        intent: 'WELCOME',
        data: null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    if (!user) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: "Please sign in to your account first so I can search rooms and manage your bookings securely.",
          requiresAuth: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputValue('');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await api.post('/chatbot/message', {
        message: query,
        conversation_id: conversationId
      });

      const replyData = res.data;
      if (replyData.conversation_id) {
        setConversationId(replyData.conversation_id);
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyData.reply,
        intent: replyData.intent,
        data: replyData.data || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Sorry, I ran into a technical hiccup connecting to our booking service. Please try again in a moment.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `⚠️ ${errorMsg}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Booking Assistant"
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white rounded-full p-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-3 group border border-teal-400/30"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide pr-1 hidden sm:inline">
            AI Booking Assistant
          </span>
        </button>
      )}

      {/* Chatbot Window / Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[440px] h-[640px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between border-b border-teal-800/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-100">AI Booking Assistant</h3>
                  <span className="flex items-center gap-1 bg-emerald-950/80 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-700/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live DB
                  </span>
                </div>
                <p className="text-[11px] text-teal-200/80">Search rooms, book stays & manage bookings</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset Conversation"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Suggestions Bar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.prompt)}
                disabled={isTyping}
                className="text-[11px] font-medium whitespace-nowrap bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs transition disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex-shrink-0 flex items-center justify-center mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  {/* Bubble text */}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-teal-600 text-white rounded-br-xs font-medium'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}

                    {/* Auth Required CTA */}
                    {msg.requiresAuth && (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            if (onNavigateToTab) onNavigateToTab('login');
                          }}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-1.5 px-3 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          Sign In / Register
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rich Content Renderers */}
                  {/* 1. Available Rooms Cards */}
                  {msg.data?.rooms && msg.data.rooms.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                        Available Database Rooms ({msg.data.rooms.length})
                      </div>
                      {msg.data.rooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:border-teal-400 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-mono">
                                  Room {room.room_number}
                                </span>
                                {room.room_type}
                              </div>
                              {room.hotel_name && (
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  📍 {room.hotel_name} {room.hotel_city ? `(${room.hotel_city})` : ''}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-extrabold text-teal-700">
                                ₹{room.price_per_night}
                              </span>
                              <span className="text-[10px] text-slate-400 block">/ night</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              Up to {room.capacity} Guests
                            </span>
                            <button
                              onClick={() => handleSendMessage(`Book Room ${room.room_number}`)}
                              disabled={isTyping}
                              className="text-[11px] font-semibold bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white px-2.5 py-1 rounded-lg border border-teal-200 hover:border-teal-600 transition"
                            >
                              Select & Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. Pending Booking Proposal Card */}
                  {msg.data?.pending_booking && (
                    <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Please Confirm Your Reservation
                      </div>

                      <div className="bg-white/80 rounded-lg p-2.5 text-xs space-y-1.5 border border-amber-200">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Room:</span>
                          <span className="font-semibold text-slate-800">
                            Room {msg.data.pending_booking.room_number} ({msg.data.pending_booking.room_type})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dates:</span>
                          <span className="font-semibold text-slate-800">
                            {msg.data.pending_booking.check_in_date} → {msg.data.pending_booking.check_out_date}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Duration & Guests:</span>
                          <span className="font-semibold text-slate-800">
                            {msg.data.pending_booking.nights} night(s), {msg.data.pending_booking.guests} guest(s)
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 text-slate-900 font-bold">
                          <span>Total Amount:</span>
                          <span className="text-teal-700 text-sm">₹{msg.data.pending_booking.total_price}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSendMessage("Yes, please confirm this booking")}
                          disabled={isTyping}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-1.5 rounded-lg transition flex items-center justify-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm Booking
                        </button>
                        <button
                          onClick={() => handleSendMessage("No, cancel this booking request")}
                          disabled={isTyping}
                          className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs py-1.5 px-3 rounded-lg border border-slate-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Confirmed Booking Success Card */}
                  {msg.data?.booking && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 shadow-2xs space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Reservation Confirmed!
                      </div>
                      <div className="bg-white/80 rounded-lg p-2.5 text-xs space-y-1 border border-emerald-200">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Booking ID:</span>
                          <span className="font-mono font-bold text-slate-900">#{msg.data.booking.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Check-in:</span>
                          <span className="font-semibold text-slate-800">{msg.data.booking.check_in_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Check-out:</span>
                          <span className="font-semibold text-slate-800">{msg.data.booking.check_out_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Status:</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {msg.data.booking.status}
                          </span>
                        </div>
                      </div>
                      {onNavigateToTab && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            onNavigateToTab('my-bookings');
                          }}
                          className="w-full text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 py-1.5 rounded-lg transition text-center block"
                        >
                          View in My Bookings →
                        </button>
                      )}
                    </div>
                  )}

                  {/* 4. Upcoming Bookings List */}
                  {msg.data?.bookings && msg.data.bookings.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                        Your Reservations ({msg.data.bookings.length})
                      </div>
                      {msg.data.bookings.map((b) => (
                        <div
                          key={b.id}
                          className="bg-white rounded-xl border border-slate-200 p-2.5 text-xs shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 font-mono">
                              Booking #{b.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'PENDING_CANCELLATION'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {b.check_in_date} to {b.check_out_date}
                          </div>
                          {b.status === 'CONFIRMED' && (
                            <div className="pt-1 flex justify-end">
                              <button
                                onClick={() => handleSendMessage(`Cancel booking #${b.id}`)}
                                disabled={isTyping}
                                className="text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 font-semibold transition"
                              >
                                Cancel this Booking
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`text-[10px] text-slate-400 px-1 ${
                      msg.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex-shrink-0 flex items-center justify-center mt-0.5 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex-shrink-0 flex items-center justify-center mt-0.5 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask e.g. 'Find rooms in Mumbai next weekend'..."
                disabled={isTyping}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isTyping}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition flex items-center justify-center shadow-xs"
                title="Send Message"
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Enter to send</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                Zero Hallucination Guarantee
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
