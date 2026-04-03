import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import "./VolunteerProfile.css";

const SKILL_OPTIONS = [
  "Medical Aid","Teaching","Logistics","IT Support","Counseling",
  "Construction","Food Distribution","Rescue Operations",
  "Translation","Legal Aid","Fundraising","Photography",
];

const AVAILABILITY_OPTIONS = [
  "Weekdays (9am–5pm)","Weekends Only","Evenings","Full-Time","On-Call",
];

export default function VolunteerProfile({ user }) {
  // ── profile state ──
  const [profile, setProfile] = useState({
    name: user.name || "",
    phone: user.phone || "",
    city: user.city || "",
    skills: user.skills || [],
    availability: user.availability || "",
    lat: null, lng: null,
    doc_url: null,
    phone_verified: false,
    verification_status: "pending",
    verified: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── OTP state ──
  const [otpStep, setOtpStep] = useState("idle"); // idle | sending | sent | verifying | done
  const [otpCode, setOtpCode] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  // ── document upload ──
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState("");
  const fileRef = useRef();

  // ── location ──
  const [locating, setLocating] = useState(false);

  // ── fetch existing profile ──
  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoadingProfile(true);
    const { data } = await supabase
      .from("volunteer_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setProfile((p) => ({ ...p, ...data }));
      if (data.phone_verified) setOtpStep("done");
      if (data.doc_url) setUploadedName(data.doc_url.split("/").pop());
    }
    setLoadingProfile(false);
  }

  function toggleSkill(skill) {
    setProfile((p) => ({
      ...p,
      skills: p.skills.includes(skill)
        ? p.skills.filter((s) => s !== skill)
        : [...p.skills, skill],
    }));
  }

  // ── get GPS location ──
  function getLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile((p) => ({
          ...p,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setLocating(false);
      },
      () => {
        alert("Could not get location. Please allow location access.");
        setLocating(false);
      }
    );
  }

  // ── save profile ──
  async function saveProfile() {
    setSaving(true);
    const payload = {
      id: user.id,
      name: profile.name,
      email: user.email,
      phone: profile.phone,
      city: profile.city,
      skills: profile.skills,
      availability: profile.availability,
      lat: profile.lat,
      lng: profile.lng,
      location: profile.lat && profile.lng
        ? `POINT(${profile.lng} ${profile.lat})`
        : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("volunteer_profiles")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert("Save failed: " + error.message);
    }
  }

  // ── OTP: send (simulated — in prod use Twilio/SMS via Supabase Edge Function) ──
  async function sendOtp() {
    if (!profile.phone || profile.phone.length < 8) {
      setOtpError("Enter a valid phone number first.");
      return;
    }
    setOtpStep("sending");
    setOtpError("");
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);

    // Store OTP in Supabase
    await supabase.from("otp_verifications").insert({
      user_id: user.id,
      phone: profile.phone,
      otp_code: code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    // In production: call Edge Function to send SMS via Twilio
    // For now: show code in UI (demo mode)
    setOtpStep("sent");
  }

  async function verifyOtp() {
    setOtpStep("verifying");
    setOtpError("");

    // Check OTP in DB
    const { data } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", profile.phone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      setOtpError("OTP not found. Please resend.");
      setOtpStep("sent");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setOtpError("OTP expired. Please resend.");
      setOtpStep("sent");
      return;
    }

    if (data.otp_code !== otpInput) {
      setOtpError("Incorrect OTP. Try again.");
      setOtpStep("sent");
      return;
    }

    // Mark verified
    await supabase.from("otp_verifications").update({ verified: true }).eq("id", data.id);
    await supabase.from("volunteer_profiles").upsert({
      id: user.id, name: profile.name, email: user.email,
      phone_verified: true,
    }, { onConflict: "id" });

    setProfile((p) => ({ ...p, phone_verified: true }));
    setOtpStep("done");
  }

  // ── Document upload ──
  async function uploadDocument(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/identity.${ext}`;

    const { error } = await supabase.storage
      .from("volunteer-docs")
      .upload(path, file, { upsert: true });

    if (error) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("volunteer-docs")
      .getPublicUrl(path);

    const docUrl = urlData.publicUrl;

    await supabase.from("volunteer_profiles").upsert({
      id: user.id, name: profile.name, email: user.email,
      doc_url: docUrl,
      verification_status: "submitted",
    }, { onConflict: "id" });

    setProfile((p) => ({ ...p, doc_url: docUrl, verification_status: "submitted" }));
    setUploadedName(file.name);
    setUploading(false);
  }

  if (loadingProfile) {
    return (
      <div className="vp-loading">
        <div className="vp-spinner" />
        <p>Loading your profile…</p>
      </div>
    );
  }

  const verificationBadge = () => {
    const s = profile.verification_status;
    if (profile.verified) return { label: "✅ Verified", cls: "approved" };
    if (s === "submitted") return { label: "🕐 Under Review", cls: "review" };
    if (s === "rejected")  return { label: "❌ Rejected", cls: "rejected" };
    return { label: "⏳ Not Verified", cls: "pending" };
  };
  const badge = verificationBadge();

  return (
    <div className="vp-root">
      <div className="vp-header">
        <h2>My Volunteer Profile</h2>
        <div className={`vp-badge ${badge.cls}`}>{badge.label}</div>
      </div>

      <div className="vp-main-grid">
        <div className="vp-left-col">
          {/* ── Section 1: Basic Info ── */}
          <section className="vp-section">
            <h3>👤 Basic Information</h3>
            <div className="vp-grid2">
              <div className="vp-field">
                <label>Full Name</label>
                <input value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </div>
              <div className="vp-field">
                <label>City</label>
                <input value={profile.city} onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Your city" />
              </div>
            </div>
          </section>

          {/* ── Section 2: Skills ── */}
          <section className="vp-section">
            <h3>🛠 Skills</h3>
            <div className="vp-chips">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`vp-chip ${profile.skills?.includes(s) ? "selected" : ""}`}
                  onClick={() => toggleSkill(s)}
                >{s}</button>
              ))}
            </div>
          </section>

          {/* ── Section 3: Availability ── */}
          <section className="vp-section">
            <h3>📅 Availability</h3>
            <div className="vp-chips">
              {AVAILABILITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`vp-chip ${profile.availability === a ? "selected" : ""}`}
                  onClick={() => setProfile(p => ({ ...p, availability: a }))}
                >{a}</button>
              ))}
            </div>
          </section>
        </div>

        <div className="vp-right-col">
          {/* ── Section 4: Location ── */}
          <section className="vp-section">
            <h3>📍 Location</h3>
            <p className="vp-hint">Your location is used to match you to nearby issues.</p>
            {profile.lat && profile.lng ? (
              <div className="vp-location-pill">
                <span>✅ Location saved: {profile.lat.toFixed(4)}, {profile.lng.toFixed(4)}</span>
                <button className="vp-link-btn" onClick={getLocation}>Update</button>
              </div>
            ) : (
              <button className="vp-loc-btn" onClick={getLocation} disabled={locating}>
                {locating ? "📡 Detecting…" : "📍 Use My Current Location"}
              </button>
            )}
          </section>

          {/* ── Section 5: Phone OTP ── */}
          <section className="vp-section">
            <h3>📱 Phone Identity</h3>
            <div className="vp-field" style={{ maxWidth: 280, marginBottom: 16 }}>
              <label>Phone Number</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
                disabled={otpStep === "done"}
              />
            </div>

            {otpStep === "idle" && (
              <button className="vp-action-btn" onClick={sendOtp}>Send OTP</button>
            )}

            {otpStep === "sending" && (
              <p className="vp-hint">Sending OTP…</p>
            )}

            {otpStep === "sent" && (
              <div className="vp-otp-box">
                {/* Demo mode: show the OTP */}
                <div className="vp-otp-demo">
                  🔔 Demo mode — your OTP is: <strong>{otpCode}</strong>
                  <span className="vp-otp-note">(In production this goes via SMS)</span>
                </div>
                <div className="vp-otp-row">
                  <input
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="vp-otp-input"
                  />
                  <button className="vp-action-btn" onClick={verifyOtp}>Verify</button>
                  <button className="vp-link-btn" onClick={sendOtp}>Resend</button>
                </div>
                {otpError && <span className="vp-error">{otpError}</span>}
              </div>
            )}

            {otpStep === "verifying" && <p className="vp-hint">Verifying…</p>}

            {otpStep === "done" && (
              <div className="vp-verified-pill">✅ Phone number verified</div>
            )}
          </section>

          {/* ── Section 6: Document Upload ── */}
          <section className="vp-section">
            <h3>📄 Identity & Skill Documents</h3>
            <p className="vp-hint">Upload your Aadhaar or ID. NGO Admin will review and approve.</p>

            <div className="vp-upload-area" onClick={() => fileRef.current.click()}>
              {uploading ? (
                <><div className="vp-spinner" /><p>Uploading…</p></>
              ) : uploadedName ? (
                <><span className="vp-upload-icon">📎</span><p>{uploadedName}</p><p className="vp-upload-sub">Click to replace</p></>
              ) : (
                <><span className="vp-upload-icon">⬆️</span><p>Click to upload document</p><p className="vp-upload-sub">PDF, JPG, PNG — max 10MB</p></>
              )}
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={uploadDocument} />
            </div>

            {profile.verification_status === "submitted" && !profile.verified && (
              <div className="vp-info-pill">🕐 Document submitted — awaiting admin approval</div>
            )}
            {profile.verified && (
              <div className="vp-verified-pill">✅ Identity & skills verified by NGO Admin</div>
            )}
          </section>
        </div>
      </div>

      {/* ── Save ── */}
      <div className="vp-save-row">
        <button className={`vp-save-btn ${saving ? "loading" : ""}`} onClick={saveProfile} disabled={saving}>
          {saving ? <><div className="vp-spinner-sm" /> Saving…</> : saved ? "✅ Saved!" : "💾 Save Profile"}
        </button>
      </div>
    </div>
  );
}
