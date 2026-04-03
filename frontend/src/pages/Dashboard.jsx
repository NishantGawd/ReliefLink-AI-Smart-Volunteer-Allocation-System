import { useState } from "react";
import VolunteerProfile from "./volunteer/VolunteerProfile";
import IssueReport from "./issues/IssueReport";
import MapView from "./map/MapView";
import "./Dashboard.css";

const NAV_VOLUNTEER = [
  { id: "home",    icon: "🏠",  label: "Dashboard" },
  { id: "map",     icon: "📍",  label: "Live Map"  },
  { id: "profile", icon: "👤",  label: "Profile"   },
  { id: "issues",  icon: "⚠️",  label: "Report"    },
];

const NAV_ADMIN = [
  { id: "home",     icon: "🏠",  label: "Dashboard" },
  { id: "map",      icon: "📍",  label: "Live Map"  },
  { id: "issues",   icon: "⚠️",  label: "Report"    },
  { id: "overview", icon: "📊",  label: "Overview"  },
];

const QUICK_STATS_VOLUNTEER = [
  { label: "Tasks Assigned",  value: "—", sub: "this month" },
  { label: "Skills",          value: null, sub: "from profile", key: "skills" },
  { label: "Availability",    value: null, sub: "current status", key: "availability" },
  { label: "Verified",        value: null, sub: "account status", key: "verified" },
];

const QUICK_STATS_ADMIN = [
  { label: "Open Issues",    value: "—",   sub: "awaiting action" },
  { label: "Volunteers",     value: "—",   sub: "in your region" },
  { label: "Resolved",       value: "—",   sub: "this month" },
  { label: "Match Rate",     value: "—",   sub: "AI accuracy" },
];

