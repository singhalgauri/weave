"use strict";
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, FileText, ClipboardList, Flame, ShieldCheck, User, MessageCircle, MessageSquare, Bot, Send, Camera, Loader2, Zap, Droplets, Construction, CheckCircle2, ChevronDown, ChevronUp, ThumbsUp, Map, Ghost } from "lucide-react";

const PIN_ICONS: Record<string, any> = {
  "Submit a Report": FileText,
  "Ticket Status": ClipboardList,
  "Heat Map": Flame,
  "Audit": ShieldCheck,
  "Profile": User,
  "WhatsApp Bot": MessageCircle,
};

type Section = "Submit a Report" | "Ticket Status" | "Heat Map" | "Audit" | "Profile" | "WhatsApp Bot";

interface PinPosition {
  section: Section;
  top: string;
  left: string;
}

// Scattered pins across the screen
const PINS: PinPosition[] = [
  { section: "Submit a Report", top: "25%", left: "30%" },
  { section: "Ticket Status", top: "45%", left: "60%" },
  { section: "Heat Map", top: "68%", left: "20%" },
  { section: "Audit", top: "74%", left: "70%" },
  { section: "Profile", top: "20%", left: "80%" },
  { section: "WhatsApp Bot", top: "65%", left: "45%" },
];

const ISSUE_CATEGORIES: Record<string, string[]> = {
  Electricity: ["Loose wires", "Short circuit", "Electricity poles", "Others"],
  PWD: ["Potholes", "Infrastructure", "Others"],
  Water: ["Leakage", "Contaminated water", "No supply", "Shortage", "Others"],
};

