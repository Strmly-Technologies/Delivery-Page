// Run this script with: node scripts/create-admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const MONGO_URI="mongodb+srv://rohith:KCPgEanlwGYukkmX@cluster0.g4wv6ji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .catch(err => console.error('MongoDB connection error:', err));

// Create a simple user schema (matching your app's schema)
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Create model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Admin details
const adminDetails = {
  username: 'admin',
  email: 'admin@strmly.com',
  password: 'admin123', // Change this!
  role: 'admin'
};

// Create admin user
async function createAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminDetails.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create new admin
    const admin = new User(adminDetails);
    await admin.save();
    
    console.log('Admin created successfully:', {
      email: admin.email,
      username: admin.username,
      role: admin.role
    });
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();