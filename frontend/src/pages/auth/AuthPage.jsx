import { useState } from "react";
import { supabase } from "../../lib/supabase";
import "./Auth.css";

const SKILLS = [
  "Medical Aid", "Teaching", "Logistics", "IT Support",
  "Counseling", "Construction", "Food Distribution", "Rescue Operations",
  "Translation", "Legal Aid", "Fundraising", "Photography",
];

const AVAILABILITY = [
  "Weekdays (9am–5pm)", "Weekends Only", "Evenings", "Full-Time", "On-Call",
];

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode]               = useState("login");
  const [role, setRole]               = useState("volunteer");
  const [step, setStep]               = useState(1);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
  const [sentTo, setSentTo]           = useState("");

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    ngoName: "", ngoRegNumber: "", ngoCity: "",
    skills: [], city: "", availability: "", phone: "",
  });

  const set = (f, v) => {
    setForm(p => ({ ...p, [f]: v }));
    setErrors(p => ({ ...p, [f]: "" }));
    setServerError("");
  };

  const toggleSkill = (s) =>
    setForm(p => ({
      ...p,
      skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s],
    }));

  const validate = () => {
    const e = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "At least 6 characters";
    if (mode === "signup") {
      if (!form.name.trim()) e.name = "Name is required";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
      if (step === 2) {
        if (role === "ngo_admin") {
          if (!form.ngoName.trim()) e.ngoName = "NGO name required";
          if (!form.ngoCity.trim()) e.ngoCity = "City required";
        } else {
          if (!form.city.trim()) e.city = "City required";
          if (!form.availability) e.availability = "Pick availability";
          if (!form.skills.length) e.skills = "Select at least one skill";
        }
      }
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSignup = async () => {
    const meta = role === "ngo_admin"
      ? { name: form.name, role, ngoName: form.ngoName, ngoRegNumber: form.ngoRegNumber, ngoCity: form.ngoCity }
      : { name: form.name, role, city: form.city, phone: form.phone, availability: form.availability, skills: form.skills };

    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: meta },
    });
    if (error) { setServerError(error.message); return; }
    if (data.session) {
      onAuthSuccess({ ...meta, email: form.email, id: data.user.id });
    } else {
      setSentTo(form.email);
      setEmailSent(true);
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    });
    if (error) { setServerError(error.message); return; }
    const meta = data.user.user_metadata || {};
    onAuthSuccess({
      id: data.user.id, email: data.user.email,
      name: meta.name || data.user.email.split("@")[0],
      role: meta.role || role, ...meta,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "signup" && step === 1) { setStep(2); return; }
    setLoading(true);
    setServerError("");
    mode === "signup" ? await handleSignup() : await handleLogin();
    setLoading(false);
  };

  const reset = (newMode) => {
    setMode(newMode); setStep(1); setErrors({}); setServerError(""); setEmailSent(false);
    setForm({ name:"", email:"", password:"", confirmPassword:"",
      ngoName:"", ngoRegNumber:"", ngoCity:"", skills:[], city:"", availability:"", phone:"" });
  };

  /* ── Email sent screen ── */
  if (emailSent) {
    return (
      <div className="auth-root">
        <div className="auth-confirm-wrap">
          <div className="auth-confirm-box">
            <div className="confirm-mail-icon">✉</div>
            <h2>Check your inbox</h2>
            <p>We sent a confirmation link to<br /><strong>{sentTo}</strong></p>
            <p className="confirm-sub">Click the link in the email to activate your account, then sign in below.</p>
            <button className="a-btn-primary" onClick={() => reset("login")}>Back to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  const isLogin   = mode === "login";
  const isSignup  = mode === "signup";
  const isAdmin   = role === "ngo_admin";

  return (
    <div className="auth-root">

      {/* ══ LEFT ══════════════════════════════════ */}
      <div className="auth-left">

        {/* top bar */}
        <div className="a-left-topbar">
          <div className="a-logo-mark">
            <span>⛑</span>
          </div>
          <span className="a-logo-name">ReliefLink</span>
        </div>

        {/* hero text */}
        <div className="a-left-hero">
          <div className="a-hero-tag">AI-Powered Platform</div>
          <h1 className="a-hero-title">
            Connecting<br />
            help with<br />
            <span className="a-hero-accent">people who<br />need it.</span>
          </h1>
          <p className="a-hero-desc">
            Centralize community data, surface urgent issues, and match the right volunteers — automatically.
          </p>
        </div>

        {/* stats */}
        <div className="a-left-stats">
          <div className="a-stat">
            <span className="a-stat-n">2,400+</span>
            <span className="a-stat-l">Volunteers</span>
          </div>
          <div className="a-stat-div" />
          <div className="a-stat">
            <span className="a-stat-n">180+</span>
            <span className="a-stat-l">NGOs</span>
          </div>
          <div className="a-stat-div" />
          <div className="a-stat">
            <span className="a-stat-n">94%</span>
            <span className="a-stat-l">Match Rate</span>
          </div>
        </div>

        {/* bottom tag row */}
        <div className="a-left-tags">
          <span className="a-tag">🏥 Medical</span>
          <span className="a-tag">🍱 Food Aid</span>
          <span className="a-tag">🏠 Shelter</span>
          <span className="a-tag">🚨 Rescue</span>
        </div>
      </div>

      {/* ══ RIGHT ═════════════════════════════════ */}
      <div className="auth-right">
        <div className="auth-form-wrap">

          {/* Mode toggle */}
          <div className="a-mode-toggle">
            <button className={`a-mode-btn ${isLogin ? "active" : ""}`} onClick={() => reset("login")}>Sign In</button>
            <button className={`a-mode-btn ${isSignup ? "active" : ""}`} onClick={() => reset("signup")}>Create Account</button>
          </div>

          {/* Heading */}
          <div className="a-form-heading">
            <h2>{isLogin ? "Welcome back" : step === 1 ? "Join ReliefLink" : isAdmin ? "NGO Details" : "Your Profile"}</h2>
            <p>
              {isLogin
                ? "Sign in to your account to continue."
                : step === 1
                  ? "Create your free account in seconds."
                  : isAdmin
                    ? "Tell us about your organization."
                    : "Complete your volunteer profile."}
            </p>
          </div>

          {/* Role picker */}
          <div className="a-role-row">
            <button
              type="button"
              className={`a-role-card ${role === "volunteer" ? "active" : ""}`}
              onClick={() => setRole("volunteer")}
            >
              <span className="a-role-emoji">🙋</span>
              <div>
                <div className="a-role-name">Volunteer</div>
                <div className="a-role-sub">Offer your skills</div>
              </div>
              <span className={`a-role-check ${role === "volunteer" ? "on" : ""}`}>✓</span>
            </button>
            <button
              type="button"
              className={`a-role-card ${isAdmin ? "active" : ""}`}
              onClick={() => setRole("ngo_admin")}
            >
              <span className="a-role-emoji">🏢</span>
              <div>
                <div className="a-role-name">NGO Admin</div>
                <div className="a-role-sub">Manage issues</div>
              </div>
              <span className={`a-role-check ${isAdmin ? "on" : ""}`}>✓</span>
            </button>
          </div>

          {/* Step bar (signup only) */}
          {isSignup && (
            <div className="a-steps">
              <div className={`a-step ${step >= 1 ? "done" : ""}`}>
                <div className="a-step-dot">{step > 1 ? "✓" : "1"}</div>
                <span>Account</span>
              </div>
              <div className={`a-step-line ${step >= 2 ? "done" : ""}`} />
              <div className={`a-step ${step >= 2 ? "done" : ""}`}>
                <div className="a-step-dot">2</div>
                <span>{isAdmin ? "NGO" : "Profile"}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {serverError && <div className="a-server-err">⚠ {serverError}</div>}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate className="a-form">

            {/* STEP 1 */}
            {(isLogin || step === 1) && (
              <>
                {isSignup && (
                  <div className="a-field">
                    <label>Full Name</label>
                    <input type="text" placeholder="e.g. Priya Sharma"
                      value={form.name} onChange={e => set("name", e.target.value)}
                      className={errors.name ? "err" : ""} />
                    {errors.name && <span className="a-err">{errors.name}</span>}
                  </div>
                )}

                <div className="a-field">
                  <label>Email</label>
                  <input type="email" placeholder="you@example.com"
                    value={form.email} onChange={e => set("email", e.target.value)}
                    className={errors.email ? "err" : ""} />
                  {errors.email && <span className="a-err">{errors.email}</span>}
                </div>

                <div className="a-field">
                  <label>Password</label>
                  <div className="a-pw-wrap">
                    <input type={showPw ? "text" : "password"} placeholder="Min 6 characters"
                      value={form.password} onChange={e => set("password", e.target.value)}
                      className={errors.password ? "err" : ""} />
                    <button type="button" className="a-pw-toggle" onClick={() => setShowPw(p => !p)}>
                      {showPw
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {errors.password && <span className="a-err">{errors.password}</span>}
                </div>

                {isSignup && (
                  <div className="a-field">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Re-enter password"
                      value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)}
                      className={errors.confirmPassword ? "err" : ""} />
                    {errors.confirmPassword && <span className="a-err">{errors.confirmPassword}</span>}
                  </div>
                )}

                {isLogin && (
                  <div className="a-forgot"><a href="#">Forgot password?</a></div>
                )}
              </>
            )}

            {/* STEP 2 — NGO Admin */}
            {isSignup && step === 2 && isAdmin && (
              <>
                <div className="a-field">
                  <label>Organization Name</label>
                  <input type="text" placeholder="e.g. Helping Hands Foundation"
                    value={form.ngoName} onChange={e => set("ngoName", e.target.value)}
                    className={errors.ngoName ? "err" : ""} />
                  {errors.ngoName && <span className="a-err">{errors.ngoName}</span>}
                </div>
                <div className="a-field">
                  <label>Registration No. <span className="a-opt">optional</span></label>
                  <input type="text" placeholder="e.g. NGO/2023/12345"
                    value={form.ngoRegNumber} onChange={e => set("ngoRegNumber", e.target.value)} />
                </div>
                <div className="a-field">
                  <label>City / Region</label>
                  <input type="text" placeholder="e.g. Jaipur, Rajasthan"
                    value={form.ngoCity} onChange={e => set("ngoCity", e.target.value)}
                    className={errors.ngoCity ? "err" : ""} />
                  {errors.ngoCity && <span className="a-err">{errors.ngoCity}</span>}
                </div>
              </>
            )}

            {/* STEP 2 — Volunteer */}
            {isSignup && step === 2 && !isAdmin && (
              <>
                <div className="a-field-row">
                  <div className="a-field">
                    <label>City</label>
                    <input type="text" placeholder="Your city"
                      value={form.city} onChange={e => set("city", e.target.value)}
                      className={errors.city ? "err" : ""} />
                    {errors.city && <span className="a-err">{errors.city}</span>}
                  </div>
                  <div className="a-field">
                    <label>Phone <span className="a-opt">optional</span></label>
                    <input type="tel" placeholder="+91 XXXXX XXXXX"
                      value={form.phone} onChange={e => set("phone", e.target.value)} />
                  </div>
                </div>

                <div className="a-field">
                  <label>Availability</label>
                  <div className="a-chips">
                    {AVAILABILITY.map(a => (
                      <button key={a} type="button"
                        className={`a-chip ${form.availability === a ? "on" : ""}`}
                        onClick={() => set("availability", a)}>{a}</button>
                    ))}
                  </div>
                  {errors.availability && <span className="a-err">{errors.availability}</span>}
                </div>

                <div className="a-field">
                  <label>Skills <span className="a-opt">select all that apply</span></label>
                  <div className="a-chips">
                    {SKILLS.map(s => (
                      <button key={s} type="button"
                        className={`a-chip ${form.skills.includes(s) ? "on" : ""}`}
                        onClick={() => toggleSkill(s)}>{s}</button>
                    ))}
                  </div>
                  {errors.skills && <span className="a-err">{errors.skills}</span>}
                </div>
              </>
            )}

            {/* Submit */}
            <button type="submit" className={`a-btn-primary ${loading ? "loading" : ""}`} disabled={loading}>
              {loading
                ? <span className="a-spinner" />
                : isLogin
                  ? `Sign In as ${isAdmin ? "NGO Admin" : "Volunteer"}`
                  : step === 1 ? "Continue →"
                  : `Create Account`}
            </button>

            {isSignup && step === 2 && (
              <button type="button" className="a-btn-ghost" onClick={() => setStep(1)}>← Back</button>
            )}
          </form>

          <p className="a-switch-mode">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => reset(isLogin ? "signup" : "login")}>
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}
