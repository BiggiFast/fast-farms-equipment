# Fast Farms - Equipment Sales Website

A clean, modern website for listing and selling farm equipment including tractors, trucks, implements, and pickups.

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Database**: Supabase (connected & secured ✅)
- **Authentication**: Supabase Auth (email/password)
- **Storage**: Supabase Storage (equipment images)
- **Development**: Nodemon, Browser-sync, Concurrently
- **Hosting**: Vercel (ready to deploy)

## Project Structure

```
/public/               # All public-facing files
  ├── index.html      # Main equipment listings page
  ├── about.html      # About page
  ├── contact.html    # Contact form page
  ├── styles.css      # All styles
  └── script.js       # Category filtering & image gallery
/server.js            # Express server
/package.json         # Dependencies and scripts
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

## Development

**Start development server with live reload:**
```bash
npm run dev
```
This runs both the Node server and Browser-sync for automatic reloading.
- **Public Site**: http://localhost:3001
- **Admin Panel**: http://localhost:3001/equipment/admin.html
- Server: http://localhost:3000
- Browser-sync UI: http://localhost:3002

**Individual commands:**
- `npm start` - Start production server only
- `npm run watch` - Start server with nodemon (auto-restart on changes)
- `npm run bs` - Start browser-sync only

**Admin Access:**
- Login with your Supabase user credentials
- See `ADMIN_SETUP.md` for setup instructions
- See `SECURITY_SETUP_GUIDE.md` for security details

## Features

### Public Site
- **Category Filtering**: Filter equipment by type (All, Tractor, Truck, Implement, Pickup)
- **Image Gallery**: Click thumbnails to change main image
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Contact Forms**: Allow users to reach out about equipment

### Admin Dashboard
- **Secure Authentication**: Supabase Auth with email/password
- **Equipment Management**: Add, edit, delete, and toggle active/inactive
- **Multi-Photo Uploads**: Up to 5 photos per listing with auto-resize
- **Main Photo Selection**: Choose which photo displays as primary
- **Soft Deletes**: Items can be restored from database if needed
- **Real-time Updates**: Changes reflect immediately

## Current Status

### Completed:
- ✅ Project structure organized
- ✅ Navigation and layout
- ✅ Category filtering system
- ✅ Image gallery functionality
- ✅ Contact and About pages
- ✅ Responsive design
- ✅ **Supabase integration complete**
- ✅ **Admin dashboard with authentication**
- ✅ **Row Level Security (RLS) enabled**
- ✅ **Secure image uploads (authenticated only)**
- ✅ **Multi-photo support (up to 5 per listing)**

### Next Steps:
1. Move Supabase credentials to environment variables
2. Add equipment listings via admin panel
3. Connect public site to load equipment from Supabase
4. Deploy to Vercel

## Data Structure (Supabase Ready)

Equipment items follow this structure:
```javascript
{
  id: 0,
  title: "",
  category: "",      // "tractor", "truck", "implement", "pickup"
  price: 0,
  year: 0,
  hours: 0,          // or miles for vehicles
  condition: "",     // "Excellent", "Good", "Fair"
  description: "",
  features: [],
  images: [],
  contactInfo: {
    sellerName: "",
    phone: "",
    email: ""
  }
}
```

## Code Style

- Clear, descriptive variable names
- 2-space indentation
- Semantic HTML with section comments
- Modern ES6+ JavaScript
- Readability over cleverness

## Design Guidelines

- Clean, warm, trustworthy aesthetic
- Natural greens, off-whites, muted browns ("Oregon farm in spring")
- No heavy shadows or neon colors
- Generous spacing, grid-based layout

## License

ISC






