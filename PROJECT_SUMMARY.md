# 📋 PROJECT SUMMARY - MrCoryFast.com

> **Reference for the ORIGINAL static site** (the one currently live)
> Last Updated: August 2026

> ## ⚠️ Read `HANDOFF.md` first
>
> As of **August 2026** the site is being rebuilt in **Next.js**, in `web/`,
> and is pivoting from an equipment-sales site to a **creator site** — a feed
> of projects, with equipment kept as one section.
>
> **This document describes the original static site in `public/`, which is
> still what mrcoryfast.com serves.** It remains accurate for that site.
> For current status, open **`HANDOFF.md`**. For the new app, see
> **`web/README.md`**.

---

## 🎯 Project Overview

### What Is This?
A personal website for **Cory Fast** (MrCoryFast.com). It began as an equipment
sales site and is now becoming a **creator site** — a feed of projects Cory is
working on, self-hosted so the audience doesn't depend on someone else's
algorithm.

The **equipment sales section stays**. It honors Cory's father, **Doug**, who
passed away in December 2024 — selling his farm equipment, and giving him the
retirement he never got. `doug.html` is a memorial page written by Cory. It is
his own writing and should not be rewritten or "improved".

### Current Status: ✅ Live, and being superseded

| Component | Status | Notes |
|-----------|--------|-------|
| Main Site Structure | ✅ Complete | Home, About, Doug tribute, Equipment |
| Equipment Admin | ✅ Complete | Full CRUD, photo uploads, soft deletes |
| Supabase Integration | ✅ Complete | Database, Auth, Storage |
| Security Setup | ✅ Complete | RLS enabled, Supabase Auth |
| GitHub | ✅ Connected | github.com/BiggiFast/fast-farms-equipment |
| Vercel Deployment | ✅ Live | Serving `public/` as static files |
| **Next.js rebuild** | 🔨 In progress | In `web/`, branch `nextjs-rebuild`. See `HANDOFF.md` |

### Why a rebuild

Three limits of the static site drove it:

1. **Every page is hand-maintained.** Adding Google Analytics meant pasting the
   same tag into every `.html` file. A shared layout removes that permanently.
2. **Equipment wasn't findable.** All listings lived at one URL and were fetched
   by JavaScript after load, so crawlers saw an empty page and there was no URL
   to rank. The rebuild gives each machine its own server-rendered page.
3. **A project feed is the new focus**, and a growing feed is exactly what
   hand-written HTML is worst at.

---

## 🗂️ Site Structure

```
MrCoryFast.com/
├── /                    → Main landing page (minimal design)
├── /about.html          → About Cory (placeholder)
├── /doug.html           → Tribute to Doug 💙
├── /equipment/          → Equipment sales page
│   ├── index.html       → Public equipment listings
│   ├── contact.html     → Equipment inquiries
│   └── admin.html       → Admin dashboard (protected)
```

### Navigation
- **Main Pages:** CORY | ABOUT | EQUIPMENT
- **Equipment Section:** CORY | ABOUT | DOUG | EQUIPMENT (Doug link only shows on equipment pages)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js with Express |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email/password) |
| Storage | Supabase Storage (equipment images) |
| Development | Nodemon, Browser-sync, Concurrently |
| Version Control | GitHub (public repo) |
| Hosting | Vercel (planned) |

---

## ✨ Features

### Public Site
- ✅ Minimal, elegant design matching Squarespace aesthetic
- ✅ Category filtering (All, Tractor, Truck, Implement, Pickup)
- ✅ Multi-image gallery with thumbnails
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dynamic equipment loading from Supabase
- ✅ Only shows active, non-deleted equipment
- ✅ Contact form for inquiries

### Admin Dashboard
- ✅ Secure Supabase Auth login (email/password)
- ✅ Add, edit, delete equipment listings
- ✅ Toggle active/inactive status
- ✅ Multi-photo uploads (up to 5 per listing)
- ✅ Main photo selection
- ✅ Auto-resize images to 1200px
- ✅ Soft deletes (recoverable)
- ✅ Real-time database updates

---

## 🔒 Security Status

### ✅ Completed Security Measures

| Item | Status | Details |
|------|--------|---------|
| Row Level Security (RLS) | ✅ Enabled | Public: read-only active items; Auth: full CRUD |
| Admin Authentication | ✅ Supabase Auth | Email/password login, no hardcoded passwords |
| Storage Security | ✅ Secured | Only authenticated users can upload |
| Soft Deletes | ✅ Implemented | Data recovery possible |

### ⏳ Pending Before Deployment

| Item | Priority | Action Needed |
|------|----------|---------------|
| Environment Variables | 🔴 HIGH | Move credentials from `supabaseClient.js` to env vars |
| Vercel Setup | 🟡 MEDIUM | Configure env vars in Vercel dashboard |
| Domain Configuration | 🟡 MEDIUM | Add Vercel domain to Supabase allowlist |

### 📄 Security Documentation
- **Detailed Guide:** `SECURITY_SETUP_GUIDE.md`
- **Checklist:** `SECURITY_CHECKLIST.md`

---

## 🗄️ Database Schema

### Equipment Table

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key (auto-generated) |
| name | text | Yes | Equipment name |
| description | text | No | Full description |
| category | text | Yes | "tractor", "truck", "implement", "pickup" |
| price | numeric | Yes | Price in dollars |
| image_url | text | No | Legacy single image URL |
| photos | jsonb | No | Array of photo objects (up to 5) |
| is_active | boolean | Yes | Controls public visibility (default: true) |
| deleted_at | timestamptz | No | Soft delete timestamp (NULL = not deleted) |
| created_at | timestamptz | Yes | Auto-generated |
| slug | text | Yes | URL-safe name, unique. Added Aug 2026 (migration 003) so each machine gets its own page, e.g. `/equipment/2014-case-ih-magnum-380-tractor` |

