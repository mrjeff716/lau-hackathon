// =============================================================================
// server.js — entry point of the backend (the API the website talks to).
//
// Its job: receive the exercise results the patient's phone sends at the end
// of a session, store them in MongoDB, and answer questions about them (e.g.
// "which patients are struggling this week?" for the physiotherapist).
// The pose tracking itself happens in the browser, NOT here.
// =============================================================================

import dotenv from 'dotenv'
// Read secrets/settings from the .env file into process.env
// (MONGO_URI, PORT, CLIENT_ORIGIN). The values are only read later, when
// connectDB() and app.listen() run, so they are loaded in time.
dotenv.config()

import express from 'express'
import cors from 'cors'

import connectDB from './config/db.js'
import rateLimiter from './middleware/rateLimiter.js'
import sessionsRoutes from './routes/sessions.js'

const app = express()
const PORT = process.env.PORT || 5001

// --- Middleware: runs on every request before it reaches a route -----------

// Parse JSON request bodies so routes can read req.body
app.use(express.json())

// CORS: only allow the website (Vite dev server by default) to call this API
// from a browser. Other sites' pages are blocked.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}))

// Basic protection against too many requests from one IP
app.use(rateLimiter)

// --- Routes ------------------------------------------------------------------

// Quick "is the server alive?" check: open http://localhost:5001/api/health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Everything about exercise sessions lives under /api/sessions
// (see routes/sessions.js)
app.use('/api/sessions', sessionsRoutes)

// --- Start -------------------------------------------------------------------

// Connect to the database first; only start accepting requests once that works.
// If it fails (e.g. MONGO_URI missing or wrong), print why and stop.
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  })
