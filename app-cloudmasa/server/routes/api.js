// server/routes/scmDefaultRoute.js
import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();

// 👇 MongoDB Connection
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("your-database-name"); // 👈 CHANGE THIS to your DB name
    console.log("✅ Connected to MongoDB");
  }
  return db;
}

// 👇 NEW ENDPOINT: Save SCM Connection + Files to MongoDB
router.post('/save-default', async (req, res) => {
  const { repo, folder, lastSync } = req.body;
  try {
    const database = await connectDB();
    const collection = database.collection('scm_connections');

    if (!repo || !folder) {
      return res.status(400).json({ error: 'repo and folder are required' });
    }

    const doc = {
      repo,
      folder,
      files: [], // 👈 Fixed: 'files' was not defined — now empty array
      lastSync: lastSync || new Date().toISOString(),
      status: 'Connected',
      createdAt: new Date(),
    };
    const result = await collection.insertOne(doc);

    res.status(200).json({
      success: true,
      message: 'Saved to MongoDB!',
      id: result.insertedId,
    });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to save to database' });
  }
});

export default router;