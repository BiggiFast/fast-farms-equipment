// Equipment loader - fetches and displays equipment from Supabase
import { supabase } from './supabaseClient.js';

// Load equipment on page load
document.addEventListener('DOMContentLoaded', async function() {
  await loadEquipmentFromSupabase();
  setupCategoryFiltering();
  setupImageTransitions();
});

// Fetch active equipment from Supabase
async function loadEquipmentFromSupabase() {
  const container = document.querySelector('.container');
  
  // Show loading message
  container.innerHTML = '<div class="loading-message">Loading equipment...</div>';

  try {
    // Fetch only ACTIVE and NON-DELETED equipment for public site
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('is_active', true)  // IMPORTANT: Only show active items
      .is('deleted_at', null)  // Exclude soft-deleted items
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Clear container
    container.innerHTML = '';

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="no-equipment">No equipment available at this time. Check back soon!</div>';
      return;
    }

    // Render each equipment item
    data.forEach((item, index) => {
      const listingHtml = createListingHTML(item, index);
      container.innerHTML += listingHtml;
    });

  } catch (error) {
    console.error('Error loading equipment:', error);
    container.innerHTML = '<div class="error-message">Error loading equipment. Please try again later.</div>';
  }
}

// Create HTML for a single equipment listing
function createListingHTML(item, index) {
  const mainImgId = `mainImg${index}`;
  const category = (item.category || 'equipment').toLowerCase();

  // Get photos array or fallback to legacy image_url
  let photos = [];
  if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
    photos = item.photos.sort((a, b) => (a.order || 0) - (b.order || 0));
  } else if (item.image_url) {
    // Fallback to legacy single image
    photos = [{ url: item.image_url, is_main: true }];
  } else {
    // No images at all
    photos = [{ url: 'https://via.placeholder.com/800x600?text=No+Image', is_main: true }];
  }

  // Find main photo or use first one
  const mainPhoto = photos.find(p => p.is_main) || photos[0];

  return `
    <section class="listing" data-category="${escapeHtml(category)}">
      <!-- Image Gallery -->
      <div class="gallery">
        <div class="main-image">
          <img id="${mainImgId}" src="${escapeHtml(mainPhoto.url)}" alt="${escapeHtml(item.name || 'Equipment')}">
        </div>
        <div class="thumbnail-container">
          ${photos.map((photo, photoIndex) => `
            <img
              class="thumbnail ${photo === mainPhoto ? 'active' : ''}"
              src="${escapeHtml(photo.url)}"
              alt="Photo ${photoIndex + 1}"
              onclick="changeImage(this, '${mainImgId}')"
            >
          `).join('')}
        </div>
      </div>

      <!-- Product Details -->
      <div class="details">
        <h2>${escapeHtml(item.name || 'Untitled Equipment')}</h2>
        <span class="equipment-tag">${escapeHtml(capitalizeFirst(category))}</span>
        <div class="description">
          <p><strong>Price:</strong> $${formatPrice(item.price)}</p>

          ${item.description ? `
            <h3>Description</h3>
            <p>${escapeHtml(item.description)}</p>
          ` : ''}

          <a href="/equipment/contact.html" class="contact-btn">Contact Us</a>
        </div>
      </div>
    </section>
  `;
}

// Setup category filtering
function setupCategoryFiltering() {
  const categoryTags = document.querySelectorAll('.category-tags .tag');
  
  categoryTags.forEach(tag => {
    tag.addEventListener('click', function() {
      const category = this.getAttribute('data-category');

      // Update active state on tags
      categoryTags.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      // Filter listings
      const listings = document.querySelectorAll('.listing');
      listings.forEach(listing => {
        const listingCategory = listing.getAttribute('data-category');

        if (category === 'all' || listingCategory === category) {
          listing.style.display = 'grid';
        } else {
          listing.style.display = 'none';
        }
      });
    });
  });
}

// Setup image transitions
function setupImageTransitions() {
  const mainImages = document.querySelectorAll('.main-image img');
  mainImages.forEach(img => {
    img.style.transition = 'opacity 0.3s ease';
  });
}

// Function to change the main image when a thumbnail is clicked
window.changeImage = function(thumbnail, mainImgId) {
  const mainImg = document.getElementById(mainImgId);

  // Fade out
  mainImg.style.opacity = '0';

  setTimeout(() => {
    // Change image
    mainImg.src = thumbnail.src;

    // Fade in
    mainImg.style.opacity = '1';

    // Update active thumbnail - only within the same gallery
    const gallery = thumbnail.closest('.gallery');
    const thumbnails = gallery.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
      thumb.classList.remove('active');
    });
    thumbnail.classList.add('active');
  }, 150);
};

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

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

