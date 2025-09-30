const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Product Schema (same as your model)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, enum: ['juices', 'shakes'] },
  stock: { type: Number, required: true, default: 0 },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

const demoProducts = [
  // Juices
  {
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice packed with vitamin C and natural sweetness. Perfect way to start your day!',
    price: 120,
    category: 'juices',
    stock: 50,
    image: '/images/orange-juice.jpg'
  },
  {
    name: 'Green Apple Juice',
    description: 'Crisp and refreshing green apple juice with a perfect balance of sweet and tart flavors.',
    price: 130,
    category: 'juices',
    stock: 45,
    image: '/images/apple-juice.jpg'
  },
  {
    name: 'Mango Delight Juice',
    description: 'Tropical mango juice made from the finest Alphonso mangoes. Rich, creamy, and absolutely delicious.',
    price: 150,
    category: 'juices',
    stock: 30,
    image: '/images/mango-juice.jpg'
  },
  {
    name: 'Mixed Berry Juice',
    description: 'A delightful blend of strawberries, blueberries, and raspberries. Bursting with antioxidants and flavor.',
    price: 160,
    category: 'juices',
    stock: 25,
    image: '/images/berry-juice.jpg'
  },
  {
    name: 'Pomegranate Power',
    description: 'Pure pomegranate juice loaded with antioxidants and natural energy. Great for health and taste.',
    price: 180,
    category: 'juices',
    stock: 20,
    image: '/images/pomegranate-juice.jpg'
  },
  // Shakes
  {
    name: 'Chocolate Peanut Butter Shake',
    description: 'Rich chocolate shake blended with creamy peanut butter and topped with whipped cream.',
    price: 200,
    category: 'shakes',
    stock: 40,
    image: '/images/chocolate-pb-shake.jpg'
  },
  {
    name: 'Vanilla Bean Shake',
    description: 'Classic vanilla shake made with real vanilla beans and premium ice cream. Smooth and creamy.',
    price: 180,
    category: 'shakes',
    stock: 35,
    image: '/images/vanilla-shake.jpg'
  },
  {
    name: 'Strawberry Banana Shake',
    description: 'Perfect combination of fresh strawberries and ripe bananas blended into a creamy, fruity shake.',
    price: 170,
    category: 'shakes',
    stock: 30,
    image: '/images/strawberry-banana-shake.jpg'
  },
  {
    name: 'Oreo Cookie Shake',
    description: 'Indulgent shake loaded with crushed Oreo cookies and vanilla ice cream. A cookie lover\'s dream!',
    price: 190,
    category: 'shakes',
    stock: 25,
    image: '/images/oreo-shake.jpg'
  },
  {
    name: 'Mango Lassi Shake',
    description: 'Traditional Indian mango lassi with a modern twist. Creamy yogurt and mango blend with cardamom.',
    price: 160,
    category: 'shakes',
    stock: 35,
    image: '/images/mango-lassi.jpg'
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing products (optional)
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert demo products
    const insertedProducts = await Product.insertMany(demoProducts);
    console.log(`Successfully inserted ${insertedProducts.length} products:`);
    
    insertedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ₹${product.price} (${product.category})`);
    });

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed script
seedProducts();
