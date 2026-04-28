import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, ChevronRight, ArrowLeft, Phone, MapPin, Award, Heart, Fingerprint } from "lucide-react";

interface Volunteer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  aadhaar: string;
  skills: string[];
  interests: string[];
  profilePic: string;
}

export default function VolunteersView() {
  const [view, setView] = useState<"dashboard" | "list" | "profile">("dashboard");
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = "http://localhost:5000";

  useEffect(() => {
    if (view === "list" || view === "dashboard") {
      setIsLoading(true);
      fetch(`${API_URL}/volunteers`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setVolunteers(data);
          }
        })
        .catch((err) => console.error("Error fetching volunteers:", err))
        .finally(() => setIsLoading(false));
    }
  }, [view]);

  // Dashboard stub (default view matching old Stub)
  if (view === "dashboard") {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/60 border border-[#4a3e3e]/5 p-5 rounded-[1.5rem] backdrop-blur-md shadow-sm">
            <p className="text-[9px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Active Threads</p>
            <p className="text-2xl font-black text-teal-400">{volunteers.length || "..."}</p>
          </div>
          <div className="bg-white/60 border border-[#4a3e3e]/5 p-5 rounded-[1.5rem] backdrop-blur-md shadow-sm">
            <p className="text-[9px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Open Callings</p>
            <p className="text-2xl font-black text-[#D4AF37]">12</p>
          </div>
        </div>
        <button 
          onClick={() => setView("list")}
          className="w-full py-5 bg-[#4a3e3e] text-white font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-[#4a3e3e]/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-[#4a3e3e]/20"
        >
          Show Volunteers
        </button>
      </div>
    );
  }

  // Volunteer Profile Detailed View
  if (view === "profile" && selectedVolunteer) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 h-full max-h-[60vh] overflow-y-auto pr-2">
        <div className="flex justify-between items-center pb-4 border-b border-[#4a3e3e]/10">
          <button 
            onClick={() => { setSelectedVolunteer(null); setView("list"); }}
            className="flex items-center space-x-2 text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Volunteers</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Column: Avatar & Basic Info */}
          <div className="flex-shrink-0 flex flex-col items-center space-y-4 w-full md:w-1/3">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-[0_10px_30px_rgba(74,62,62,0.1)]">
                <img 
                  src={selectedVolunteer.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedVolunteer.name)}&background=f4dada&color=4a3e3e`} 
                  alt={selectedVolunteer.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 bg-[#D4AF37] p-2 rounded-full border-2 border-white shadow-sm">
                <Users size={14} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black text-[#4a3e3e] tracking-tight">{selectedVolunteer.name}</h3>
              <p className="text-xs font-bold text-[#4a3e3e]/40 uppercase tracking-widest">{selectedVolunteer.location}</p>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex-1 w-full space-y-4">
            
            <div className="bg-white/60 p-5 rounded-[1.5rem] border border-[#4a3e3e]/5 backdrop-blur-md shadow-sm">
              <div className="flex items-start space-x-3 mb-3">
                <MapPin className="text-[#4a3e3e]/40 mt-1" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Address</p>
                  <p className="font-bold text-[#4a3e3e]">{selectedVolunteer.address || "Address not provided"}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 mb-3">
                <Phone className="text-[#4a3e3e]/40 mt-1" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Phone Number</p>
                  <p className="font-bold text-[#4a3e3e]">{selectedVolunteer.phone}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Fingerprint className="text-[#4a3e3e]/40 mt-1" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Aadhaar Card</p>
                  <p className="font-bold text-[#4a3e3e] tracking-widest">{selectedVolunteer.aadhaar || "Not uploaded"}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#fcf8f6] p-5 rounded-[1.5rem] border border-[#4a3e3e]/5 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <Award className="text-[#D4AF37]" size={18} />
                <p className="text-[10px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Skills</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedVolunteer.skills && selectedVolunteer.skills.length > 0 ? (
                  selectedVolunteer.skills.map((skill, idx) => (
                    <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-[#4a3e3e] border border-[#4a3e3e]/10 shadow-sm">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#4a3e3e]/40 font-bold">No specific skills listed</span>
                )}
              </div>
            </div>

            <div className="bg-[#f4dada]/20 p-5 rounded-[1.5rem] border border-[#f4dada]/40 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="text-rose-500" size={18} />
                <p className="text-[10px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">Interested Drives</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedVolunteer.interests && selectedVolunteer.interests.length > 0 ? (
                  selectedVolunteer.interests.map((interest, idx) => (
                    <span key={idx} className="bg-white px-3 py-1 rounded-full text-xs font-bold text-[#4a3e3e] border border-[#f4dada] shadow-sm">
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#4a3e3e]/40 font-bold">Open to all drives</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Volunteers List View
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full max-h-[60vh] overflow-y-auto pr-2">
      <div className="flex justify-between items-center pb-4 border-b border-[#4a3e3e]/10">
        <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">Present Volunteers</h3>
        <button 
          onClick={() => setView("dashboard")}
          className="text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] transition-colors"
        >
          Back to Overview
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-[#4a3e3e]/20 border-t-[#4a3e3e] rounded-full animate-spin" />
        </div>
      ) : volunteers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {volunteers.map((vol) => (
            <motion.div
              key={vol._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => { setSelectedVolunteer(vol); setView("profile"); }}
              className="bg-white p-5 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-[#4a3e3e]/10 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <img 
                    src={vol.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(vol.name)}&background=random`} 
                    alt={vol.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-black text-[#4a3e3e] text-lg leading-tight">{vol.name}</h4>
                  <p className="text-[10px] font-bold text-[#4a3e3e]/40 uppercase tracking-widest mt-1">{vol.location}</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#fcf8f6] flex items-center justify-center group-hover:bg-[#4a3e3e] transition-colors">
                <ChevronRight size={16} className="text-[#4a3e3e]/40 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[#4a3e3e]/40 font-bold py-10">No volunteers found. They are still being woven into the fabric.</p>
      )}
    </div>
  );
}
