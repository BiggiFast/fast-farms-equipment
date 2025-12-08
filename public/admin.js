// Admin page JavaScript - manages equipment listings
import { supabase } from './supabaseClient.js';

let currentEquipment = [];
let editingId = null;
let currentPhotos = []; // Array to track photos: [{url, isMain, file}]
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ==================== AUTHENTICATION FUNCTIONS ====================

// Sign in with Supabase Auth
window.signIn = async function() {
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('authError');
  const successEl = document.getElementById('authSuccess');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password';
    errorEl.classList.remove('hidden');
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    // Successfully signed in
    successEl.textContent = 'Signed in successfully!';
    successEl.classList.remove('hidden');

    // Show admin dashboard
    setTimeout(() => {
      document.getElementById('authGate').classList.add('hidden');
      document.getElementById('adminDashboard').classList.remove('hidden');
      loadEquipment();
    }, 500);

  } catch (error) {
    console.error('Sign in error:', error);
    errorEl.textContent = error.message || 'Failed to sign in';
    errorEl.classList.remove('hidden');
    document.getElementById('passwordInput').value = '';
  }
};

// Sign out
window.signOut = async function() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Hide dashboard and show login
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('authGate').classList.remove('hidden');
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';

  } catch (error) {
    console.error('Sign out error:', error);
    alert('Error signing out: ' + error.message);
  }
};

// Check if user is already authenticated on page load
async function checkAuthStatus() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // User is already signed in
    document.getElementById('authGate').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');
    loadEquipment();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already authenticated
  checkAuthStatus();

  // Allow Enter key to submit login
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');

  if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        signIn();
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        signIn();
      }
    });
  }

  // Photo input handler
  const photoInput = document.getElementById('photoInput');
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoSelection);
  }
});

// Load all equipment from Supabase (exclude soft-deleted items)
async function loadEquipment() {
  const loadingMessage = document.getElementById('loadingMessage');
  const table = document.getElementById('equipmentTable');
  
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .is('deleted_at', null)  // Only show non-deleted items
      .order('created_at', { ascending: false });

    if (error) throw error;

    currentEquipment = data || [];
    renderEquipmentTable();
    
    loadingMessage.classList.add('hidden');
    table.classList.remove('hidden');
  } catch (error) {
    console.error('Error loading equipment:', error);
    loadingMessage.textContent = `Error loading equipment: ${error.message}`;
  }
}