export default function Dashboard({ user, onLogout }) {
  const isAdmin = user.role === "ngo_admin";
  const NAV = isAdmin ? NAV_ADMIN : NAV_VOLUNTEER;
  const [activePage, setActivePage] = useState("home");

  const currentNav = NAV.find((n) => n.id === activePage);

  const renderPage = () => {
    switch (activePage) {
      case "home":     return <HomeDashboard user={user} isAdmin={isAdmin} onNavigate={setActivePage} />;
      case "map":      return <MapView user={user} />;
      case "profile":  return <VolunteerProfile user={user} />;
      case "issues":   return <IssueReport user={user} onIssueSubmitted={() => setActivePage("home")} />;
      case "overview": return <AdminOverview user={user} />;
      default:         return null;
    }
  };

  return (
    <div className="dash-root">

      {/* ── Top Navbar ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">
            <span className="dash-logo-icon">⛑</span>
          </div>
          <div className="dash-wordmark">
            <span className="dash-wordmark-name">ReliefLink</span>
            <span className="dash-wordmark-dot" />
            <span className="dash-wordmark-role">
              {isAdmin ? "NGO Admin" : "Volunteer"}
            </span>
          </div>
        </div>

        <nav className="dash-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`dash-nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="dash-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-header-right">
          <div className="dash-user-pill">
            <div className="dash-avatar">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="dash-user-name">{user.name?.split(" ")[0]}</span>
          </div>
          <button className="dash-logout-btn" onClick={onLogout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Page area ── */}
      <main className="dash-main">
        {activePage !== "home" && (
          <div className="dash-page-header">
            <div className="dash-breadcrumb">
              <button className="dash-bread-home" onClick={() => setActivePage("home")}>Dashboard</button>
              <span className="dash-bread-sep">/</span>
              <span className="dash-bread-current">{currentNav?.label}</span>
            </div>
          </div>
        )}
        <div className="dash-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════
   HOME DASHBOARD
══════════════════════════════════════ */
function HomeDashboard({ user, isAdmin, onNavigate }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const volunteerStats = [
    { label: "Skills", value: user.skills?.length || "0", sub: "verified areas", icon: "🛠️" },
    { label: "Location", value: user.city || "Not Set", sub: "active region", icon: "📍" },
    { label: "Status", value: user.verified ? "Verified" : "Pending", sub: "account status", accent: user.verified, icon: user.verified ? "✅" : "⏳" },
    { label: "Availability", value: user.availability ? user.availability.split(" ")[0] : "None", sub: "current slot", icon: "📅" },
  ];

  const adminStats = [
    { label: "Organization", value: user.ngoName || "NGO", sub: "registered ngo", icon: "🏢" },
    { label: "Region", value: user.ngoCity || "Global", sub: "coverage area", icon: "🌍" },
    { label: "Active Issues", value: "8", sub: "needs attention", icon: "⚠️" },
    { label: "Volunteers", value: "24", sub: "in your network", icon: "👥" },
  ];

  const stats = isAdmin ? adminStats : volunteerStats;

  const quickActions = isAdmin
    ? [
        { id: "map",      icon: "📍", title: "Live Map",       desc: "Real-time crisis monitoring", color: "#fff" },
        { id: "issues",   icon: "⚠️", title: "Active Issues",   desc: "Manage community reports",  color: "#fff" },
        { id: "overview", icon: "📊", title: "NGO Overview",    desc: "Data-driven relief insights", color: "#fff" },
      ]
    : [
        { id: "map",     icon: "📍", title: "Explore Map",    desc: "Find help requests near you",  color: "#fff" },
        { id: "profile", icon: "👤", title: "My Identity",    desc: "Verify skills & build trust",    color: "#fff" },
        { id: "issues",  icon: "⚠️", title: "Report Emergency", desc: "Instantly flag local issues",     color: "#fff" },
      ];

  return (
    <div className="home-root">

      {/* ── Welcome hero ── */}
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="home-greeting">{greeting},</p>
          <h1 className="home-name">{user.name} <span className="home-wave">👋</span></h1>
          <p className="home-sub">
            {isAdmin
              ? `Managing ${user.ngoName || "your NGO"} · ${user.ngoCity || "configure your city"}`
              : user.skills?.length
                ? `You have ${user.skills.length} skill${user.skills.length > 1 ? "s" : ""} · ${user.city || "set your location"}`
                : "Complete your profile to get matched with tasks"}
          </p>
        </div>
        <div className="home-hero-badge">
          <div className="home-badge-icon">{isAdmin ? "🏢" : "🙋"}</div>
          <div className="home-badge-label">{isAdmin ? "NGO Admin" : "Volunteer"}</div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="home-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className={`home-stat-card ${s.accent ? "accent" : ""}`}>
            <span className="home-stat-value">{s.value}</span>
            <span className="home-stat-label">{s.label}</span>
            <span className="home-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Section: Quick actions ── */}
      <div className="home-section">
        <div className="home-section-header">
          <h2>Quick Actions</h2>
          <span className="home-section-line" />
        </div>
        <div className="home-actions-grid">
          {quickActions.map((a) => (
            <button key={a.id} className="home-action-card" onClick={() => onNavigate(a.id)}>
              <div className="home-action-icon">{a.icon}</div>
              <div className="home-action-body">
                <div className="home-action-title">{a.title}</div>
                <div className="home-action-desc">{a.desc}</div>
              </div>
              <div className="home-action-arrow">→</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section: Skills (volunteer only) ── */}
      {!isAdmin && user.skills?.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <h2>Your Skills</h2>
            <span className="home-section-line" />
          </div>
          <div className="home-skills-wrap">
            {user.skills.map((s) => (
              <span key={s} className="home-skill-tag">{s}</span>
            ))}
            <button className="home-skill-edit" onClick={() => onNavigate("profile")}>
              + Edit
            </button>
          </div>
        </div>
      )}

      {/* ── Verification nudge ── */}
      {!isAdmin && !user.verified && (
        <div className="home-nudge">
          <div className="home-nudge-icon">🔐</div>
          <div className="home-nudge-text">
            <strong>Complete Verification</strong>
            <p>Upload your ID and verify your phone number to get approved by an NGO admin.</p>
          </div>
          <button className="home-nudge-btn" onClick={() => onNavigate("profile")}>
            Verify Now →
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   ADMIN OVERVIEW
══════════════════════════════════════ */
function AdminOverview({ user }) {
  const cards = [
    { icon: "👥", title: "Volunteer Management", desc: "Review & approve identity and skill verifications from volunteers." },
    { icon: "🤖", title: "Smart Matching",        desc: "AI engine assigns the most suitable volunteer to each reported issue." },
    { icon: "📊", title: "Analytics",             desc: "Track issue trends, volunteer response times, and coverage gaps." },
    { icon: "📍", title: "Issue Heatmap",         desc: "Visualize where problems are concentrated in your region." },
  ];

  return (
    <div className="ao-root">
      <div className="ao-header">
        <h2>Admin Overview</h2>
        <p>Manage your NGO operations, volunteers, and community issues from one place.</p>
      </div>
      <div className="ao-grid">
        {cards.map((c, i) => (
          <div key={i} className="ao-card">
            <div className="ao-card-icon">{c.icon}</div>
            <div className="ao-card-title">{c.title}</div>
            <div className="ao-card-desc">{c.desc}</div>
            <div className="ao-card-soon">Coming soon</div>
          </div>
        ))}
      </div>
    </div>
  );
}
