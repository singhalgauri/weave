"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
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
  CheckCircle2,
  Heart,
  Target,
  Star,
  Flower2,
  Settings,
  Pentagon as PentagonIcon,
  AlertTriangle,
} from "lucide-react";

const HeatmapView = dynamic(() => import("./HeatmapView"), { ssr: false });
const NGONetwork  = dynamic(() => import("./NGONetwork"),  { ssr: false });
const VolunteersView = dynamic(() => import("./VolunteersView"), { ssr: false });
import Chatbot from "./Chatbot";

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

type Section = "Volunteers" | "Impact Projects" | "Survey Loom" | "NGO Network" | "Community Fabric" | "Reports";

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
  { section: "Reports", top: "50%", left: "45%", icon: AlertTriangle, description: "Verify civilian reports", shape: "pentagon", color: "#e8d5d5" },
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
    "M 65 45 C 60 55, 50 45, 45 50",
    "M 45 50 C 35 60, 30 55, 22 70",
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
              offsetDistance: ["0%", "100%"], 
              opacity: [0, 1, 0],
              scale: [1, 2, 1]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              delay: i * 1.2,
              ease: "linear"
            }}
            style={{ offsetPath: `path('${path}')` } as any}
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


const TASK_SEED = [
  { _id: "t1", title: "Clean Water Drive", type: "Clean Water", description: "Distribute water filters to 50 households.", location: "New Delhi", volunteersNeeded: 5, status: "Assigned", scheduledDate: new Date().toISOString(), assignedVolunteers: [{ name: "Riya Sharma", status: "Accepted" }] },
  { _id: "t2", title: "School Supply Run", type: "Community Schooling", description: "Deliver textbooks to local primary school.", location: "Mumbai", volunteersNeeded: 2, status: "Pending", scheduledDate: new Date().toISOString(), assignedVolunteers: [] },
  { _id: "t3", title: "Health Checkup Camp", type: "Medical Camp", description: "Assist doctors in organizing a free checkup camp.", location: "Bengaluru", volunteersNeeded: 10, status: "Completed", scheduledDate: new Date().toISOString(), assignedVolunteers: [{ name: "Sneha Reddy", status: "Accepted" }] },
];