// Render equipment table
function renderEquipmentTable() {
  const tbody = document.getElementById('equipmentTableBody');

  if (currentEquipment.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No equipment found. Click "New Listing" to add one.</td></tr>';
    return;
  }

  tbody.innerHTML = currentEquipment.map(item => {
    // Get main photo or first photo
    let photoUrl = null;
    if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      const mainPhoto = item.photos.find(p => p.is_main);
      photoUrl = mainPhoto ? mainPhoto.url : item.photos[0].url;
    } else if (item.image_url) {
      photoUrl = item.image_url; // Fallback to legacy image_url
    }

    return `
      <tr>
        <td>
          <input
            type="checkbox"
            ${item.is_active ? 'checked' : ''}
            onchange="toggleActive('${item.id}', this.checked)"
          >
        </td>
        <td>
          ${photoUrl
            ? `<img src="${escapeHtml(photoUrl)}" alt="Thumbnail" class="photo-thumb">`
            : '<div class="no-photo">No Photo</div>'}
        </td>
        <td>${escapeHtml(item.name || '')}</td>
        <td>${escapeHtml(item.category || '')}</td>
        <td>$${formatPrice(item.price)}</td>
        <td>
          <span class="status-badge ${item.is_active ? 'status-active' : 'status-inactive'}">
            ${item.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn" onclick="openEditForm('${item.id}')">Edit</button>
          <button class="btn btn-secondary" onclick="deleteEquipment('${item.id}', '${escapeHtml(item.name || '')}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Toggle is_active status
window.toggleActive = async function(id, isActive) {
  try {
    const { error } = await supabase
      .from('equipment')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;

    // Update local data
    const item = currentEquipment.find(e => e.id === id);
    if (item) {
      item.is_active = isActive;
      renderEquipmentTable();
    }
  } catch (error) {
    console.error('Error toggling active status:', error);
    alert(`Error updating status: ${error.message}`);
    // Reload to reset checkbox
    loadEquipment();
  }
};

// Delete equipment (soft delete - marks as deleted instead of removing)
window.deleteEquipment = async function(id, name) {
  // Confirm deletion
  const confirmed = confirm(`Are you sure you want to delete "${name}"? This can be undone by restoring from the database.`);
  
  if (!confirmed) return;

  try {
    // Soft delete: set deleted_at to current timestamp
    const { error } = await supabase
      .from('equipment')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // Reload equipment list
    await loadEquipment();
    
    alert(`"${name}" has been deleted successfully.`);
  } catch (error) {
    console.error('Error deleting equipment:', error);
    alert(`Error deleting equipment: ${error.message}`);
  }
};

// Open modal for new listing
window.openNewListingForm = function() {
  editingId = null;
  currentPhotos = [];
  document.getElementById('modalTitle').textContent = 'New Listing';
  document.getElementById('listingForm').reset();
  document.getElementById('listingId').value = '';
  document.getElementById('listingIsActive').checked = true; // Default to active
  document.getElementById('photoInput').value = ''; // Reset file input
  renderPhotoPreview();
  document.getElementById('listingModal').classList.add('active');
};

// Open modal for editing existing listing
window.openEditForm = function(id) {
  const item = currentEquipment.find(e => e.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Listing';
  document.getElementById('listingId').value = item.id;
  document.getElementById('listingName').value = item.name || '';
  document.getElementById('listingDescription').value = item.description || '';
  document.getElementById('listingCategory').value = item.category || '';
  document.getElementById('listingPrice').value = item.price || '';
  document.getElementById('listingImageUrl').value = item.image_url || '';
  document.getElementById('listingIsActive').checked = item.is_active || false;
  document.getElementById('photoInput').value = ''; // Reset file input

  // Load existing photos
  currentPhotos = [];
  if (item.photos && Array.isArray(item.photos)) {
    currentPhotos = item.photos.map(p => ({
      url: p.url,
      isMain: p.is_main || false,
      existing: true // Mark as existing (already uploaded)
    }));
  }
  renderPhotoPreview();

  document.getElementById('listingModal').classList.add('active');
};

// Close modal
window.closeModal = function() {
  document.getElementById('listingModal').classList.remove('active');
  document.getElementById('listingForm').reset();
  document.getElementById('photoInput').value = '';
  currentPhotos = [];
  editingId = null;
};

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('listingForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveListingForm();
    });
  }
});

// Save listing (create or update)
async function saveListingForm() {
  const statusEl = document.getElementById('photoUploadStatus');
  statusEl.textContent = 'Uploading photos...';

  try {
    // Upload any new photos first
    await uploadNewPhotos();

    // Prepare photos array for database
    const photosArray = currentPhotos.map((photo, index) => ({
      url: photo.url,
      is_main: photo.isMain || false,
      order: index
    }));

    const formData = {
      name: document.getElementById('listingName').value.trim(),
      description: document.getElementById('listingDescription').value.trim(),
      category: document.getElementById('listingCategory').value.trim(),
      price: parseFloat(document.getElementById('listingPrice').value),
      image_url: document.getElementById('listingImageUrl').value.trim(),
      is_active: document.getElementById('listingIsActive').checked,
      photos: photosArray
    };

    statusEl.textContent = 'Saving listing...';

    if (editingId) {
      // Update existing listing
      const { error } = await supabase
        .from('equipment')
        .update(formData)
        .eq('id', editingId);

      if (error) throw error;
    } else {
      // Insert new listing
      const { error } = await supabase
        .from('equipment')
        .insert([formData]);

      if (error) throw error;
    }

    statusEl.textContent = 'Success!';

    // Close modal and reload data
    setTimeout(() => {
      closeModal();
      loadEquipment();
    }, 500);
  } catch (error) {
    console.error('Error saving listing:', error);
    statusEl.textContent = '';
    alert(`Error saving listing: ${error.message}`);
  }
}

// Utility functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function formatPrice(price) {
  if (price == null) return '0.00';
  return parseFloat(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ==================== PHOTO MANAGEMENT FUNCTIONS ====================

// Handle photo file selection
async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files);
  const statusEl = document.getElementById('photoUploadStatus');

  // Check if adding these files would exceed the limit
  if (currentPhotos.length + files.length > MAX_PHOTOS) {
    alert(`You can only upload up to ${MAX_PHOTOS} photos total.`);
    event.target.value = ''; // Reset input
    return;
  }

  // Validate each file
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      alert(`${file.name} is too large. Maximum size is 5MB.`);
      continue;
    }

    if (!file.type.startsWith('image/')) {
      alert(`${file.name} is not an image file.`);
      continue;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Add to currentPhotos array
    currentPhotos.push({
      file: file,
      url: previewUrl,
      isMain: currentPhotos.length === 0, // First photo is main by default
      existing: false
    });
  }

  // Clear the file input so the same file can be selected again if needed
  event.target.value = '';

  // Render preview
  renderPhotoPreview();
  statusEl.textContent = `${currentPhotos.length} photo(s) selected`;
}

// Render photo preview grid
function renderPhotoPreview() {
  const container = document.getElementById('photoPreviewContainer');

  if (currentPhotos.length === 0) {
    container.innerHTML = '<p style="color: #666; font-size: 14px;">No photos uploaded yet.</p>';
    return;
  }

  container.innerHTML = currentPhotos.map((photo, index) => `
    <div class="photo-preview-item ${photo.isMain ? 'main-photo' : ''}">
      ${photo.isMain ? '<span class="main-badge">MAIN</span>' : ''}
      <img src="${photo.url}" alt="Preview ${index + 1}">
      <div class="photo-preview-controls">
        ${!photo.isMain ? `<button type="button" onclick="setMainPhoto(${index})">Set Main</button>` : '<span style="color: white; font-size: 11px;">Main Photo</span>'}
        <button type="button" onclick="removePhoto(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

// Set a photo as the main photo
window.setMainPhoto = function(index) {
  // Remove main from all photos
  currentPhotos.forEach(photo => photo.isMain = false);
  // Set this photo as main
  currentPhotos[index].isMain = true;
  renderPhotoPreview();
};

// Remove a photo
window.removePhoto = function(index) {
  const photo = currentPhotos[index];

  // Revoke object URL if it's a preview (not existing)
  if (!photo.existing && photo.url.startsWith('blob:')) {
    URL.revokeObjectURL(photo.url);
  }

  // Remove from array
  currentPhotos.splice(index, 1);

  // If we removed the main photo and there are still photos, make the first one main
  if (currentPhotos.length > 0 && !currentPhotos.some(p => p.isMain)) {
    currentPhotos[0].isMain = true;
  }

  renderPhotoPreview();
  document.getElementById('photoUploadStatus').textContent = `${currentPhotos.length} photo(s) selected`;
};

// Resize image to max width while maintaining aspect ratio
async function resizeImage(file, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        }, 'image/jpeg', 0.9); // 90% quality JPEG
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Upload new photos to Supabase Storage
async function uploadNewPhotos() {
  const photosToUpload = currentPhotos.filter(p => !p.existing && p.file);

  for (const photo of photosToUpload) {
    try {
      // Resize image before upload
      const resizedBlob = await resizeImage(photo.file, 1200);

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = photo.file.name.split('.').pop();
      const filename = `${timestamp}_${randomStr}.${extension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('equipment-images')
        .upload(filename, resizedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(filename);

      // Update photo object with the uploaded URL
      photo.url = urlData.publicUrl;
      photo.existing = true; // Mark as uploaded

      // Revoke the blob URL
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }

    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }
}