### Projects Table (added Aug 2026 — migration 001)

For the creator feed. A project is something ongoing that accumulates updates.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| title | text | Yes | |
| slug | text | Yes | Unique. `/projects/rebuilding-the-shop` |
| summary | text | No | One line, shown on cards |
| body | text | No | Longer intro on the project page |
| photos | jsonb | Yes | Same shape as equipment photos |
| status | text | Yes | `active` / `completed` / `paused` |
| is_published | boolean | Yes | Default false — drafts |
| started_at | date | No | |
| created_at / updated_at | timestamptz | Yes | `updated_at` maintained by trigger |
| deleted_at | timestamptz | No | Soft delete |

### Updates Table (added Aug 2026 — migration 001)

A single entry: a note, a photo, a finding from the road.

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key |
| project_id | uuid | No | **Nullable** — NULL means a standalone post belonging to no project. Deleting a project sets this to NULL rather than destroying the updates |
| title | text | No | Optional; a daily log entry often needs none |
| body | text | No | |
| photos | jsonb | Yes | |
| is_published | boolean | Yes | Default false — drafts |
| published_at | timestamptz | No | Separate from `created_at`, so a draft written Tuesday and published Friday sorts by Friday |
| created_at / updated_at | timestamptz | Yes | |
| deleted_at | timestamptz | No | Soft delete |

### Photos JSON Structure
```javascript
{
  photos: [
    { url: "https://...", is_main: true, order: 0 },
    { url: "https://...", is_main: false, order: 1 }
  ]
}
```

---

## 🚀 Development

### Quick Start
```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev
```

### URLs
- **Public Site:** http://localhost:3001
- **Admin Panel:** http://localhost:3001/equipment/admin.html
- **Server:** http://localhost:3000
- **Browser-sync UI:** http://localhost:3002

### Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with live reload |
| `npm start` | Production server only |
| `npm run watch` | Server with nodemon |
| `npm run bs` | Browser-sync only |

---

## 📁 File Structure

```
/public/
├── index.html              # Main landing page
├── about.html              # About Cory
├── doug.html               # Doug tribute page
├── main-styles.css         # Main site styles
├── styles.css              # Equipment page styles
├── supabaseClient.js       # Supabase connection
├── equipmentLoader.js      # Public equipment loading
├── admin.js                # Admin functionality
├── script.js               # Legacy scripts
└── equipment/
    ├── index.html          # Equipment listings
    ├── contact.html        # Contact form
    └── admin.html          # Admin dashboard

/server.js                  # Express server
/package.json               # Dependencies
```

---

## 🔄 Key Implementation Details

### Soft Deletes
- Items are marked with `deleted_at` timestamp instead of permanent deletion
- Can be restored by setting `deleted_at` to NULL in Supabase
- All queries filter: `.is('deleted_at', null)`
- **Documentation:** `SOFT_DELETE_IMPLEMENTATION.md`

### Photo Uploads
- Max 5 photos per listing
- Auto-resize to 1200px width
- 5MB file size limit
- Stored in Supabase Storage (`equipment-images` bucket)
- Main photo selection with green border indicator

### RLS Policies
```sql
-- Public: Read-only active equipment
CREATE POLICY "Public can view active equipment"
ON equipment FOR SELECT TO public
USING (is_active = true AND deleted_at IS NULL);

-- Authenticated: Full access
CREATE POLICY "Authenticated users have full access"
ON equipment FOR ALL TO authenticated
USING (true) WITH CHECK (true);
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `PROJECT_SUMMARY.md` | This file - master reference |
| `README.md` | Quick start and overview |
| `ADMIN_SETUP.md` | Admin panel setup details |
| `SECURITY_CHECKLIST.md` | Security status and checklist |
| `SECURITY_SETUP_GUIDE.md` | Step-by-step security setup |
| `SOFT_DELETE_IMPLEMENTATION.md` | Soft delete technical details |
| `UPDATE_SUMMARY.md` | Recent feature updates |
| `.cursor/rules/project-context.mdc` | Cursor AI context (auto-loaded) |

---

## 🎯 Next Steps

> Current work is tracked in **`HANDOFF.md`**. This section covers the original
> static site only.

### Completed
- [x] Set up Vercel project and deploy
- [x] Add real equipment listings and photos
- [x] Google Analytics 4 (`G-BDKD0NT6KJ`)

### Superseded by the Next.js rebuild
- [ ] ~~Move Supabase credentials to environment variables~~ — done in `web/`
      via `.env.local`. Note the anon key is *designed* to be public; RLS is
      what protects the data, so this was never a leak.
- [ ] ~~Search / filtering~~ — revisit after the rebuild

### Future Enhancements
- [ ] Restore-deleted-items UI (soft-deleted rows are currently only
      recoverable via SQL)
- [ ] Email notifications for inquiries — the contact form is still
      "coming soon"
- [ ] A **Sold** state for equipment, so sold machines show as SOLD rather
      than disappearing

---

## 💙 About This Project

This website was built to honor **Doug**, Cory's father, who passed away in December 2024. The equipment sales section helps sell Doug's farm equipment, giving him the retirement he deserved by completing the work he started.

> *"Every piece here was maintained with pride. Dad wouldn't have had it any other way."*

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Review relevant documentation files
3. Verify Supabase credentials and permissions
4. Ensure `npm run dev` is running

---

*This document consolidates information from all project documentation files. For detailed information on specific topics, refer to the individual documentation files listed above.*

