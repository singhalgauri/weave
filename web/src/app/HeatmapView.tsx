"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, Activity, Wifi } from "lucide-react";

const INDIA_DEVICES = [
  { lat: 28.6139, lng: 77.2090, intensity: 0.9 },
  { lat: 28.7041, lng: 77.1025, intensity: 0.6 },
  { lat: 19.0760, lng: 72.8777, intensity: 0.85 },
  { lat: 19.1334, lng: 72.9133, intensity: 0.65 },
  { lat: 13.0827, lng: 80.2707, intensity: 0.75 },
  { lat: 12.9716, lng: 77.5946, intensity: 0.88 },
  { lat: 12.9352, lng: 77.6245, intensity: 0.70 },
  { lat: 17.3850, lng: 78.4867, intensity: 0.70 },
  { lat: 22.5726, lng: 88.3639, intensity: 0.65 },
  { lat: 23.0225, lng: 72.5714, intensity: 0.60 },
  { lat: 26.9124, lng: 75.7873, intensity: 0.55 },
  { lat: 21.1458, lng: 79.0882, intensity: 0.45 },
  { lat: 26.8467, lng: 80.9462, intensity: 0.60 },
  { lat: 30.7333, lng: 76.7794, intensity: 0.40 },
  { lat: 15.2993, lng: 74.1240, intensity: 0.50 },
  { lat: 11.0168, lng: 76.9558, intensity: 0.45 },
  { lat: 25.5941, lng: 85.1376, intensity: 0.40 },
  { lat: 22.3072, lng: 73.1812, intensity: 0.35 },
  { lat: 18.5204, lng: 73.8567, intensity: 0.72 },
  { lat: 9.9312,  lng: 76.2673, intensity: 0.50 },
  { lat: 21.2514, lng: 81.6296, intensity: 0.38 },
  { lat: 16.3067, lng: 80.4365, intensity: 0.42 },
  { lat: 28.4595, lng: 77.0266, intensity: 0.55 },
  { lat: 27.1767, lng: 78.0081, intensity: 0.44 },
];

