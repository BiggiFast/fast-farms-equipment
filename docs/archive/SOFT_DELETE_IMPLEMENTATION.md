# Soft Delete Implementation

## Overview
Equipment items are now **soft deleted** instead of permanently removed from the database. This means deleted items are hidden but can be restored if needed.

---

## What Changed

### 1. Database Schema
Added `deleted_at` column to track when items were deleted.

**SQL to run in Supabase:**
```sql
-- Add deleted_at column for soft deletes
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at 
ON equipment(deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN equipment.deleted_at IS 'Timestamp when equipment was soft-deleted. NULL means not deleted.';
```

### 2. Delete Function (admin.js)
Changed from hard delete to soft delete:

**Before:**
```javascript
const { error } = await supabase
  .from('equipment')
  .delete()
  .eq('id', id);
```

**After:**
```javascript
const { error } = await supabase
  .from('equipment')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id);
```

### 3. Admin Query (admin.js)
Now excludes soft-deleted items:

```javascript
const { data, error } = await supabase
  .from('equipment')
  .select('*')
  .is('deleted_at', null)  // Only show non-deleted items
  .order('created_at', { ascending: false });
```

### 4. Public Site Query (equipmentLoader.js)
Excludes soft-deleted items:

```javascript
const { data, error } = await supabase
  .from('equipment')
  .select('*')
  .eq('is_active', true)
  .is('deleted_at', null)  // Exclude soft-deleted items
  .order('created_at', { ascending: false });
```

---

## How It Works

### For Users (Admin Page):
1. Click "Delete" button
2. Confirm deletion
3. Item disappears from the admin list
4. **Behind the scenes:** `deleted_at` is set to current timestamp

### For Developers:
- Deleted items remain in the database with `deleted_at` timestamp
- All queries filter out rows where `deleted_at IS NOT NULL`
- Items can be restored by setting `deleted_at` back to `NULL`

---

## Benefits of Soft Deletes

✅ **Data Recovery** - Accidentally deleted items can be restored  
✅ **Audit Trail** - Can see when items were deleted  
✅ **Compliance** - Some regulations require data retention  
✅ **Undo Functionality** - Can add "restore" feature later  
✅ **Analytics** - Can analyze deleted items for insights  

---

## Restoring Deleted Items

### Option 1: Via Supabase Dashboard
1. Go to Table Editor → equipment
2. Find the row with `deleted_at` timestamp
3. Set `deleted_at` to `NULL`
4. Item will reappear in admin and public site (if active)

### Option 2: Via SQL
```sql
UPDATE equipment 
SET deleted_at = NULL 
WHERE id = 'item-uuid-here';
```

### Option 3: Add Restore Button (Future Enhancement)
Could add a "View Deleted" section in admin with restore functionality.

---

## Viewing Deleted Items

### Via Supabase Dashboard:
Filter: `deleted_at IS NOT NULL`

### Via SQL:
```sql
SELECT * FROM equipment 
WHERE deleted_at IS NOT NULL 
ORDER BY deleted_at DESC;
```

---

## Permanent Deletion (Clean Up Old Data)

If you ever need to permanently remove old soft-deleted items:

```sql
-- Delete items soft-deleted more than 90 days ago
DELETE FROM equipment 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
```

**⚠️ WARNING:** This permanently removes data. Use with caution!

---

## Testing

### Test Soft Delete:
1. Go to admin page
2. Delete an item
3. Check Supabase table - row should still exist with `deleted_at` timestamp
4. Item should not appear in admin list
5. Item should not appear on public site

### Test Restore:
1. In Supabase, set `deleted_at` to `NULL` for a deleted item
2. Refresh admin page - item should reappear
3. If `is_active = true`, item should appear on public site

---

## Database Schema

Your `equipment` table now includes:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Equipment name |
| description | text | Full description |
| category | text | Category (tractor, truck, etc.) |
| price | numeric | Price in dollars |
| image_url | text | Image URL from storage |
| is_active | boolean | Controls public visibility |
| created_at | timestamptz | When created |
| **deleted_at** | **timestamptz** | **When soft-deleted (NULL = not deleted)** |

---

## Future Enhancements

### 1. Restore Functionality
Add a "View Deleted Items" section in admin:
```javascript
// Load deleted items
const { data } = await supabase
  .from('equipment')
  .select('*')
  .not('deleted_at', 'is', null)
  .order('deleted_at', { ascending: false });

// Restore function
async function restoreEquipment(id) {
  await supabase
    .from('equipment')
    .update({ deleted_at: null })
    .eq('id', id);
}
```

### 2. Automatic Cleanup
Set up a scheduled job to permanently delete items after X days:
- Use Supabase Edge Functions
- Run weekly/monthly
- Delete items where `deleted_at < NOW() - INTERVAL '90 days'`

### 3. Audit Log
Track who deleted what and when:
- Add `deleted_by` column
- Add `deleted_reason` text field
- Store user information with deletion

---

## Migration Notes

### Existing Data:
- All existing equipment will have `deleted_at = NULL`
- No data loss or changes needed
- Soft deletes start working immediately after SQL is run

### Backward Compatibility:
- Old queries without `deleted_at` filter will still work
- But they'll return deleted items
- Make sure all queries include `.is('deleted_at', null)`

---

## Code Summary

### Files Modified:
1. ✅ `public/admin.js` - Soft delete function, admin query filter
2. ✅ `public/equipmentLoader.js` - Public query filter

### SQL to Run:
```sql
ALTER TABLE equipment 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_deleted_at 
ON equipment(deleted_at);
```

---

## Ready to Test!

1. Run the SQL in Supabase SQL Editor
2. Refresh your admin page
3. Try deleting an item
4. Check Supabase - item should still be there with `deleted_at` timestamp
5. Try restoring by setting `deleted_at` to `NULL`


