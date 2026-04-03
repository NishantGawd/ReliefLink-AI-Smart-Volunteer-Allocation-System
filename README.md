# ReliefLink — AI-Smart Volunteer Allocation System

ReliefLink is a web platform that connects community volunteers with local issues in real time. NGO admins can oversee reported problems and manage volunteers, while volunteers can register their skills, verify their identity, and get matched to issues nearest to them.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Map | Leaflet + React-Leaflet |
| Backend / DB | Supabase (PostgreSQL + PostGIS) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (`volunteer-docs` bucket) |
| Geo Queries | PostGIS `ST_DWithin` + `GEOGRAPHY(POINT, 4326)` |
| Styling | Plain CSS (per-component) |

---

## Project Structure

```
ReliefLink-AI-Smart-Volunteer-Allocation-System/
├── supabase_schema.sql          # Full DB schema — run this first in Supabase SQL Editor
└── frontend/
    ├── .env                     # Supabase keys (see setup below)
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx              # Auth gate — shows AuthPage or Dashboard
        ├── lib/
        │   └── supabase.js      # Supabase client
        └── pages/
            ├── Dashboard.jsx    # Main layout + nav + home stats
            ├── auth/
            │   └── AuthPage.jsx # Login / Signup (Volunteer & NGO Admin, 2-step)
            ├── issues/
            │   └── IssueReport.jsx  # Report a community issue with map pin
            ├── map/
            │   └── MapView.jsx      # Live map — issues + volunteers + filters
            └── volunteer/
                └── VolunteerProfile.jsx  # Skills, availability, OTP, doc upload
```

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ReliefLink-AI-Smart-Volunteer-Allocation-System.git
cd ReliefLink-AI-Smart-Volunteer-Allocation-System/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase project under **Settings → API**.

### 4. Set up the database

Open your Supabase project → **SQL Editor → New Query**, paste the contents of `supabase_schema.sql`, and run it.

This creates:
- `volunteer_profiles` table (with PostGIS location column)
- `ngo_profiles` table
- `otp_verifications` table
- `issues` table (with PostGIS location column)
- Row Level Security (RLS) policies for all tables
- `volunteers_near(lat, lng, radius_km)` helper function
- Auto `updated_at` triggers

### 5. Create the storage bucket

In Supabase → **Storage**, create a bucket named `volunteer-docs`.  
Set it to **private** (admins access docs for verification).

### 6. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Features

### Authentication
- Email/password sign-up and login via Supabase Auth
- Two roles at registration: **Volunteer** and **NGO Admin**
- Two-step signup — account credentials first, then profile details
- Email confirmation flow (Supabase sends a confirmation link)

### Volunteer Profile (`/profile`)
- Set name, city, skills (12 options), and availability (5 slots)
- GPS-based location detection — stored as PostGIS point for geo-matching
- **Phone OTP verification** — 6-digit code generated and stored in `otp_verifications`, verified against Supabase
- Currently in **demo mode**: the OTP is shown on screen.
- **Document upload** — PDF/JPG/PNG uploaded to `volunteer-docs` Supabase Storage bucket; sets `verification_status` to `submitted`
- NGO Admin reviews and marks volunteers as `verified`

### Issue Reporting (`/issues`)
- Report a community issue with title, description, category, and urgency
- Categories: Medical, Food, Shelter, Rescue, Education, Other
- Urgency levels: Low, Medium, High, Critical
- Location: click-to-pin on an interactive Leaflet map, or use GPS auto-detect
- Issues saved to `issues` table with PostGIS point for geo queries

### Live Map (`/map`)
- Dark-themed Leaflet map (CARTO dark tiles)
- Shows all reported issues as color-coded markers by urgency:
  - Critical, High, Medium, Low
- Shows volunteer locations as animated pulsing markers
- Your current GPS location shown with a blue pulse + configurable radius circle (5–200 km)
- Sidebar **Deployment Feed** — lists all issues with urgency, status, category, and date; click to fly the map to that issue
- Filters by urgency and category
- Toggle volunteer markers on/off
- Sync Data button re-fetches issues and volunteers from Supabase

### Dashboard
- Personalized greeting with quick stats (skills count, location, verification status, availability)
- Quick action cards to navigate to Map, Profile, Report Issue
- Verification nudge for unverified volunteers
- **NGO Admin view** shows organization name, region, active issue count, and volunteer count

### NGO Admin Overview
- Cards for: Volunteer Management, Smart Matching, Analytics, Issue Heatmap
- Features marked *Coming Soon* (in-progress)

---

## Database Schema Summary

### `volunteer_profiles`
Stores volunteer data including name, email, phone, city, skills (array), availability, GPS coordinates (PostGIS), document URL, phone verification status, and NGO-verified flag.

### `ngo_profiles`
Stores NGO admin data: name, email, NGO name, registration number, and city.

### `otp_verifications`
Stores OTP codes linked to a user and phone number, with expiry timestamps and a verified flag.

### `issues`
Stores reported issues with title, description, category, urgency, status (`open | assigned | in_progress | resolved`), address, GPS coordinates (PostGIS), image URL, reporter info, and assigned volunteer.

### `volunteers_near(lat, lng, radius_km)`
A PostgreSQL function that returns all volunteers within a given radius using `ST_DWithin`, ordered by distance. Default radius is 50 km.

---

## Row Level Security

| Table | Policy |
|---|---|
| `volunteer_profiles` | Anyone can read; users can only write their own row |
| `ngo_profiles` | Anyone can read; users can only write their own row |
| `otp_verifications` | Users can only access their own OTPs |
| `issues` | Anyone can read; authenticated users can insert; reporter can update |

---

## Build for Production

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`. Deploy to Vercel, Netlify, or any static host.

---

## Key Dependencies

```json
"@supabase/supabase-js": "^2.101.1"
"react": "^19.2.4"
"leaflet": "^1.9.4"
"react-leaflet": "^4.2.1"
```

---

## Roadmap

- [ ] SMS-based OTP via Twilio (replace demo mode)
- [ ] AI-powered volunteer-to-issue matching engine
- [ ] Admin dashboard — approve/reject volunteer verifications
- [ ] Issue heatmap analytics
- [ ] Push notifications for new issue assignments
- [ ] Mobile app (React Native)

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## License

MIT
