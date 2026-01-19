// server/seeds/superAdminSeed.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Register from '../models/RegisterModel.js';

// Make sure this matches your actual MongoDB URI
const MONGODB_URI = 'mongodb+srv://keerthisankavi_db_user:mfNxw8wDf5Q1nVjZ@cluster.xmlrcxf.mongodb.net/?retryWrites=true&w=majority&appName=cluster'; // or your cloud URI

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('Sar0@123', 10);
    const superAdmin = new Register({
      name: "Saravana",
      email: "saravana.g@cloudmasa.com",
      password: hashedPassword,
      role: "super-admin"
    });
    await superAdmin.save();
    console.log('✅ Super Admin created successfully!');
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
  } finally {
    // Close the connection after the operation
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

createSuperAdmin();