// =============================================================================
// db.js — connects the backend to MongoDB (the database that stores sessions).
// =============================================================================

import mongoose from 'mongoose'

export default async function connectDB() {
  // The connection string contains your database password, so it lives in
  // backend/.env (never in the code). See .env.example.
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.')
  }

  // Mongoose opens the connection and reuses it for every query afterwards
  await mongoose.connect(uri)
  console.log('MongoDB connected')
}