function ReportForm({ onSubmit }: { onSubmit: () => void }) {
  const user = { id: "mocked-user" };
  const [department, setDepartment] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [nearbyDuplicate, setNearbyDuplicate] = useState<any>(null);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [forceNew, setForceNew] = useState(false);
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let lat = null;
    let lng = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Geolocation denied or failed, using backend defaults.");
      }
    }

    try {
      // Mocking submission since backend endpoints don't exist yet
      setTimeout(() => {
        const shortId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existing = JSON.parse(localStorage.getItem('citysync_tickets') || '[]');
        existing.push({
          id: shortId,
          shortId,
          category: issueType,
          date: new Date().toISOString(),
          status: 'open'
        });
        localStorage.setItem('citysync_tickets', JSON.stringify(existing));
        setSubmittedTicketId(shortId);
        setIsSubmitting(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to connect to server.");
      setIsSubmitting(false);
    }
  };

  const handleUpvoteDuplicate = async () => {
    if (!nearbyDuplicate) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const existing = JSON.parse(localStorage.getItem('citysync_tickets') || '[]');
      existing.push({
        id: nearbyDuplicate.id,
        shortId: nearbyDuplicate.cluster_id.substring(0, 8).toUpperCase(),
        category: nearbyDuplicate.category,
        date: new Date().toISOString()
      });
      localStorage.setItem('citysync_tickets', JSON.stringify(existing));
      setSubmittedTicketId(nearbyDuplicate.cluster_id.substring(0, 8).toUpperCase());
      setIsSubmitting(false);
    }, 1000);
  };

  if (submittedTicketId) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-6 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            <CheckCircle2 size={40} className="text-green-600" />
          </motion.div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-[#1E3A8A] tracking-tighter">CONTRIBUTION RECEIVED</h3>
          <p className="text-[#1E3A8A]/60 font-medium text-sm">Thank you for helping us synchronize the city.</p>
        </div>
        <div className="bg-white/40 backdrop-blur-md p-6 border-2 border-dashed border-[#1E3A8A]/30 rounded-xl mt-4 w-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#1E3A8A]/5 -rotate-45 translate-x-8 -translate-y-8" />
          <p className="text-[10px] text-[#1E3A8A]/40 uppercase font-black tracking-[0.2em] mb-2">Municipal Ledger Entry</p>
          <p className="text-4xl font-mono font-black tracking-widest text-[#1E3A8A]">{submittedTicketId}</p>
          <div className="mt-4 pt-4 border-t border-[#1E3A8A]/10 flex justify-between text-[10px] uppercase font-bold text-[#1E3A8A]/40">
            <span>{department}</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <button
          onClick={onSubmit}
          className="mt-6 px-6 py-3 w-full bg-[#1E3A8A] text-[#FDF6E3] font-black uppercase tracking-widest rounded-xl hover:bg-[#1E3A8A]/90 transition-all shadow-xl shadow-[#1E3A8A]/20"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const deptIcons: Record<string, any> = {
    PWD: <Construction size={24} />,
    Electricity: <Zap size={24} />,
    Water: <Droplets size={24} />
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col space-y-6 w-full">
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-sm border-2 border-[#1E3A8A]/10 rounded-2xl p-4 transition-all overflow-hidden relative shadow-sm">
        {isGhostMode && <div className="absolute inset-0 bg-[#1E3A8A] z-0" />}
        <div className={`relative z-10 flex items-center space-x-3 transition-colors ${isGhostMode ? 'text-[#FDF6E3]' : 'text-[#1E3A8A]'}`}>
          <div className={`p-2 rounded-xl flex items-center justify-center ${isGhostMode ? 'bg-[#FDF6E3]/10' : 'bg-[#1E3A8A]/5'}`}>
            <Ghost size={24} className={isGhostMode ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="font-black uppercase tracking-widest text-sm">Ghost Mode</h3>
            <p className={`text-[10px] font-bold ${isGhostMode ? 'text-[#FDF6E3]/70' : 'text-[#1E3A8A]/50'}`}>Report anonymously without linking your profile</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsGhostMode(!isGhostMode)}
          className={`relative z-10 w-12 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${isGhostMode ? 'bg-green-500' : 'bg-[#1E3A8A]/20'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isGhostMode ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="flex flex-col space-y-3">
        <label className="text-[10px] font-black text-[#1E3A8A]/40 uppercase tracking-widest ml-1">Select Department</label>
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(ISSUE_CATEGORIES).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setDepartment(key);
                setIssueType("");
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 ${department === key
                  ? "bg-[#1E3A8A] border-[#1E3A8A] text-[#FDF6E3] shadow-lg scale-105"
                  : "bg-white/40 border-[#1E3A8A]/10 text-[#1E3A8A] hover:bg-white hover:border-[#1E3A8A]/30"
                }`}
            >
              {deptIcons[key]}
              <span className="text-[10px] font-black mt-2 uppercase tracking-tight">{key}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {department && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] font-black text-[#1E3A8A]/40 uppercase tracking-widest ml-1">What is the problem?</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white/50 backdrop-blur-md border-2 border-[#1E3A8A]/20 rounded-2xl px-5 py-4 flex items-center justify-between text-[#1E3A8A] transition-all hover:bg-white/80 active:scale-[0.99] shadow-inner"
                >
                  <span className="font-black text-sm uppercase tracking-tight">{issueType || "Choose Category..."}</span>
                  {isDropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-xl border-4 border-white shadow-[0_20px_60px_rgba(30,58,138,0.25)] rounded-[2rem] p-3 z-50 overflow-hidden"
                    >
                      <div className="flex flex-col space-y-2">
                        {ISSUE_CATEGORIES[department].map((issue) => (
                          <motion.button
                            key={issue}
                            whileHover={{ x: 5, backgroundColor: "rgba(30,58,138,0.05)" }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => {
                              setIssueType(issue);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all flex items-center justify-between ${issueType === issue
                                ? "bg-[#1E3A8A] border-[#1E3A8A] text-[#FDF6E3] shadow-md"
                                : "bg-transparent border-transparent text-[#1E3A8A] font-bold"
                              }`}
                          >
                            <span className="text-sm uppercase tracking-tight font-black">{issue}</span>
                            {issueType === issue && <CheckCircle2 size={16} />}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black text-[#1E3A8A]/40 uppercase tracking-widest ml-1">Visual Evidence</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-[#1E3A8A]/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1E3A8A]/60 truncate mr-2">
                    {file ? file.name : "Attach Photo (Required)"}
                  </span>
                  <Camera size={18} className="text-[#1E3A8A]/40" />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label className="text-[10px] font-black text-[#1E3A8A]/40 uppercase tracking-widest ml-1">Details</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/40 backdrop-blur-sm border-2 border-[#1E3A8A]/10 rounded-xl px-4 py-3 text-sm font-bold text-[#1E3A8A] outline-none focus:border-[#1E3A8A]/40 transition-colors placeholder:text-[#1E3A8A]/20"
                placeholder="Give us a brief description..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !issueType}
              className="w-full bg-[#1E3A8A] text-[#FDF6E3] font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-[#1E3A8A]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>TRANSMITTING...</span>
                </>
              ) : (
                <span>SUBMIT REPORT</span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function TicketTrackingView() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('citysync_tickets') || '[]');
    const grouped = Object.values(stored.reduce((acc: any, t: any) => {
      if (!acc[t.shortId]) acc[t.shortId] = { ...t, count: 1 };
      else acc[t.shortId].count += 1;
      return acc;
    }, {}));
    setTickets(grouped as any[]);
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center text-black/80"><p className="animate-pulse">Loading tracking data...</p></div>;

  if (tickets.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center opacity-75">
        <MapPin size={48} className="mb-4 text-red-500/50" />
        <p className="text-black/80 font-medium">You have not submitted any reports yet.</p>
        <span className="text-sm opacity-75 inline-block mt-2">Reports you submit on this device will track here automatically.</span>
      </div>
    );
  }

  const getProgressIndex = (status: string) => {
    switch (status) {
      case 'in_progress': return 1;
      case 'resolved': return 2;
      case 'rejected': return -1;
      default: return 0;
    }
  };

  const steps = ["Registered", "In Progress", "Resolved"];

  return (
    <div className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-2 w-full">
      {tickets.slice().reverse().map(ticket => {
        const currentStep = getProgressIndex(ticket.status || 'open');
        return (
          <div key={ticket.id} className="bg-white/80 border border-gray-200 rounded-lg p-5 w-full">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="font-bold text-red-500 text-lg uppercase tracking-wider flex items-center">
                  {ticket.shortId}
                  {ticket.count > 1 && (
                    <span className="text-xs border border-red-500/50 bg-red-500/10 rounded-md px-1.5 py-0.5 ml-2 text-red-400">
                      x{ticket.count}
                    </span>
                  )}
                </h4>
                <p className="text-sm text-black/70">{ticket.category}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                ${ticket.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                  ticket.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-500' :
                    ticket.status === 'rejected' ? 'bg-red-900/40 text-red-400' :
                      'bg-blue-500/20 text-blue-500'}
              `}>
                {(ticket.status || 'open').replace('_', ' ')}
              </span>
            </div>

            {ticket.status !== 'rejected' && (
              <div className="relative mt-2 mb-4 px-2">
                <div className="absolute top-3 left-3 right-3 h-1 bg-gray-200 z-0 rounded-full" />
                <div
                  className="absolute top-3 left-3 h-1 bg-green-500 z-0 rounded-full transition-all duration-500"
                  style={{ width: `calc(${(currentStep / (steps.length - 1)) * 100}%)` }}
                />
                <div className="relative z-10 flex justify-between">
                  {steps.map((label, idx) => {
                    const isCompleted = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={label} className="flex flex-col items-center w-10">
                        <div className={`w-6 h-6 rounded-full border-4 transition-colors duration-500 bg-white
                          ${isCompleted ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'border-gray-200'}
                          ${isCurrent && idx !== steps.length - 1 ? 'animate-pulse bg-green-500' : ''}
                          ${isCompleted && !isCurrent ? 'bg-green-500' : ''}
                        `} />
                        <span className={`text-[10px] uppercase tracking-wider mt-2 font-bold whitespace-nowrap
                          ${isCompleted ? 'text-green-500' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditView() {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#1E3A8A]/5 flex items-center justify-center border border-[#1E3A8A]/10">
        <ShieldCheck size={32} className="text-[#1E3A8A]/40" />
      </div>
      <div>
        <h4 className="font-black text-[#1E3A8A] text-xl uppercase tracking-tighter">Quiet Sector</h4>
        <p className="text-[#1E3A8A]/60 font-medium text-sm">No nearby issues to audit right now.</p>
      </div>
    </div>
  );
}

function ProfileView() {
  const [profile] = useState({
    name: "John Doe",
    age: 28,
    avatarUrl: "https://i.pravatar.cc/150?img=11"
  });

  return (
    <div className="flex flex-col items-center justify-center space-y-4 px-4 pb-4 w-full">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#1E3A8A] shadow-xl">
          <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="text-center w-full mt-2">
        <h3 className="text-2xl font-bold text-[#1E3A8A] tracking-tight">{profile.name}</h3>
        <p className="text-[#1E3A8A]/70 font-semibold tracking-wide">Age: {profile.age}</p>
      </div>
      <div className="w-full mt-6 space-y-3">
        <div className="bg-white/50 border border-[#1E3A8A]/20 rounded-lg p-3 flex justify-between items-center shadow-inner">
          <span className="font-semibold text-[#1E3A8A]/80">CitySync Trust Score</span>
          <span className="font-extrabold text-green-600 bg-green-500/10 px-3 py-1 rounded-md">Excellent</span>
        </div>
      </div>
    </div>
  );
}

function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      id: 1,
      type: 'bot',
      text: "Hello! I'm your CitySync Assistant. How can I help you improve our city today?",
      options: [
        { label: "📍 Report an Issue", action: "start_report" },
        { label: "🔍 Track my Ticket", action: "track" },
        { label: "💡 Explain Features", action: "features" }
      ]
    }
  ]);
  const [input, setInput] = useState("");

  const addMessage = (msg: any) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), ...msg }]);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    addMessage({ type: 'user', text });
    setInput("");
    setTimeout(() => {
      addMessage({ type: 'bot', text: "I'm currently running in demo mode without the backend API connection!" });
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-96 h-[32rem] bg-[#FDF6E3] rounded-3xl border-4 border-[#1E40AF] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-[#1E40AF] p-4 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white">
                <Bot size={24} />
                <span className="font-black tracking-tighter text-lg">CitySync AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:rotate-90 transition-transform">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.type === 'bot' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${m.type === 'bot'
                    ? 'bg-[#1E40AF] text-white rounded-tl-none'
                    : 'bg-white border-2 border-[#1E40AF]/10 text-[#1E40AF] rounded-tr-none'
                    }`}>
                    <p className="text-sm font-bold leading-tight">{m.text}</p>
                    {m.options && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.options.map((opt: any) => (
                          <button
                            key={opt.action}
                            className="bg-white text-[#1E40AF] text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-sm"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-[#1E40AF]/10 flex space-x-2 items-center">
              <input
                type="text"
                placeholder="Ask or report something..."
                className="flex-1 bg-transparent text-sm border-none focus:ring-0 placeholder:text-gray-300 font-bold outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
              />
              <button onClick={() => handleSendMessage(input)} className="text-[#1E40AF]">
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-[#1E40AF] text-[#FDF6E3] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
      >
        <MessageSquare className="group-hover:rotate-12 transition-transform" size={28} />
      </button>
    </div>
  );
}

export default function CivilianMapDashboard() {
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const handlePinClick = (section: Section) => {
    setActiveSection((prev) => (prev === section ? null : section));
  };

  return (
    <div className="fixed inset-0 w-full h-full p-0 m-0 overflow-hidden bg-white">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/user bg.png')", opacity: 1 }}
      />
      <div className="absolute inset-0 bg-[#FDF6E3]/20 backdrop-blur-[2px] pointer-events-none z-10" />

      <div className="absolute top-4 left-4 z-20">
        <img src="/logo.png" alt="CitySync Logo" className="h-28 w-auto drop-shadow-lg" />
      </div>

      <div className="relative w-full h-full z-30">
        {PINS.map((pin, index) => {
          const isActive = activeSection === pin.section;
          const Icon = PIN_ICONS[pin.section];
          return (
            <div key={pin.section} style={{ position: "absolute", top: pin.top, left: pin.left }} className="-translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="cursor-pointer flex flex-col items-center group"
                onClick={() => handlePinClick(pin.section)}
                whileHover={{ scale: 1.15, y: -10 }}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 }}
              >
                <motion.div animate={{ rotate: isActive ? 180 : 0, scale: isActive ? 1.2 : 1, y: isActive ? 10 : 0 }} className="relative flex items-center justify-center">
                  <MapPin size={110} className="text-[#1E3A8A] drop-shadow-[0_12px_15px_rgba(30,58,138,0.5)]" fill="#1E3A8A" strokeWidth={1.5} stroke="#FDF6E3" />
                  <div className={`absolute top-[20%] transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}>
                    <div className="bg-[#FDF6E3] rounded-full p-2.5 shadow-inner border border-[#1E3A8A]/20">
                      <Icon size={28} className="text-[#1E3A8A]" />
                    </div>
                  </div>
                </motion.div>
                <div className="mt-2 whitespace-nowrap bg-[#FDF6E3] text-[#1E3A8A] font-extrabold px-3 py-1.5 rounded-md border-2 border-[#1E3A8A] shadow-xl pointer-events-none tracking-tight">
                  {pin.section}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E3A8A]/20 backdrop-blur-sm p-4"
            onClick={() => setActiveSection(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`w-full bg-[#FDF6E3] border-4 border-[#1E3A8A] rounded-2xl shadow-[0_0_50px_rgba(30,58,138,0.3)] relative overflow-hidden ${activeSection === 'Heat Map' ? 'max-w-4xl' : 'max-w-lg'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1E3A8A] border-b-2 border-[#1E3A8A] p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#FDF6E3] tracking-tight">{activeSection}</h2>
                <button className="text-[#FDF6E3]/70 hover:text-[#FDF6E3] hover:bg-white/10 p-2 rounded-full transition-colors" onClick={() => setActiveSection(null)}>
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>
              <div className={`p-6 flex flex-col justify-center space-y-4 ${activeSection === 'Heat Map' ? 'min-h-[32rem]' : 'min-h-[16rem]'}`}>
                {activeSection === "Submit a Report" ? (
                  <ReportForm onSubmit={() => setActiveSection(null)} />
                ) : activeSection === "Ticket Status" ? (
                  <TicketTrackingView />
                ) : activeSection === "Audit" ? (
                  <AuditView />
                ) : activeSection === "Profile" ? (
                  <ProfileView />
                ) : activeSection === "Heat Map" ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <Flame size={48} className="text-[#1E3A8A] opacity-50 mb-4" />
                    <h3 className="text-2xl font-black text-[#1E3A8A]">Heatmap Module Offline</h3>
                    <p className="text-[#1E3A8A]/80">The heatmap requires backend integrations to display real-time city data.</p>
                  </div>
                ) : activeSection === "WhatsApp Bot" ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                    <h3 className="text-2xl font-black text-[#1E3A8A]">CitySync WhatsApp Bot</h3>
                    <p className="text-[#1E3A8A]/80 font-medium max-w-sm">Scan the QR code below to connect with our automated AI assistant on WhatsApp.</p>
                    <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-[#1E3A8A]/20">
                      <img src="/qr.png" alt="WhatsApp Contact QR" className="w-64 h-64 object-contain" />
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ChatAssistant />
    </div>
  );
}
