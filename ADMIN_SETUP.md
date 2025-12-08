# Admin System Setup Guide

## Overview
A simple admin dashboard for managing equipment listings in the Fast Farms website.

---

## Files Created/Modified

### New Files:
1. **`public/supabaseClient.js`** - Supabase client initialization
2. **`public/admin.html`** - Admin dashboard page
3. **`public/admin.js`** - Admin functionality (CRUD operations)
4. **`ADMIN_SETUP.md`** - This guide

### Modified Files:
1. **`public/script.js`** - Added TODO comments for is_active filtering on public site

---

## Setup Instructions

### Step 1: Add Supabase Credentials

Edit `public/supabaseClient.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

Find these values in your Supabase project:
- Go to: Project Settings > API
- Copy: Project URL → SUPABASE_URL
- Copy: anon/public key → SUPABASE_ANON_KEY

### Step 2: Add is_active Column to Database

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

This adds an `is_active` column to control which items appear on the public site.

### Step 3: Change Admin Password

Edit `public/admin.js` and change the default password:

```javascript
const ADMIN_PASSWORD = 'admin123';  // Change this to your preferred password
```

### Step 4: Access the Admin Page

1. Start your dev server: `npm run dev`
2. Navigate to: http://localhost:3001/admin.html
3. Enter your admin password

---

## Admin Features

### Equipment List
- View ALL equipment (active and inactive)
- See name, category, price, and status for each item
- Quick toggle to activate/deactivate items

### Toggle Active/Inactive
- Click the checkbox in the "Active" column
- Immediately updates the database
- Active items appear on the public site
- Inactive items are hidden from public view

### Edit Existing Listing
1. Click "Edit" button on any row
2. Modify any fields:
   - Name
   - Description
   - Category
   - Price
   - Image URL
   - Active status
3. Click "Save Changes"

### Add New Listing
1. Click "+ New Listing" button
2. Fill in all fields:
   - Name (required)
   - Description
   - Category (required) - e.g., "tractor", "truck", "implement"
   - Price (required)
   - Image URL - paste Supabase Storage URL here
   - Active checkbox - check to make visible immediately
3. Click "Save Changes"

### Images
- For now, manually upload images to Supabase Storage
- Copy the public URL
- Paste into the "Image URL" field
- File upload from browser will be added in a future update

---

## Security Notes

### Current Protection:
- Simple password gate (client-side only)
- Password stored in JavaScript constant
- Suitable for personal use / testing

### Future Improvements:
- Implement Supabase Auth with Row Level Security (RLS)
- Add proper admin role checking
- Move password check to server-side
- Add session management

### Important:
- Do NOT expose admin.html to public users yet
- This is for YOUR use only during development
- Before production deployment, implement proper authentication

---

## Public Site Integration

When you're ready to load equipment dynamically on the public site:

1. Import the Supabase client in your main script
2. Fetch only active items: `.eq('is_active', true)`
3. See TODO comments in `public/script.js` for example code

---

## Code Examples

### Supabase Client Initialization

```javascript
// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### Toggle is_active Status

```javascript
// admin.js - Toggle handler
window.toggleActive = async function(id, isActive) {
  try {
    const { error } = await supabase
      .from('equipment')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    // Update local data and re-render
    const item = currentEquipment.find(e => e.id === id);
    if (item) {
      item.is_active = isActive;
      renderEquipmentTable();
    }
  } catch (error) {
    console.error('Error toggling active status:', error);
    alert(`Error updating status: ${error.message}`);
    loadEquipment(); // Reload on error
  }
};
```

### Save Listing (Edit or New)

```javascript
// admin.js - Form submission handler
async function saveListingForm() {
  const formData = {
    name: document.getElementById('listingName').value.trim(),
    description: document.getElementById('listingDescription').value.trim(),
    category: document.getElementById('listingCategory').value.trim(),
    price: parseFloat(document.getElementById('listingPrice').value),
    image_url: document.getElementById('listingImageUrl').value.trim(),
    is_active: document.getElementById('listingIsActive').checked
  };

  try {
    if (editingId) {
      // Update existing
      const { error } = await supabase
        .from('equipment')
        .update(formData)
        .eq('id', editingId);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('equipment')
        .insert([formData]);

      if (error) throw error;
    }

    closeModal();
    await loadEquipment();
  } catch (error) {
    console.error('Error saving listing:', error);
    alert(`Error saving listing: ${error.message}`);
  }
}
```

### Load Equipment (Admin View)

```javascript
// admin.js - Loads ALL equipment (active and inactive)
async function loadEquipment() {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentEquipment = data || [];
    renderEquipmentTable();
  } catch (error) {
    console.error('Error loading equipment:', error);
  }
}
```

### Load Equipment (Public View - Future)

```javascript
// script.js - Only loads ACTIVE equipment for public site
async function loadEquipmentFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true)  // IMPORTANT: Only show active items
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderEquipmentListings(data);
  } catch (error) {
    console.error('Error loading equipment:', error);
  }
}
```

---

## Database Schema

Your `equipment` table should have these columns:

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | uuid | Yes | Primary key (auto-generated) |
| name | text | Yes | Equipment name |
| description | text | No | Full description |
| category | text | Yes | "tractor", "truck", "implement", etc. |
| price | numeric | Yes | Price in dollars |
| image_url | text | No | Supabase Storage URL |
| is_active | boolean | Yes | Controls public visibility (default: true) |
| created_at | timestamp | Yes | Auto-generated timestamp |

---

## Troubleshooting

### Admin page won't load equipment
- Check browser console for errors
- Verify Supabase credentials in `supabaseClient.js`
- Ensure `equipment` table exists in Supabase
- Check Network tab for failed API requests

### Toggle doesn't work
- Verify `is_active` column exists (run the SQL above)
- Check Supabase table permissions (RLS policies)
- Check browser console for errors

### Can't save new listing
- Check required fields are filled (name, category, price)
- Verify Supabase INSERT permissions
- Check browser console for detailed error messages

---

## Next Steps

1. ✅ Add Supabase credentials
2. ✅ Run SQL to add is_active column
3. ✅ Change admin password
4. ✅ Test admin page functionality
5. ⏳ Upload equipment images to Supabase Storage
6. ⏳ Add equipment listings via admin page
7. ⏳ Connect public site to Supabase (load active items)
8. ⏳ Add proper Supabase Auth before production deployment

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Supabase credentials and permissions
3. Check that `npm run dev` is running
4. Review this guide for setup steps



