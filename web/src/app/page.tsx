"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Briefcase, 
  ClipboardList, 
  Network, 
  Map as MapIcon, 
  X, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  MessageSquare,
  Bot,
  Send,
  Loader2,
  CheckCircle2,
  Globe,
  Heart,
  Target,
  Star,
  Flower2,
  Settings,
  Pentagon as PentagonIcon
} from "lucide-react";

// --- Custom Icons ---

const Pentagon = ({ size, fill, stroke, strokeWidth, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <path
      d="M50 5 L95 38 L78 95 L22 95 L5 38 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  </svg>
);

// --- Types & Constants ---

type Section = "Volunteers" | "Impact Projects" | "Survey Loom" | "NGO Network" | "Community Fabric" | "Profile";

interface HubPoint {
  section: Section;
  top: string;
  left: string;
  icon: any;
  description: string;
  shape: "circle" | "heart" | "star" | "flower" | "pentagon";
  color: string;
}

const HUB_POINTS: HubPoint[] = [
  { section: "Volunteers", top: "25%", left: "30%", icon: Users, description: "Manage and recruit community threads", shape: "pentagon", color: "#f4dada" },
  { section: "Impact Projects", top: "45%", left: "65%", icon: Briefcase, description: "Track ongoing social weaving projects", shape: "pentagon", color: "#e8d5d5" },
  { section: "Survey Loom", top: "70%", left: "22%", icon: ClipboardList, description: "Collect data from the field", shape: "pentagon", color: "#d8e6e0" },
  { section: "NGO Network", top: "74%", left: "72%", icon: Network, description: "Coordinate with partner organizations", shape: "pentagon", color: "#fdf6e3" },
  { section: "Community Fabric", top: "20%", left: "82%", icon: MapIcon, description: "Visualize the social landscape", shape: "pentagon", color: "#f4dada" },
];

const THEME = {
  background: "#fcf8f6", // Slightly warmer cream
  foreground: "#4a3e3e", // Deep cocoa for text
  mauve: "#e8d5d5",
  rose: "#f4dada",
  mint: "#d8e6e0",
  cream: "#fff9f5",
  gold: "#d4af37",
  silk: "rgba(255, 255, 255, 0.4)",
};

// --- Components ---

function SpoolIcon({ icon: Icon, isActive, shape, color }: { icon: any; isActive: boolean; shape: string; color: string }) {

  return (
    <div className="relative flex items-center justify-center group">
      {/* Soft Premium Glow */}
      <motion.div 
        animate={{ 
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? 0.5 : 0.15
        }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full blur-[60px]"
        style={{ backgroundColor: color }}
      />
      
      {/* Physical Button / Spool Base */}
      <motion.div 
        className={`relative w-32 h-32 flex items-center justify-center transition-all duration-700 button-custom ${
          isActive ? "scale-115 drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]" : "group-hover:scale-105 drop-shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
        }`}
      >
        {/* Glossy Overlay */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/40 to-transparent opacity-50 pointer-events-none" />
        
        {/* The Hub Icon - Floating in the center of the button */}
        <div className="z-10 bg-white/60 backdrop-blur-xl p-5 rounded-full shadow-[inset_0_2px_8px_rgba(255,255,255,1),0_8px_20px_rgba(0,0,0,0.08)] border border-white/80 transition-transform duration-500 group-hover:rotate-6">
          <Icon 
            size={36} 
            className={`transition-colors duration-500 ${isActive ? "text-[#4a3e3e]" : "text-[#4a3e3e]/70 group-hover:text-[#4a3e3e]"}`} 
            strokeWidth={1.5}
          />
        </div>

        {/* Decorative Stitching - More detailed */}
        <div className={`absolute inset-0 border-2 border-dotted rounded-full opacity-30 ${
          isActive ? "border-[#4a3e3e] scale-110" : "border-[#4a3e3e]/30 scale-100"
        } transition-all duration-1000`} style={{ borderRadius: '50%' }} />
      </motion.div>
    </div>
  );
}

function ThreadLines() {
  const [winSize, setWinSize] = useState({ w: 1000, h: 1000 });

  useEffect(() => {
    const handleResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const paths = [
    "M 30 25 C 40 15, 55 55, 65 45",
    "M 65 45 C 55 65, 35 50, 22 70",
    "M 22 70 C 40 90, 60 80, 72 74",
    "M 72 74 C 90 60, 85 40, 82 20",
    "M 82 20 C 60 10, 40 40, 30 25"
  ];

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
    >
      <defs>
        <filter id="stitchShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.1" dy="0.1" stdDeviation="0.05" floodColor="rgba(0,0,0,0.3)" />
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background "Weave" Shadow for Threads */}
      {paths.map((path, i) => (
        <motion.path 
          key={`shadow-${i}`}
          d={path} 
          stroke="rgba(74,62,62,0.03)" strokeWidth="0.5" fill="transparent"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 4, delay: i * 0.5, ease: "easeInOut" }}
        />
      ))}

      {/* Main Flowing Stitched Threads (Eleanore Style Backstitch) */}
      {paths.map((path, i) => (
        <React.Fragment key={i}>
          {/* Main Charcoal Thread */}
          <motion.path 
            d={path} 
            stroke="#1a1a1a" 
            strokeWidth="0.25" 
            fill="transparent" 
            strokeDasharray="0.6, 0.2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 5, delay: i * 0.5, ease: "easeInOut" }}
          />

          {/* Overlapping Backstitch Detail */}
          <motion.path 
            d={path} 
            stroke="#333333" 
            strokeWidth="0.2" 
            fill="transparent" 
            strokeDasharray="0.6, 0.2"
            strokeDashoffset="0.3"
            strokeLinecap="round"
            className="opacity-60"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 5, delay: i * 0.5, ease: "easeInOut" }}
          />
          
          {/* Subtle Thread Volume */}
          <motion.path 
            d={path} 
            stroke="rgba(0,0,0,0.1)" 
            strokeWidth="0.4" 
            fill="transparent" 
            filter="url(#softGlow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 5, delay: i * 0.5, ease: "easeInOut" }}
          />

          {/* Flowing Glimmer (The "Needle" path) */}
          <motion.circle
            r="0.15"
            fill="#d4af37"
            filter="url(#softGlow)"
            initial={{ offsetDistance: "0%", opacity: 0 }}
            animate={{ 
              offsetDistance: "100%", 
              opacity: [0, 1, 0],
              scale: [1, 2, 1]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              delay: i * 1.2,
              ease: "easeInOut"
            }}
            style={{ offsetPath: `path("${path}")` }}
          />
        </React.Fragment>
      ))}

      {/* Reinforcement "Cross-Stitch" at Connection Points */}
      {HUB_POINTS.map((point, i) => (
        <g key={`stitch-${i}`} transform={`translate(${parseFloat(point.left)}, ${parseFloat(point.top)})`}>
          <motion.path 
            d="M -2 -2 L 2 2 M 2 -2 L -2 2" 
            stroke="#9e5a4d" 
            strokeWidth="0.3" 
            strokeLinecap="round"
            className="opacity-40"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 + i * 0.2 }}
          />
        </g>
      ))}
    </svg>
  );
}

