"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Globe, MapPin, Phone, Mail, ExternalLink,
  CheckCircle2, Plus, LogOut, Loader2, ChevronRight,
  Navigation, Target, X,
} from "lucide-react";

const API = "http://localhost:5000";

// ─── Haversine distance (km) ────────────────────────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Seed data (used as fallback if backend empty) ───────────────────────────
const COMMUNITY_SEED = [
  { _id: "c1", name: "Delhi Clean Water Circle", purpose: "Water & Sanitation", location: "New Delhi", lat: 28.6139, lng: 77.209, description: "Fighting for clean water access in Delhi NCR", members: [] },
  { _id: "c2", name: "Mumbai Education Hub", purpose: "Education", location: "Mumbai", lat: 19.076, lng: 72.8777, description: "Connecting educators & learners across Mumbai", members: [] },
  { _id: "c3", name: "Bengaluru Green Warriors", purpose: "Environment", location: "Bengaluru", lat: 12.9716, lng: 77.5946, description: "Tree planting and sustainability drives", members: [] },
  { _id: "c4", name: "Chennai Health Network", purpose: "Health", location: "Chennai", lat: 13.0827, lng: 80.2707, description: "Community health camps and awareness drives", members: [] },
  { _id: "c5", name: "Kolkata Livelihood Forum", purpose: "Livelihood", location: "Kolkata", lat: 22.5726, lng: 88.3639, description: "Skill training and employment for youth", members: [] },
  { _id: "c6", name: "Jaipur Women Empowerment", purpose: "Women's Rights", location: "Jaipur", lat: 26.9124, lng: 75.7873, description: "Supporting women entrepreneurs and SHGs", members: [] },
  { _id: "c7", name: "Hyderabad Tech for Good", purpose: "Education", location: "Hyderabad", lat: 17.385, lng: 78.4867, description: "Technology for social impact", members: [] },
  { _id: "c8", name: "Pune Food Security Network", purpose: "Food Security", location: "Pune", lat: 18.5204, lng: 73.8567, description: "Zero hunger initiatives for Pune district", members: [] },
];

const NGO_SEED = [
  { _id: "n1", name: "Jal Shakti Foundation", purpose: "Water & Sanitation", location: "New Delhi", lat: 28.6139, lng: 77.209, description: "Providing clean water to 50,000+ households across NCR", contact: "+91-11-2345-6789", email: "info@jalshakti.org", website: "jalshakti.org" },
  { _id: "n2", name: "Shiksha Setu", purpose: "Education", location: "Mumbai", lat: 19.076, lng: 72.8777, description: "Bridging education gaps for underprivileged children", contact: "+91-22-3456-7890", email: "connect@shikshasetu.org", website: "shikshasetu.org" },
  { _id: "n3", name: "Green Earth Initiative", purpose: "Environment", location: "Bengaluru", lat: 12.9716, lng: 77.5946, description: "Planting 1 million trees across Karnataka", contact: "+91-80-4567-8901", email: "green@gei.org", website: "gei.org" },
  { _id: "n4", name: "Aarogya Seva", purpose: "Health", location: "Chennai", lat: 13.0827, lng: 80.2707, description: "Free healthcare for rural Tamil Nadu communities", contact: "+91-44-5678-9012", email: "care@aarogyaseva.org", website: "aarogyaseva.org" },
  { _id: "n5", name: "Jeevika Network", purpose: "Livelihood", location: "Kolkata", lat: 22.5726, lng: 88.3639, description: "Microfinance and skill training for women", contact: "+91-33-6789-0123", email: "info@jeevika.net", website: "jeevika.net" },
  { _id: "n6", name: "Sahyog Foundation", purpose: "Community Dev", location: "Hyderabad", lat: 17.385, lng: 78.4867, description: "Holistic community development programs", contact: "+91-40-7890-1234", email: "hello@sahyog.org", website: "sahyog.org" },
  { _id: "n7", name: "Annadaata Trust", purpose: "Food Security", location: "Jaipur", lat: 26.9124, lng: 75.7873, description: "Feeding 10,000+ meals daily to those in need", contact: "+91-14-1234-5678", email: "trust@annadaata.org", website: "annadaata.org" },
  { _id: "n8", name: "Digital Disha", purpose: "Education", location: "Pune", lat: 18.5204, lng: 73.8567, description: "Digital literacy programs for rural communities", contact: "+91-20-3456-7890", email: "info@digitaldisha.org", website: "digitaldisha.org" },
  { _id: "n9", name: "Nari Shakti Manch", purpose: "Women's Rights", location: "Lucknow", lat: 26.8467, lng: 80.9462, description: "Legal aid, counseling and empowerment for women", contact: "+91-52-2345-6789", email: "help@narishakti.org", website: "narishaktimanch.org" },
  { _id: "n10", name: "Vriksha Mitra", purpose: "Environment", location: "Chandigarh", lat: 30.7333, lng: 76.7794, description: "Afforestation drives across Punjab and Haryana", contact: "+91-17-2345-6789", email: "trees@vrikshamitra.org", website: "vrikshamitra.org" },
];

