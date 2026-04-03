import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "../../lib/supabase";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// ── Custom icons ──────────────────────────────────────────
const makeIcon = (color, emoji) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background:${color};border-radius:12px;
      width:40px;height:40px;
      border:3px solid rgba(255,255,255,0.7);box-shadow:0 8px 16px rgba(0,0,0,0.6);
      display:flex;align-items:center;justify-content:center;
      transition: all 0.2s;
    ">
      <span style="font-size:18px;line-height:1;filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</span>
      <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid rgba(255,255,255,0.7)"></div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
  });

const ISSUE_ICONS = {
  critical: makeIcon("#ef4444", "🚨"),
  high:     makeIcon("#f97316", "🔥"),
  medium:   makeIcon("#eab308", "🟡"),
  low:      makeIcon("#22c55e", "🟢"),
  default:  makeIcon("#6366f1", "📌"),
};

const VOLUNTEER_ICON = L.divIcon({
  className: "",
  html: `<div style="
    background:#22c97d;border-radius:50%;width:34px;height:34px;
    border:3px solid white;box-shadow:0 4px 12px rgba(34,201,125,0.4);
    display:flex;align-items:center;justify-content:center;font-size:16px;
    animation: pulse-green 2s infinite;
  ">🙋</div>
  <style>
    @keyframes pulse-green {
      0% { box-shadow: 0 0 0 0 rgba(34,201,125, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(34,201,125, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34,201,125, 0); }
    }
  </style>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20],
});

const MY_ICON = L.divIcon({
  className: "",
  html: `<div style="
    background:#3b82f6;border-radius:50%;width:24px;height:24px;
    border:4px solid white;box-shadow:0 0 20px rgba(59,130,246,0.6);
    animation: pulse-blue 2s infinite;
  "></div>
  <style>
    @keyframes pulse-blue {
      0% { box-shadow: 0 0 0 0 rgba(59,130,246, 0.5); }
      70% { box-shadow: 0 0 0 15px rgba(59,130,246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59,130,246, 0); }
    }
  </style>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ── Recenter helper ───────────────────────────────────────
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center]);
  return null;
}