function ProjectStub() {
  const [view, setView] = useState<"dashboard" | "builder">("dashboard");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Clean Water");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [volunteersNeeded, setVolunteersNeeded] = useState("1");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (view === "dashboard") {
      fetchTasks();
    }
  }, [view]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/tasks");
      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        console.warn("Backend tasks unavailable, using seed data.");
        setTasks(TASK_SEED);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        setTasks(TASK_SEED);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks(TASK_SEED);
    } finally {
      setLoading(false);
    }
  };

  const markTaskFinished = async (id: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/tasks/${id}/complete`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchTasks();
      } else {
        const text = await res.text();
        console.error("Failed to mark task finished:", res.status, text);
      }
    } catch (err) {
      console.error("Error marking task finished:", err);
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !location || !volunteersNeeded) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          type, 
          description, 
          location, 
          volunteersNeeded: parseInt(volunteersNeeded),
          scheduledDate: scheduledDate || undefined,
          scheduledTime: scheduledTime || undefined
        })
      });
      if (res.ok) {
        setView("dashboard");
        setTitle(""); setDescription(""); setLocation("");
        setVolunteersNeeded("1"); setScheduledDate(""); setScheduledTime("");
        fetchTasks();
      } else {
        let errorData = { error: 'Failed to create task' };
        if (res.headers.get("content-type")?.includes("application/json")) {
          errorData = await res.json();
        }
        alert(errorData.error);
      }
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "builder") {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center border-b border-[#4a3e3e]/10 pb-6">
          <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">Create Task / Project</h3>
          <button 
            onClick={() => setView("dashboard")}
            className="text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Task Title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#4a3e3e]/10"
          />
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none font-bold text-[#4a3e3e]/60 focus:ring-2 focus:ring-[#4a3e3e]/10"
          >
            <option>Clean Water</option>
            <option>Community Schooling</option>
            <option>Livelihood Training</option>
            <option>Medical Camp</option>
            <option>Relief Distribution</option>
          </select>
          <textarea 
            placeholder="Description..." 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-lg bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#4a3e3e]/10"
            rows={3}
          />
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="City Name" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-2/3 text-lg font-bold bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#4a3e3e]/10"
            />
            <input 
              type="number" 
              placeholder="Volunteers Needed" 
              value={volunteersNeeded}
              onChange={(e) => setVolunteersNeeded(e.target.value)}
              className="w-1/3 text-lg font-bold bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none focus:ring-2 focus:ring-[#4a3e3e]/10"
              min="1"
            />
          </div>

          {/* Schedule */}
          <div className="bg-[#fcf8f6] rounded-2xl p-4 border border-[#4a3e3e]/5 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4a3e3e]/40">📅 Schedule (optional — adds Google Calendar event on acceptance)</p>
            <div className="flex gap-3">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-1/2 text-base font-bold bg-white px-4 py-3 rounded-xl border border-[#4a3e3e]/10 focus:ring-2 focus:ring-[#4a3e3e]/10"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-1/2 text-base font-bold bg-white px-4 py-3 rounded-xl border border-[#4a3e3e]/10 focus:ring-2 focus:ring-[#4a3e3e]/10"
              />
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={isSubmitting}
            className="w-full py-6 mt-4 bg-[#22c55e] text-white font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Assigning..." : "Assign Task to Nearest Volunteers"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-4 border-b border-[#4a3e3e]/10 pb-4">
        <div>
          <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">Active Projects</h3>
          <p className="text-[#4a3e3e]/50 text-sm font-bold mt-1">Tasks automatically assigned based on location</p>
        </div>
        <button 
          onClick={() => setView("builder")}
          className="px-6 py-3 bg-[#4a3e3e] text-white font-black uppercase tracking-[0.1em] text-xs rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all"
        >
          Create Task
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-[#4a3e3e]/50 font-bold text-center py-10">Loading tasks...</p>
        ) : tasks.length > 0 ? (
          tasks.map((task: any, i: number) => (
            <motion.div 
              key={task._id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-[#4a3e3e]/5 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-lg text-[#4a3e3e]">{task.title}</h4>
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#4a3e3e]/40 mt-1">{task.type} • {task.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    task.status === 'Completed' ? 'bg-blue-100 text-blue-600' : 
                    task.status === 'Assigned' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {task.status}
                  </div>
                  {task.status !== 'Completed' && (
                    <button
                      onClick={() => markTaskFinished(task._id)}
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#4a3e3e] text-[#fcf8f6] hover:bg-[#4a3e3e]/80 transition-colors"
                    >
                      Mark Finished
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold text-[#4a3e3e]/60 mt-4 bg-[#fcf8f6] p-4 rounded-xl border border-[#4a3e3e]/5">
                {task.description}
              </p>

              {/* Schedule info */}
              {task.scheduledDate && (
                <div className="mt-3 flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <span className="text-blue-400 text-lg">📅</span>
                  <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">
                      {new Date(task.scheduledDate).toDateString()}
                      {task.scheduledTime && ` · ${task.scheduledTime}`}
                    </p>
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('[Weave] ' + task.title)}&dates=${new Date(task.scheduledDate).toISOString().replace(/[-:]/g,'').split('.')[0]}Z/${new Date(new Date(task.scheduledDate).getTime()+7200000).toISOString().replace(/[-:]/g,'').split('.')[0]}Z&details=${encodeURIComponent(task.description)}&location=${encodeURIComponent(task.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-black text-blue-400 hover:text-blue-600 uppercase tracking-widest underline"
                    >
                      Add to Google Calendar →
                    </a>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-xs font-black uppercase tracking-widest text-[#4a3e3e]/40 mb-2">
                  Assigned Volunteers ({task.assignedVolunteers?.length || 0}/{task.volunteersNeeded})
                </p>
                {task.assignedVolunteers && task.assignedVolunteers.length > 0 ? (
                  <div className="space-y-2">
                    {task.assignedVolunteers.map((v: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-[#f4dada]/20 p-3 rounded-xl border border-[#4a3e3e]/5">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-[#4a3e3e]/60" /> 
                          <span className="text-[#4a3e3e] font-bold text-sm">{v.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                          v.status === 'Accepted' ? 'bg-green-100 text-green-600' :
                          v.status === 'Rejected' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-[#4a3e3e]/50 italic">No volunteers assigned yet.</p>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-[#4a3e3e]/50 font-bold text-center py-10">No active tasks. Create one to assign volunteers.</p>
        )}
      </div>
    </div>
  );
}



// --- Community Fabric (Leaflet Heatmap) ---

function CommunityFabric() {
  return <HeatmapView />;
}

// --- Reports View ---

function ReportsView() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/problems");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleAssign = async (id: string) => {
    setAssigning(id);
    try {
      const res = await fetch(`http://localhost:5000/problems/${id}/assign`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`Volunteer Assigned: ${data.assignedTo.name}`);
        fetchReports();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to assign volunteer");
      }
    } catch (err) {
      console.error("Error assigning volunteer:", err);
      alert("Error assigning volunteer");
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#4a3e3e]/10 pb-4">
        <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">Civilian Reports</h3>
        <p className="text-[#4a3e3e]/50 text-sm font-bold mt-1">Verify community issues with nearby volunteers</p>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {loading ? (
          <p className="text-[#4a3e3e]/50 font-bold text-center py-10">Loading reports...</p>
        ) : reports.length > 0 ? (
          reports.map((report: any, i: number) => (
            <motion.div 
              key={report._id} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-[#4a3e3e]/5 shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-black text-lg text-[#4a3e3e]">{report.title}</h4>
                  <p className="text-[10px] uppercase font-black tracking-widest text-[#4a3e3e]/40 mt-1">📍 {report.location}</p>
                  
                  <div className="mt-3 flex gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#fcf8f6] border border-[#4a3e3e]/10 text-[#4a3e3e]/60">
                      Skill Needed: {report.requiredSkill || 'General'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      report.status === 'Verified Pending' || report.status === 'Assigned' ? 'bg-amber-100 text-amber-600' : 
                      report.status === 'Verified' ? 'bg-green-100 text-green-600' : 'bg-[#e8d5d5] text-[#4a3e3e]'
                    }`}>
                      {report.status}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#4a3e3e]/60 mt-4 bg-[#fcf8f6] p-4 rounded-xl border border-[#4a3e3e]/5">
                    {report.description}
                  </p>

                  <div className="mt-4 p-4 rounded-xl border border-[#4a3e3e]/5 bg-white">
                    <p className="text-xs font-black uppercase tracking-widest text-[#4a3e3e]/40 mb-2">Verification Status</p>
                    {report.assignedVolunteer && report.assignedVolunteer.email ? (
                      <div className="flex items-center gap-2 text-sm font-bold text-green-600">
                        <CheckCircle2 size={16} />
                        Assigned to {report.assignedVolunteer.name} ({report.assignedVolunteer.phone})
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#4a3e3e]/50">Unassigned</span>
                        <button
                          onClick={() => handleAssign(report._id)}
                          disabled={assigning === report._id}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#4a3e3e] text-white hover:bg-[#4a3e3e]/80 transition-colors disabled:opacity-50"
                        >
                          {assigning === report._id ? 'Assigning...' : 'Find Nearest Volunteer'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {report.imageUrl && (
                  <div className="w-32 h-32 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                    <img src={report.imageUrl.startsWith('http') ? report.imageUrl : `http://localhost:5000${report.imageUrl}`} alt="Report" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-[#4a3e3e]/50 font-bold text-center py-10">No reports available.</p>
        )}
      </div>
    </div>
  );
}

// --- Survey Loom Components ---

const SURVEY_SEED = [
  { _id: "s1", title: "Clean Water Access", description: "Survey on drinking water availability in rural areas", questions: [{ id: 1, type: "text", text: "Is clean water available?" }], responsesCount: 45 },
  { _id: "s2", title: "Education Infrastructure", description: "Assessing school facilities and teacher availability", questions: [], responsesCount: 120 },
  { _id: "s3", title: "Healthcare Needs", description: "Identifying primary healthcare requirements", questions: [], responsesCount: 85 }
];

const SURVEY_RESPONSES_SEED = [
  { userName: "Riya Sharma", responses: [{ questionText: "Is clean water available?", answer: "Yes, but only for 2 hours daily." }, { questionText: "Distance to nearest source?", answer: "1 km" }] },
  { userName: "Amit Patel", responses: [{ questionText: "Is clean water available?", answer: "No, we rely on tankers." }, { questionText: "Distance to nearest source?", answer: "N/A" }] }
];

function SurveyLoom() {
  const [view, setView] = useState<"dashboard" | "builder" | "analytics">("dashboard");
  const [questions, setQuestions] = useState<any[]>([{ id: 1, type: "Short Answer", text: "", options: ["Option 1"] }]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSurveys, setActiveSurveys] = useState<any[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<any>(null);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);

  const API_URL = "http://localhost:5000";

  useEffect(() => {
    if (view === "dashboard") {
      fetch(`${API_URL}/surveys`)
        .then(res => {
          if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
            console.warn("Backend surveys unavailable, using seed data.");
            return SURVEY_SEED;
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setActiveSurveys(data);
          } else {
            setActiveSurveys(SURVEY_SEED);
          }
        })
        .catch(err => {
          console.error("Error fetching surveys:", err);
          setActiveSurveys(SURVEY_SEED);
        });
    }
    if (view === "analytics" && selectedSurvey) {
      fetch(`${API_URL}/surveys/${selectedSurvey._id}/responses`)
        .then(res => {
          if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
            console.warn("Backend responses unavailable, using seed data.");
            return SURVEY_RESPONSES_SEED;
          }
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setSurveyResponses(data);
          } else {
            setSurveyResponses(SURVEY_RESPONSES_SEED);
          }
        })
        .catch(err => {
          console.error("Error fetching responses:", err);
          setSurveyResponses(SURVEY_RESPONSES_SEED);
        });
    }
  }, [view, selectedSurvey]);

  const handlePublish = async () => {
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description, 
          questions: questions.map(q => ({
            ...q,
            type: q.type === "Short Answer" ? "text" : q.type // Match backend expectations if needed
          }))
        })
      });
      if (res.ok) {
        setView("dashboard");
        setTitle("");
        setDescription("");
        setQuestions([{ id: 1, type: "text", text: "" }]);
      }
    } catch (err) {
      console.error("Error publishing survey:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "analytics" && selectedSurvey) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center border-b border-[#4a3e3e]/10 pb-6">
          <div>
            <h3 className="text-xl font-black text-[#4a3e3e] uppercase tracking-wider">{selectedSurvey.title} Analytics</h3>
            <p className="text-[#4a3e3e]/60 font-bold mt-1">Total Responses: {surveyResponses.length}</p>
          </div>
          <button 
            onClick={() => setView("dashboard")}
            className="text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] transition-colors"
          >
            Back to Loom
          </button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {surveyResponses.length > 0 ? (
            surveyResponses.map((resp, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-[#4a3e3e]/5 shadow-sm">
                <p className="text-xs font-bold text-[#4a3e3e]/40 uppercase tracking-widest mb-2">Submitted by: {resp.userName || resp.userEmail}</p>
                <div className="space-y-2 mt-4">
                  {resp.responses.map((r: any, j: number) => (
                    <div key={j} className="bg-[#fcf8f6] p-4 rounded-xl border border-[#4a3e3e]/5">
                      <p className="text-sm font-bold text-[#4a3e3e]/60">{r.questionText || `Question ${r.questionId}`}</p>
                      <p className="text-lg font-black text-[#4a3e3e] mt-1">{r.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#4a3e3e]/50 font-bold text-center">No responses yet.</p>
          )}
        </div>
      </div>
    );
  }

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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-black bg-transparent border-none focus:ring-0 placeholder-[#4a3e3e]/20"
            />
            <input 
              type="text" 
              placeholder="Add a description..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                <select 
                  value={q.type || "Short Answer"}
                  onChange={(e) => {
                    const newQs = [...questions];
                    newQs[idx].type = e.target.value;
                    setQuestions(newQs);
                  }}
                  className="bg-[#fcf8f6] px-6 py-4 rounded-2xl border-none font-bold text-[#4a3e3e]/60 focus:ring-2 focus:ring-[#4a3e3e]/10">
                  <option>Short Answer</option>
                  <option>Multiple Choice</option>
                  <option>Checkboxes</option>
                </select>
              </div>
              {(q.type === "Multiple Choice" || q.type === "Checkboxes") && (
                <div className="pl-6 space-y-2 mt-4 border-l-2 border-[#4a3e3e]/10">
                  {(q.options || []).map((opt: string, optIdx: number) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-${q.type === 'Checkboxes' ? 'md' : 'full'} border-2 border-[#4a3e3e]/20`} />
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newQs = [...questions];
                          newQs[idx].options[optIdx] = e.target.value;
                          setQuestions(newQs);
                        }}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[#4a3e3e]/80 font-bold placeholder-[#4a3e3e]/20"
                        placeholder={`Option ${optIdx + 1}`}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newQs = [...questions];
                      if (!newQs[idx].options) newQs[idx].options = [];
                      newQs[idx].options.push(`Option ${(newQs[idx].options.length || 0) + 1}`);
                      setQuestions(newQs);
                    }}
                    className="text-sm font-bold text-[#4a3e3e]/40 hover:text-[#4a3e3e] mt-2 flex items-center gap-1"
                  >
                    + Add Option
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          <button 
            onClick={() => setQuestions([...questions, { id: Date.now(), type: "Short Answer", text: "", options: ["Option 1"] }])}
            className="w-full py-6 border-2 border-dashed border-[#4a3e3e]/20 rounded-[2.5rem] text-[#4a3e3e]/40 font-black uppercase tracking-widest hover:bg-[#4a3e3e]/5 transition-all"
          >
            + Add Question Thread
          </button>

          <button 
            onClick={handlePublish}
            disabled={isSubmitting}
            className="w-full py-6 bg-[#22c55e] text-white font-black uppercase tracking-[0.3em] rounded-[2.5rem] shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? "Publishing..." : "Publish to the Loom"}
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
          { label: "Surveys Created", val: activeSurveys.length.toString(), color: "text-amber-500" },
          { label: "Total Responses", val: activeSurveys.reduce((acc, curr) => acc + (curr.responsesCount || 0), 0).toString(), color: "text-emerald-500" },
          { label: "Active Threads", val: activeSurveys.length.toString(), color: "text-sky-500" },
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
          {activeSurveys.length > 0 ? (
            activeSurveys.map((s: any, i: number) => (
              <div 
                key={i} 
                onClick={() => { setSelectedSurvey(s); setView("analytics"); }}
                className="bg-white p-6 rounded-[2rem] flex items-center justify-between group cursor-pointer hover:shadow-md transition-all border border-transparent hover:border-[#4a3e3e]/10">
                <div className="flex items-center space-x-6">
                  <div className={`w-3 h-3 rounded-full bg-green-400 shadow-lg`} />
                  <div>
                    <h4 className="font-black text-[#4a3e3e] text-lg">{s.title}</h4>
                    <p className="text-xs font-bold text-[#4a3e3e]/30 uppercase tracking-widest">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="text-sm font-black text-[#4a3e3e]/40">{s.responsesCount || 0} Responses</p>
                  <ChevronRight className="text-[#4a3e3e]/20 group-hover:text-[#4a3e3e] transition-all" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#4a3e3e]/50 font-bold text-center">No active surveys found.</p>
          )}
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
                      backgroundColor: isActive ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.4)",
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
                  {activeSection === "Volunteers" && <VolunteersView />}
                  {activeSection === "Impact Projects" && <ProjectStub />}
                  {activeSection === "Survey Loom" && <SurveyLoom />}
                  {activeSection === "NGO Network" && <NGONetwork />}
                  {activeSection === "Community Fabric" && <CommunityFabric />}
                  {activeSection === "Reports" && <ReportsView />}
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

      {/* Chatbot Interface */}
      <Chatbot />
    </div>
  );
}