const PURPOSE_COLORS: Record<string, string> = {
  "Water & Sanitation": "bg-sky-100 text-sky-700",
  "Education": "bg-amber-100 text-amber-700",
  "Environment": "bg-emerald-100 text-emerald-700",
  "Health": "bg-rose-100 text-rose-700",
  "Livelihood": "bg-purple-100 text-purple-700",
  "Women's Rights": "bg-pink-100 text-pink-700",
  "Food Security": "bg-orange-100 text-orange-700",
  "Community Dev": "bg-teal-100 text-teal-700",
};

// ─── localStorage helpers ────────────────────────────────────────────────────
const getJoined = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem("weave_joined") || "[]")); }
  catch { return new Set(); }
};
const saveJoined = (ids: Set<string>) =>
  localStorage.setItem("weave_joined", JSON.stringify([...ids]));

// ─── Sub-components ──────────────────────────────────────────────────────────

function PurposeTag({ purpose }: { purpose: string }) {
  const cls = PURPOSE_COLORS[purpose] || "bg-[#4a3e3e]/10 text-[#4a3e3e]/70";
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      {purpose}
    </span>
  );
}

function CommunityCard({
  c, joined, onToggle,
}: { c: any; joined: boolean; onToggle: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur border border-[#4a3e3e]/5 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-[#4a3e3e]/15 transition-all"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-black text-[#4a3e3e] text-sm truncate">{c.name}</p>
          <PurposeTag purpose={c.purpose} />
        </div>
        <p className="text-[11px] text-[#4a3e3e]/50 font-medium truncate">{c.description}</p>
        <div className="flex items-center gap-1 mt-1">
          <MapPin size={10} className="text-[#4a3e3e]/30" />
          <span className="text-[10px] text-[#4a3e3e]/40 font-bold">{c.location}</span>
          <span className="text-[10px] text-[#4a3e3e]/30 ml-2">
            {(c.members?.length || 0)} members
          </span>
        </div>
      </div>
      <button
        onClick={() => onToggle(c._id)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
          joined
            ? "bg-[#4a3e3e]/5 text-[#4a3e3e]/50 hover:bg-red-50 hover:text-red-400"
            : "bg-[#4a3e3e] text-white hover:bg-[#4a3e3e]/80 hover:scale-105"
        }`}
      >
        {joined ? <><LogOut size={11} /> Leave</> : <><Plus size={11} /> Join</>}
      </button>
    </motion.div>
  );
}

function NGOCard({ ngo, distanceKm }: { ngo: any; distanceKm?: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 backdrop-blur border border-[#4a3e3e]/5 rounded-2xl p-5 hover:border-[#4a3e3e]/15 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-black text-[#4a3e3e] text-sm">{ngo.name}</p>
            <PurposeTag purpose={ngo.purpose} />
            {distanceKm !== undefined && (
              <span className="text-[9px] font-black bg-[#4a3e3e]/5 text-[#4a3e3e]/50 px-2 py-0.5 rounded-full">
                {distanceKm < 50 ? "🔴" : distanceKm < 200 ? "🟠" : "🟢"}{" "}
                {distanceKm < 1 ? "<1 km" : `${Math.round(distanceKm)} km`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#4a3e3e]/50 font-medium">{ngo.description}</p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={10} className="text-[#4a3e3e]/30" />
            <span className="text-[10px] text-[#4a3e3e]/40 font-bold">{ngo.location}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-2 rounded-xl bg-[#4a3e3e]/5 hover:bg-[#4a3e3e]/10 transition-all"
        >
          <ChevronRight
            size={14}
            className={`text-[#4a3e3e]/40 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[#4a3e3e]/5 grid grid-cols-3 gap-3">
              {ngo.contact && (
                <a
                  href={`tel:${ngo.contact}`}
                  className="flex flex-col items-center gap-1.5 p-3 bg-sky-50 rounded-xl hover:bg-sky-100 transition-all group"
                >
                  <Phone size={16} className="text-sky-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-sky-600">Call</span>
                </a>
              )}
              {ngo.email && (
                <a
                  href={`mailto:${ngo.email}`}
                  className="flex flex-col items-center gap-1.5 p-3 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all group"
                >
                  <Mail size={16} className="text-rose-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-600">Email</span>
                </a>
              )}
              {ngo.website && (
                <a
                  href={`https://${ngo.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all group"
                >
                  <ExternalLink size={16} className="text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Website</span>
                </a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1">
              {ngo.contact && (
                <p className="text-[10px] text-[#4a3e3e]/50 font-bold">{ngo.contact}</p>
              )}
              {ngo.email && (
                <p className="text-[10px] text-[#4a3e3e]/50 font-bold">{ngo.email}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = "communities" | "contact";
type CommView = "joined" | "available";
type NgoFilter = "nearby" | "purpose";

export default function NGONetwork() {
  const [tab, setTab] = useState<Tab>("communities");
  const [commView, setCommView] = useState<CommView>("joined");

  const [communities, setCommunities] = useState<any[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [ngos, setNgos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // NGO filter state
  const [ngoFilter, setNgoFilter] = useState<NgoFilter>("nearby");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    setJoinedIds(getJoined());
    const fetchAll = async () => {
      try {
        const [cRes, nRes] = await Promise.all([
          fetch(`${API}/communities`),
          fetch(`${API}/ngos`),
        ]);
        if (!cRes.ok || !cRes.headers.get("content-type")?.includes("application/json")) throw new Error("Invalid communities");
        if (!nRes.ok || !nRes.headers.get("content-type")?.includes("application/json")) throw new Error("Invalid ngos");
        const cData = await cRes.json();
        const nData = await nRes.json();
        setCommunities(Array.isArray(cData) ? cData : COMMUNITY_SEED);
        setNgos(Array.isArray(nData) ? nData : NGO_SEED);
      } catch {
        setCommunities(COMMUNITY_SEED);
        setNgos(NGO_SEED);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleToggleCommunity = (id: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveJoined(next);
      return next;
    });
  };

  const requestLocation = () => {
    setLocationLoading(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => { setLocationError(true); setLocationLoading(false); },
      { timeout: 8000 }
    );
  };

  // Derived data
  const joinedComms = communities.filter(c => joinedIds.has(c._id));
  const availableComms = communities.filter(c => !joinedIds.has(c._id));

  const allPurposes = [...new Set(ngos.map(n => n.purpose))];

  const filteredNgos = (() => {
    if (ngoFilter === "nearby" && userPos) {
      return [...ngos]
        .map(n => ({ ...n, dist: distKm(userPos.lat, userPos.lng, n.lat, n.lng) }))
        .sort((a, b) => a.dist - b.dist);
    }
    if (ngoFilter === "purpose" && selectedPurpose) {
      return ngos.filter(n => n.purpose === selectedPurpose);
    }
    return ngos;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[#4a3e3e]/30" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Joined", value: joinedIds.size, color: "text-emerald-500", icon: CheckCircle2 },
          { label: "Available", value: availableComms.length, color: "text-amber-500", icon: Users },
          { label: "NGOs", value: ngos.length, color: "text-sky-500", icon: Globe },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/60 backdrop-blur border border-[#4a3e3e]/5 p-4 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon size={11} className="text-[#4a3e3e]/30" />
              <p className="text-[9px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 bg-[#4a3e3e]/5 p-1.5 rounded-2xl">
        {([["communities", "Communities"], ["contact", "Contact NGOs"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
              tab === key
                ? "bg-white text-[#4a3e3e] shadow-sm"
                : "text-[#4a3e3e]/40 hover:text-[#4a3e3e]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Communities ── */}
      {tab === "communities" && (
        <div className="space-y-4">
          {/* Sub toggle */}
          <div className="flex gap-2">
            {([["joined", `My Communities (${joinedIds.size})`], ["available", `Available (${availableComms.length})`]] as [CommView, string][]).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setCommView(v)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  commView === v
                    ? "border-[#4a3e3e]/20 bg-[#4a3e3e] text-white"
                    : "border-[#4a3e3e]/10 text-[#4a3e3e]/50 hover:border-[#4a3e3e]/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {commView === "joined" && (
              joinedComms.length === 0 ? (
                <div className="text-center py-12 text-[#4a3e3e]/30 font-black uppercase tracking-widest text-xs">
                  No communities joined yet
                </div>
              ) : (
                joinedComms.map((c, i) => (
                  <motion.div key={c._id} transition={{ delay: i * 0.05 }}>
                    <CommunityCard c={c} joined={true} onToggle={handleToggleCommunity} />
                  </motion.div>
                ))
              )
            )}
            {commView === "available" && (
              availableComms.length === 0 ? (
                <div className="text-center py-12 text-[#4a3e3e]/30 font-black uppercase tracking-widest text-xs">
                  You've joined all communities!
                </div>
              ) : (
                availableComms.map((c, i) => (
                  <motion.div key={c._id} transition={{ delay: i * 0.05 }}>
                    <CommunityCard c={c} joined={false} onToggle={handleToggleCommunity} />
                  </motion.div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Contact NGOs ── */}
      {tab === "contact" && (
        <div className="space-y-4">
          {/* Filter toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setNgoFilter("nearby"); if (!userPos) requestLocation(); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                ngoFilter === "nearby"
                  ? "border-[#4a3e3e]/20 bg-[#4a3e3e] text-white"
                  : "border-[#4a3e3e]/10 text-[#4a3e3e]/50 hover:border-[#4a3e3e]/20"
              }`}
            >
              {locationLoading ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
              Nearby
            </button>
            <button
              onClick={() => setNgoFilter("purpose")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                ngoFilter === "purpose"
                  ? "border-[#4a3e3e]/20 bg-[#4a3e3e] text-white"
                  : "border-[#4a3e3e]/10 text-[#4a3e3e]/50 hover:border-[#4a3e3e]/20"
              }`}
            >
              <Target size={11} />
              Similar Purpose
            </button>
          </div>

          {/* Location error notice */}
          {locationError && ngoFilter === "nearby" && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl">
              <X size={13} className="text-rose-400 flex-shrink-0" />
              <p className="text-[10px] font-bold text-rose-500">
                Location access denied. Enable location or switch to Purpose filter.
              </p>
            </div>
          )}

          {/* Purpose chips */}
          {ngoFilter === "purpose" && (
            <div className="flex flex-wrap gap-2">
              {allPurposes.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPurpose(prev => prev === p ? null : p)}
                  className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                    selectedPurpose === p
                      ? "border-[#4a3e3e]/30 bg-[#4a3e3e] text-white"
                      : "border-[#4a3e3e]/10 text-[#4a3e3e]/50 hover:border-[#4a3e3e]/20"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Nearby: no location yet */}
          {ngoFilter === "nearby" && !userPos && !locationLoading && !locationError && (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center mx-auto">
                <Navigation size={24} className="text-sky-400" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#4a3e3e]/40">
                Allow location to find nearby NGOs
              </p>
              <button
                onClick={requestLocation}
                className="px-6 py-3 bg-[#4a3e3e] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
              >
                Enable Location
              </button>
            </div>
          )}

          {/* NGO List */}
          {(userPos || ngoFilter === "purpose") && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredNgos.length === 0 ? (
                <p className="text-center py-8 text-[#4a3e3e]/30 font-black uppercase tracking-widest text-xs">
                  No NGOs found
                </p>
              ) : (
                filteredNgos.map((ngo: any, i: number) => (
                  <motion.div key={ngo._id} transition={{ delay: i * 0.05 }}>
                    <NGOCard
                      ngo={ngo}
                      distanceKm={
                        ngoFilter === "nearby" && userPos
                          ? ngo.dist
                          : undefined
                      }
                    />
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
