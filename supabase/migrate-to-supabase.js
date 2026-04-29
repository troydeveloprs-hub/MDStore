/* ===================================================================
   MIGRATION SCRIPT: Transfer data from localStorage to Supabase
   Run this script in the browser console after setting up Supabase
   =================================================================== */

(async function migrateToSupabase() {
  console.log('🚀 Starting migration from localStorage to Supabase...');
  
  try {
    // Wait for MDB to be available
    if (typeof window.MDB === 'undefined') {
      console.error('❌ MDB is not available. Make sure store.js is loaded.');
      return;
    }

    const { Auth, Cart, Wishlist, Orders, Reviews, Addresses, Coupons, Settings } = window.MDB;

    // 1. Migrate Users
    console.log('📦 Migrating users...');
    const localUsers = JSON.parse(localStorage.getItem('mdb_users') || '[]');
    for (const user of localUsers) {
      try {
        await Auth.register({
          email: user.email,
          password: atob(user.password), // Decode password
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          city: user.city
        });
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (err) {
        console.warn(`⚠️ Failed to migrate user ${user.email}:`, err.message);
      }
    }

    // 2. Migrate Cart (for logged in users only)
    console.log('📦 Migrating cart items...');
    const localCart = JSON.parse(localStorage.getItem('mdb_cart') || '[]');
    if (localCart.length > 0) {
      const user = Auth.getUser();
      if (user) {
        for (const item of localCart) {
          await Cart.add(item);
        }
        console.log(`✅ Migrated ${localCart.length} cart items`);
      } else {
        console.log('⚠️ No user logged in, skipping cart migration');
      }
    }

    // 3. Migrate Wishlist
    console.log('📦 Migrating wishlist items...');
    const localWishlist = JSON.parse(localStorage.getItem('mdb_wishlist') || '[]');
    if (localWishlist.length > 0) {
      const user = Auth.getUser();
      if (user) {
        for (const item of localWishlist) {
          await Wishlist.add(item);
        }
        console.log(`✅ Migrated ${localWishlist.length} wishlist items`);
      } else {
        console.log('⚠️ No user logged in, skipping wishlist migration');
      }
    }

    // 4. Migrate Orders
    console.log('📦 Migrating orders...');
    const localOrders = JSON.parse(localStorage.getItem('mdb_orders') || '[]');
    for (const order of localOrders) {
      try {
        await Orders.create({
          name: order.customer?.name || '',
          email: order.customer?.email || '',
          phone: order.customer?.phone || '',
          address: order.customer?.address || '',
          city: order.customer?.city || '',
          paymentMethod: order.paymentMethod || 'cash'
        });
        console.log(`✅ Migrated order: ${order.id}`);
      } catch (err) {
        console.warn(`⚠️ Failed to migrate order ${order.id}:`, err.message);
      }
    }

    // 5. Migrate Reviews
    console.log('📦 Migrating reviews...');
    const localReviews = JSON.parse(localStorage.getItem('mdb_reviews') || '[]');
    for (const review of localReviews) {
      try {
        await Reviews.add({
          productId: review.productId,
          rating: review.rating,
          text: review.text,
          authorName: review.authorName,
          authorEmail: review.authorEmail
        });
        console.log(`✅ Migrated review for product: ${review.productId}`);
      } catch (err) {
        console.warn(`⚠️ Failed to migrate review for ${review.productId}:`, err.message);
      }
    }

    // 6. Migrate Addresses
    console.log('📦 Migrating addresses...');
    const localAddresses = JSON.parse(localStorage.getItem('mdb_addresses') || '[]');
    if (localAddresses.length > 0) {
      const user = Auth.getUser();
      if (user) {
        for (const addr of localAddresses) {
          await Addresses.add(addr);
        }
        console.log(`✅ Migrated ${localAddresses.length} addresses`);
      } else {
        console.log('⚠️ No user logged in, skipping addresses migration');
      }
    }

    // 7. Migrate Coupons
    console.log('📦 Migrating coupons...');
    const localCoupons = JSON.parse(localStorage.getItem('mdb_custom_coupons') || '[]');
    for (const coupon of localCoupons) {
      try {
        await Coupons.add(coupon);
        console.log(`✅ Migrated coupon: ${coupon.code}`);
      } catch (err) {
        console.warn(`⚠️ Failed to migrate coupon ${coupon.code}:`, err.message);
      }
    }

    // 8. Migrate Settings
    console.log('📦 Migrating settings...');
    const localSettings = JSON.parse(localStorage.getItem('mdb_settings') || '{}');
    if (Object.keys(localSettings).length > 0) {
      await Settings.save(localSettings);
      console.log('✅ Migrated settings');
    }

    console.log('✅ Migration completed successfully!');
    console.log('⚠️ Please verify the data in Supabase before clearing localStorage.');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
})();