const CITY_LABELS = [
  { lat: 28.6139, lng: 77.2090, name: "New Delhi" },
  { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
  { lat: 12.9716, lng: 77.5946, name: "Bengaluru" },
  { lat: 13.0827, lng: 80.2707, name: "Chennai" },
  { lat: 22.5726, lng: 88.3639, name: "Kolkata" },
  { lat: 17.3850, lng: 78.4867, name: "Hyderabad" },
];

export default function HeatmapView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalDevices, setTotalDevices] = useState(0);
  const [hotspots, setHotspots] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!mapRef.current || mapInstanceRef.current) return;

    let map: any;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapRef.current || (mapRef.current as any)._leaflet_id) return;

      // Fix marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      let userLat = 22.5937;
      let userLng = 78.9629;
      let zoomLevel = 5;

      try {
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        if (position && position.coords) {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          zoomLevel = 12; // Zoom to device location
        }
      } catch (err) {
        console.warn("Could not get device location, using default center.", err);
      }

      if (!isMounted || !mapRef.current || (mapRef.current as any)._leaflet_id) return;

      map = L.map(mapRef.current!, {
        center: [userLat, userLng],
        zoom: zoomLevel,
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      });

      // Add a marker for the user's location
      if (zoomLevel === 12) {
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="background: #3b82f6; border: 2px solid white; border-radius: 50%; width: 14px; height: 14px; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
          iconAnchor: [7, 7]
        });
        L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup("You are here");
      }

      mapInstanceRef.current = map;

      // Elegant CartoDB light tile
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 18,
      }).addTo(map);

      // Attribution small
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      let heatPoints = [...INDIA_DEVICES];
      try {
        const [probRes, volRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/problems").catch(() => null),
          fetch("http://127.0.0.1:5000/volunteers").catch(() => null)
        ]);
        
        let realPts: any[] = [];
        let hasRealData = false;
        
        if (probRes && probRes.ok && probRes.headers.get("content-type")?.includes("application/json")) {
          const data = await probRes.json();
          if (Array.isArray(data) && data.length > 0) {
            // Only show VERIFIED reports on the heatmap
            const verifiedReports = data.filter((p: any) => p.status === 'Verified' && p.lat && p.lng);
            
            const pts = verifiedReports.map((p: any) => ({ 
              lat: parseFloat(p.lat), 
              lng: parseFloat(p.lng), 
              intensity: 1.0 
            }));
            
            realPts = [...realPts, ...pts];
            hasRealData = pts.length > 0;

            // Add labels only for verified reports
            verifiedReports.forEach((p: any) => {
              const icon = L.divIcon({
                className: "",
                html: `<div style="background: rgba(239,140,74,0.9); border: 1px solid rgba(74,62,62,0.1); border-radius: 999px; padding: 2px 6px; font-size: 9px; font-weight: bold; color: white; white-space: nowrap;">✅ ${p.title}</div>`,
                iconAnchor: [20, 10],
              });
              L.marker([p.lat, p.lng], { icon }).addTo(map);
            });
          }
        }
        
        if (volRes && volRes.ok && volRes.headers.get("content-type")?.includes("application/json")) {
          const volunteers = await volRes.json();
          if (Array.isArray(volunteers) && volunteers.length > 0) {
            const volPts = volunteers.filter((v: any) => v.lat && v.lng).map((v: any) => ({ lat: parseFloat(v.lat), lng: parseFloat(v.lng), intensity: 0.8 }));
            realPts = [...realPts, ...volPts];
            hasRealData = true;
            
            // Add labels for the real volunteer data
            volunteers.forEach((v: any) => {
              if (v.lat && v.lng) {
                const icon = L.divIcon({
                  className: "",
                  html: `<div style="background: rgba(244,218,218,0.9); border: 1px solid rgba(74,62,62,0.1); border-radius: 999px; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #4a3e3e; white-space: nowrap;">${v.name}</div>`,
                  iconAnchor: [20, 10],
                });
                L.marker([v.lat, v.lng], { icon }).addTo(map);
              }
            });
          }
        }
        
        if (hasRealData) {
          heatPoints = [...realPts, ...INDIA_DEVICES];
        } else {
          throw new Error("No real data available");
        }
      } catch (_) { 
        // Use dummy data
        const dummyVolunteers = [
           { name: "Riya Sharma", lat: 28.6139, lng: 77.2090 },
           { name: "Amit Patel", lat: 19.0760, lng: 72.8777 },
           { name: "Sneha Reddy", lat: 12.9716, lng: 77.5946 },
           { name: "Vikram Singh", lat: 26.9124, lng: 75.7873 },
        ];
        
        const volPts = dummyVolunteers.map(v => ({ lat: v.lat, lng: v.lng, intensity: 0.8 }));
        heatPoints = [...heatPoints, ...volPts];

        dummyVolunteers.forEach((v: any) => {
          const icon = L.divIcon({
            className: "",
            html: `<div style="background: rgba(244,218,218,0.9); border: 1px solid rgba(74,62,62,0.1); border-radius: 999px; padding: 2px 6px; font-size: 9px; font-weight: bold; color: #4a3e3e; white-space: nowrap;">${v.name}</div>`,
            iconAnchor: [20, 10],
          });
          L.marker([v.lat, v.lng], { icon }).addTo(map);
        });
      }

      setTotalDevices(heatPoints.length);
      setHotspots(Math.ceil(heatPoints.filter(p => p.intensity > 0.7).length));

      // Load leaflet.heat dynamically
      try {
        // @ts-ignore – no type declarations for leaflet.heat
        await import("leaflet.heat");
        const lData = heatPoints.map(p => [p.lat, p.lng, p.intensity ?? 0.5]);
        (L as any).heatLayer(lData, {
          radius: 40,
          blur: 28,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.0: "#d8e6e0",
            0.25: "#f4dada",
            0.5: "#e8c97d",
            0.75: "#ef8c4a",
            1.0: "#c0392b",
          },
        }).addTo(map);
      } catch (_) {
        // Fallback: render circle markers if leaflet.heat fails
        heatPoints.forEach(p => {
          L.circleMarker([p.lat, p.lng], {
            radius: Math.max(6, (p.intensity ?? 0.5) * 14),
            fillColor: `rgba(239,68,68,${p.intensity ?? 0.5})`,
            color: "transparent",
            fillOpacity: 0.55,
          }).addTo(map);
        });
      }

      // City label markers
      CITY_LABELS.forEach(city => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background: rgba(252,248,246,0.92);
            border: 1px solid rgba(74,62,62,0.15);
            border-radius: 999px;
            padding: 3px 10px;
            font-size: 10px;
            font-weight: 900;
            color: #4a3e3e;
            letter-spacing: 0.08em;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            backdrop-filter: blur(8px);
          ">${city.name}</div>`,
          iconAnchor: [40, 12],
        });
        L.marker([city.lat, city.lng], { icon }).addTo(map);
      });

      setIsLoading(false);
    };

    initMap().catch(console.error);

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const stats = [
    { label: "Active Devices", value: isLoading ? "—" : totalDevices, color: "text-emerald-500", icon: Wifi },
    { label: "Hotspots", value: isLoading ? "—" : hotspots, color: "text-amber-500", icon: Activity },
    { label: "Coverage Zones", value: isLoading ? "—" : CITY_LABELS.length, color: "text-sky-500", icon: MapPin },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/60 backdrop-blur-md border border-[#4a3e3e]/5 p-4 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={11} className="text-[#4a3e3e]/40" />
              <p className="text-[9px] uppercase font-black text-[#4a3e3e]/40 tracking-[0.2em]">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Map */}
      <div
        className="relative rounded-[2rem] overflow-hidden border border-[#4a3e3e]/10 shadow-inner"
        style={{ height: 360 }}
      >
        <div ref={mapRef} className="w-full h-full" />

        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-[#fcf8f6]/80 backdrop-blur-sm">
            <Loader2 className="animate-spin text-[#4a3e3e]/40 mb-3" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#4a3e3e]/40">
              Weaving the map…
            </p>
          </div>
        )}

        {/* Gradient Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#4a3e3e]/10 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#4a3e3e]/50 mb-2">
            Device Density
          </p>
          <div
            className="w-28 h-2 rounded-full"
            style={{ background: "linear-gradient(to right, #d8e6e0, #f4dada, #e8c97d, #ef8c4a, #c0392b)" }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-bold text-[#4a3e3e]/40">Low</span>
            <span className="text-[8px] font-bold text-[#4a3e3e]/40">High</span>
          </div>
        </div>

        {/* Live Indicator */}
        <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#4a3e3e]/10 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#4a3e3e]/50">Live</span>
        </div>
      </div>
    </div>
  );
}
