// Equipment data structure for Supabase integration
// This structure defines what each equipment item should contain
const equipmentDataStructure = {
  id: 0,                    // Unique identifier (will come from Supabase)
  title: "",                // Equipment name/model
  category: "",             // Category: "tractor", "truck", "implement", "pickup"
  price: 0,                 // Price in dollars
  year: 0,                  // Year manufactured
  hours: 0,                 // Hours of use (or miles for vehicles)
  condition: "",            // Condition: "Excellent", "Good", "Fair"
  description: "",          // Full description text
  features: [],             // Array of feature strings
  images: [],               // Array of image URLs/paths
  contactInfo: {
    sellerName: "",
    phone: "",
    email: ""
  }
};

// Function to change the main image when a thumbnail is clicked
function changeImage(thumbnail, mainImgId) {
  // Get the main image element
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
}

// Add smooth transition effect when page loads
document.addEventListener('DOMContentLoaded', function() {
  const mainImages = document.querySelectorAll('.main-image img');
  mainImages.forEach(img => {
    img.style.transition = 'opacity 0.3s ease';
  });

  // Setup category filtering
  const categoryTags = document.querySelectorAll('.category-tags .tag');
  const listings = document.querySelectorAll('.listing');

  categoryTags.forEach(tag => {
    tag.addEventListener('click', function() {
      const category = this.getAttribute('data-category');

      // Update active state on tags
      categoryTags.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      // Filter listings
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
});

// TODO: Function to fetch equipment items from Supabase
// When implementing, make sure to ONLY fetch items where is_active = true
// Example:
// import { supabase } from './supabaseClient.js';
//
// async function loadEquipmentFromSupabase() {
//   try {
//     const { data, error } = await supabase
//       .from('equipment')
//       .select('*')
//       .eq('is_active', true)  // IMPORTANT: Only show active items on public site
//       .order('created_at', { ascending: false });
//
//     if (error) throw error;
//     renderEquipmentListings(data);
//   } catch (error) {
//     console.error('Error loading equipment:', error);
//   }
// }

// TODO: Function to render equipment listings dynamically
// function renderEquipmentListings(items) {
//   const container = document.querySelector('.container');
//   container.innerHTML = ''; // Clear existing listings
//   
//   items.forEach(item => {
//     // Create listing HTML dynamically using the item data
//     // Only items with is_active = true will be passed here
//     // Use item.name, item.description, item.category, item.price, item.image_url
//   });
// }

  