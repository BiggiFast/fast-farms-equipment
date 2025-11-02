# Fast Farms - Equipment Sales Website

A clean, modern website for listing and selling farm equipment including tractors, trucks, implements, and pickups.

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js with Express
- **Development**: Nodemon, Browser-sync, Concurrently
- **Database**: Supabase (planned)
- **Hosting**: Vercel (planned)

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
- Server: http://localhost:3000
- Browser-sync: http://localhost:3001

**Individual commands:**
- `npm start` - Start production server only
- `npm run watch` - Start server with nodemon (auto-restart on changes)
- `npm run bs` - Start browser-sync only

## Features

- **Category Filtering**: Filter equipment by type (All, Tractor, Truck, Implement, Pickup)
- **Image Gallery**: Click thumbnails to change main image
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Contact Forms**: Allow users to reach out about equipment

## Current Status

### Completed:
- ✅ Project structure organized
- ✅ Navigation and layout
- ✅ Category filtering system
- ✅ Image gallery functionality
- ✅ Contact and About pages
- ✅ Responsive design

### Next Steps:
1. Add real equipment photos
2. Connect to Supabase for dynamic listings
3. Deploy to Vercel

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