// --- View Stubs ---

function VolunteerStub() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Active Threads", count: "124", color: "text-teal-400" },
          { label: "Open Callings", count: "12", color: "text-[#D4AF37]" },
        ].map(s => (
          <div key={s.label} className="bg-white/60 border border-[#4a3e3e]/5 p-5 rounded-[1.5rem] backdrop-blur-md shadow-sm">
            <p className="text-[9px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>
      <button className="w-full py-5 bg-[#4a3e3e] text-white font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-[#4a3e3e]/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-[#4a3e3e]/20">
        Recruit New Volunteers
      </button>
    </div>
  );
}

function ProjectStub() {
  return (
    <div className="space-y-4">
      {["Clean Water Initiative", "Community Schooling", "Livelihood Training"].map((p, i) => (
        <motion.div 
          key={p} 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/60 border border-[#4a3e3e]/5 p-6 rounded-[2rem] flex items-center justify-between group hover:border-[#4a3e3e]/20 transition-all cursor-pointer backdrop-blur-sm shadow-sm"
        >
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-[#4a3e3e]/20 shadow-inner" />
            <span className="font-bold text-base text-[#4a3e3e]">{p}</span>
          </div>
          <ChevronRight size={20} className="text-[#4a3e3e]/20 group-hover:text-[#4a3e3e] group-hover:translate-x-1 transition-all" />
        </motion.div>
      ))}
    </div>
  );
}

// --- Survey Loom Components ---

function SurveyLoom() {
  const [view, setView] = useState<"dashboard" | "builder">("dashboard");
  const [questions, setQuestions] = useState([{ id: 1, type: "text", text: "" }]);

  if (view === "builder") {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center border-b border-[#4a3e3e]/10 pb-6">
          <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">Draft New Survey</h3>
          <button 
            onClick={() => setView("dashboard")}
            className="text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] transition-colors"
          >
            Back to Loom
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white/80 p-6 rounded-[2rem] border-2 border-dashed border-[#4a3e3e]/10">
            <input 
              type="text" 
              placeholder="Survey Title" 
              className="w-full text-2xl font-black bg-transparent border-none focus:ring-0 placeholder-[#4a3e3e]/20"
            />
            <input 
              type="text" 
              placeholder="Add a description..." 
              className="w-full text-lg mt-2 bg-transparent border-none focus:ring-0 placeholder-[#4a3e3e]/20"
            />
          </div>

          {questions.map((q, idx) => (
            <motion.div 
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-[#4a3e3e]/5 space-y-4"
            >
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={q.text}
                  onChange={(e) => {
                    const newQs = [...questions];
                    newQs[idx].text = e.target.value;
                    setQuestions(newQs);
                  }}
                  placeholder={`Question ${idx + 1}`} 
                  className="flex-1 text-xl font-bold bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#4a3e3e]/10"
                />
                <select className="bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none font-bold text-[#4a3e3e]/60 focus:ring-2 focus:ring-[#4a3e3e]/10">
                  <option>Short Answer</option>
                  <option>Multiple Choice</option>
                  <option>Checkboxes</option>
                </select>
              </div>
            </motion.div>
          ))}

          <button 
            onClick={() => setQuestions([...questions, { id: Date.now(), type: "text", text: "" }])}
            className="w-full py-6 border-2 border-dashed border-[#4a3e3e]/20 rounded-[2.5rem] text-[#4a3e3e]/40 font-black uppercase tracking-widest hover:bg-[#4a3e3e]/5 transition-all"
          >
            + Add Question Thread
          </button>

          <button className="w-full py-6 bg-[#22c55e] text-white font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Publish to the Loom
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "Surveys Created", val: "42", color: "text-amber-500" },
          { label: "Total Responses", val: "1.2k", color: "text-emerald-500" },
          { label: "Active Threads", val: "8", color: "text-sky-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/40 backdrop-blur-md p-5 rounded-[1.5rem] border border-[#4a3e3e]/5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a3e3e]/40 mb-1">{stat.label}</p>
            <p className={`text-xl font-black ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* Main Actions */}
      <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[3rem] border border-[#4a3e3e]/5 shadow-inner">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-2xl font-black text-[#4a3e3e] uppercase tracking-tighter">Active Surveys</h3>
            <p className="text-[#4a3e3e]/40 font-bold text-sm uppercase tracking-widest mt-1">Ongoing community data threads</p>
          </div>
          <button 
            onClick={() => setView("builder")}
            className="px-10 py-5 bg-[#4a3e3e] text-white font-black uppercase tracking-[0.2em] rounded-3xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            Publish New Survey
          </button>
        </div>

        <div className="space-y-4">
          {[
            { title: "Local Health Assessment", responses: 234, status: "Active" },
            { title: "Farmer Cooperative Needs", responses: 89, status: "Active" },
            { title: "Education Access Poll", responses: 567, status: "Urgent" },
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-[#4a3e3e]/10">
              <div className="flex items-center space-x-6">
                <div className={`w-3 h-3 rounded-full ${s.status === 'Urgent' ? 'bg-red-400' : 'bg-green-400'} shadow-lg`} />
                <div>
                  <h4 className="font-black text-[#4a3e3e] text-lg">{s.title}</h4>
                  <p className="text-xs font-bold text-[#4a3e3e]/30 uppercase tracking-widest">{s.responses} Responses Collected</p>
                </div>
              </div>
              <ChevronRight className="text-[#4a3e3e]/20 group-hover:text-[#4a3e3e] transition-all" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export default function WeaveHubDashboard() {
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="fixed inset-0 bg-[#fdfaf8]" />;

  return (
    <div className="fixed inset-0 w-full h-full bg-[#fdfaf8] overflow-hidden">
      {/* Premium Fabric Texture */}
      <div className="absolute inset-0 z-0">
        {/* Woven Linen Base Texture (Yellow Gingham) */}
        <div className="absolute inset-0 fabric-texture opacity-60" />
        
        {/* Refined Plaid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(74,62,62,0.08) 1px, transparent 1px),
              linear-gradient(rgba(74,62,62,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        />
        
        {/* Noise / Grain Filter for Tactile Feel */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-multiply"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Soft Silky Drape Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f4dada]/20 via-white/30 to-[#d8e6e0]/20 mix-blend-overlay animate-[pulse_15s_infinite_alternate]" />
        
        {/* Tactile Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage: `url("https://www.transparenttextures.com/patterns/pinstriped-suit.png")`,
          }}
        />
        
        {/* Vignette for depth */}
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(74,62,62,0.08)] pointer-events-none" />
      </div>

      {/* Brand Header */}
      <div className="absolute top-8 left-12 z-50">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="cursor-pointer"
        >
          <img 
            src="/weave_logo.png.png" 
            alt="Weave Logo" 
            className="h-28 w-auto drop-shadow-sm select-none"
          />
        </motion.div>
      </div>

      {/* Flowy Thread Network */}
      <ThreadLines />

      {/* Navigation Buttons (Spools) */}
      <div className="relative w-full h-full z-20">
        {HUB_POINTS.map((point, index) => {
          const isActive = activeSection === point.section;
          return (
            <div 
              key={point.section} 
              style={{ position: "absolute", top: point.top, left: point.left }} 
              className="-translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                className="cursor-pointer flex flex-col items-center"
                onClick={() => setActiveSection(isActive ? null : point.section)}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 20 }}
              >
                <SpoolIcon icon={point.icon} isActive={isActive} shape={point.shape} color={point.color} />
                <div className="mt-8">
                  <motion.div 
                    animate={{ 
                      borderColor: isActive ? point.color : "rgba(74,62,62,0.05)",
                      backgroundColor: isActive ? "white" : "rgba(255,255,255,0.4)",
                      y: isActive ? -8 : 0,
                      scale: isActive ? 1.05 : 1
                    }}
                    className="backdrop-blur-3xl px-10 py-4 rounded-3xl border shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition-all"
                  >
                    <span className="text-[13px] font-black text-[#4a3e3e] uppercase tracking-[0.5em]">{point.section}</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Feature Implementation Modals */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#4a3e3e]/30 backdrop-blur-[10px] p-6"
            onClick={() => setActiveSection(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="w-full max-w-3xl bg-[#fcf8f6] border border-[#4a3e3e]/5 rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(74,62,62,0.1)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Banner */}
              <div className="h-1.5 bg-gradient-to-r from-[#f4dada] via-[#d8e6e0] to-[#e8d5d5]" />
              
              <div className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-[#4a3e3e] tracking-tighter uppercase leading-none">{activeSection}</h2>
                    <div className="h-1 w-20 bg-[#4a3e3e]/10 mt-3 rounded-full" />
                    <p className="text-[#4a3e3e]/40 font-bold text-xs mt-3 uppercase tracking-[0.3em]">
                      {HUB_POINTS.find(p => p.section === activeSection)?.description}
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveSection(null)}
                    className="p-4 rounded-2xl bg-[#4a3e3e]/5 text-[#4a3e3e] hover:bg-[#4a3e3e] hover:text-white transition-all transform hover:rotate-90 shadow-sm border border-[#4a3e3e]/10"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="min-h-[300px] relative">
                  {activeSection === "Volunteers" && <VolunteerStub />}
                  {activeSection === "Impact Projects" && <ProjectStub />}
                  {activeSection === "Survey Loom" && <SurveyLoom />}
                  {activeSection === "NGO Network" && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                      <div className="p-8 rounded-full bg-[#2DD4BF]/5 border-2 border-[#2DD4BF]/20">
                        <Globe size={80} className="text-[#2DD4BF]/40" />
                      </div>
                      <p className="text-[#4a3e3e]/40 font-black uppercase tracking-[0.4em] text-sm">Inter-community fabric active</p>
                    </div>
                  )}
                  {activeSection === "Community Fabric" && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                      <div className="p-8 rounded-full bg-red-500/5 border-2 border-red-500/20">
                        <Heart size={80} className="text-red-500/30" />
                      </div>
                      <p className="text-[#4a3e3e]/40 font-black uppercase tracking-[0.4em] text-sm">Mapping the heartbeat of change</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bottom Decorative Stitching */}
              <div className="flex justify-center pb-10 opacity-20">
                <div className="flex space-x-4">
                  {[...Array(18)].map((_, i) => (
                    <div key={i} className="w-1 h-4 bg-[#4a3e3e] rounded-full rotate-[35deg]" />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (Needle) */}
      <div className="fixed bottom-12 right-12 z-[2000]">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          className="w-24 h-24 rounded-[2.5rem] bg-white text-[#4a3e3e] flex items-center justify-center shadow-xl border border-[#4a3e3e]/10"
        >
          <MessageSquare size={40} />
        </motion.button>
      </div>
    </div>
  );
}