const URGENCY_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function MapView({ user }) {
  const [issues, setIssues] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [radiusKm, setRadiusKm] = useState(50);
  const [selected, setSelected] = useState(null); // selected issue for side panel

  // ── Load data ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);

    const [{ data: issuesData }, { data: volData }] = await Promise.all([
      supabase.from("issues").select("*").order("created_at", { ascending: false }),
      supabase.from("volunteer_profiles").select("id,name,city,skills,availability,lat,lng,verified").not("lat", "is", null),
    ]);

    setIssues(issuesData || []);
    setVolunteers(volData || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    // Get user's current position
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = [pos.coords.latitude, pos.coords.longitude];
      setMyPos(c);
      setMapCenter(c);
    });
  }, []);

  // ── Filtered issues ────────────────────────────────────
  const filteredIssues = issues.filter((i) => {
    if (filterUrgency !== "all" && i.urgency !== filterUrgency) return false;
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    return true;
  });

  const stats = {
    total: issues.length,
    critical: issues.filter((i) => i.urgency === "critical").length,
    open: issues.filter((i) => i.status === "open").length,
    volunteers: volunteers.length,
  };

  return (
    <div className="mv-root">
      {/* ── Top Stats ── */}
      <div className="mv-stats-bar">
        <div className="mv-stat"><span className="mv-stat-num">{stats.total}</span><span>Total Issues</span></div>
        <div className="mv-stat critical"><span className="mv-stat-num">{stats.critical}</span><span>Critical Alerts</span></div>
        <div className="mv-stat open"><span className="mv-stat-num">{stats.open}</span><span>Active Reports</span></div>
        <div className="mv-stat vols"><span className="mv-stat-num">{stats.volunteers}</span><span>Help Network</span></div>
        <button className="mv-refresh-btn" onClick={loadData}>
          <span className="mv-refresh-icon">🔄</span> Sync Data
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="mv-filter-bar">
        <div className="mv-filter-group">
          <label>Filter By Urgency</label>
          <div className="mv-filter-chips">
            {["all","critical","high","medium","low"].map((u) => (
              <button key={u} className={`mv-chip ${filterUrgency === u ? "active" : ""}`}
                onClick={() => setFilterUrgency(u)}>
                {u === "all" ? "All" : u.charAt(0).toUpperCase() + u.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mv-filter-group">
          <label>Department / Category</label>
          <div className="mv-filter-chips">
            {["all","medical","food","shelter","rescue","education","other"].map((c) => (
              <button key={c} className={`mv-chip ${filterCategory === c ? "active" : ""}`}
                onClick={() => setFilterCategory(c)}>
                {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="mv-filter-toggles">
          <label className="mv-toggle">
            <input type="checkbox" checked={showVolunteers} onChange={(e) => setShowVolunteers(e.target.checked)} />
            Show Responders
          </label>
          <div className="mv-radius-control">
            <span>Range: {radiusKm}km</span>
            <input type="range" min={5} max={200} value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* ── Map + Side Panel ── */}
      <div className="mv-body">
        {/* Map */}
        <div className="mv-map-wrapper">
          {loading && <div className="mv-loading-overlay"><div className="mv-spinner" /><p>Scanning regional data…</p></div>}
          <MapContainer center={mapCenter} zoom={10} className="mv-map" zoomControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapRecenter center={mapCenter} />

            {/* My location */}
            {myPos && (
              <>
                <Marker position={myPos} icon={MY_ICON}>
                  <Popup>
                    <div className="mv-popup">
                      <strong>📍 Your Base Station</strong>
                      <p>Currently monitoring within {radiusKm}km radius.</p>
                    </div>
                  </Popup>
                </Marker>
                {showRadius && (
                  <Circle
                    center={myPos}
                    radius={radiusKm * 1000}
                    pathOptions={{ color: "#3b82f6", weight: 2, fillColor: "#3b82f6", fillOpacity: 0.05, dashArray: "10 10" }}
                  />
                )}
              </>
            )}

            {/* Issue markers */}
            {filteredIssues.map((issue) => (
              issue.lat && issue.lng ? (
                <Marker
                  key={issue.id}
                  position={[issue.lat, issue.lng]}
                  icon={ISSUE_ICONS[issue.urgency] || ISSUE_ICONS.default}
                  eventHandlers={{ click: () => setSelected(issue) }}
                >
                  <Popup>
                    <div className="mv-popup">
                      <div className="mv-popup-urgency" style={{ background: URGENCY_COLOR[issue.urgency], color: "#fff" }}>
                        {issue.urgency?.toUpperCase()}
                      </div>
                      <strong>{issue.title}</strong>
                      <p>{issue.category?.toUpperCase()} · {issue.status?.toUpperCase()}</p>
                      {issue.address && <p>📍 {issue.address}</p>}
                      <small>Reported: {new Date(issue.created_at).toLocaleString()}</small>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}

            {/* Volunteer markers */}
            {showVolunteers && volunteers.map((v) => (
              v.lat && v.lng ? (
                <Marker key={v.id} position={[v.lat, v.lng]} icon={VOLUNTEER_ICON}>
                  <Popup>
                    <div className="mv-popup">
                      <strong>🙋 {v.name}</strong>
                      <p>Active in {v.city}</p>
                      <p>Expertise: {v.skills?.slice(0, 3).join(", ")}</p>
                      {v.verified && <span style={{ color: "#22c97d", fontWeight: 800 }}>✓ VERIFIED RESPONDER</span>}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MapContainer>

          {/* Legend */}
          <div className="mv-legend">
            <div className="mv-legend-title">Deployment Status</div>
            <div className="mv-legend-item"><span style={{background:"#ef4444"}} className="mv-legend-dot"/>Extreme Risk</div>
            <div className="mv-legend-item"><span style={{background:"#f97316"}} className="mv-legend-dot"/>High Priority</div>
            <div className="mv-legend-item"><span style={{background:"#eab308"}} className="mv-legend-dot"/>Monitoring</div>
            <div className="mv-legend-item"><span style={{background:"#22c97d"}} className="mv-legend-dot"/>Field Volunteer</div>
            <div className="mv-legend-item"><span style={{background:"#3b82f6"}} className="mv-legend-dot"/>Home Base</div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="mv-side-panel">
          <div className="mv-panel-header">
            <h3>Deployment Feed</h3>
          </div>
          <div className="mv-issue-list">
            {filteredIssues.length === 0 && (
              <div className="mv-empty">Zero active reports in this sector.</div>
            )}
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`mv-issue-card ${selected?.id === issue.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(issue);
                  if (issue.lat && issue.lng) setMapCenter([issue.lat, issue.lng]);
                }}
              >
                <div className="mv-issue-top">
                  <span className={`mv-urgency-tag u-${issue.urgency}`} style={{ background: URGENCY_COLOR[issue.urgency], color: "#fff" }}>{issue.urgency}</span>
                  <span className="mv-issue-status">{issue.status}</span>
                </div>
                <div className="mv-issue-title">{issue.title}</div>
                <div className="mv-issue-meta">
                  <span>📂 {issue.category}</span>
                  {issue.address && <span>📍 {issue.address}</span>}
                  <span>🕐 {new Date(issue.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
