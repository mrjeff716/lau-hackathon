// =============================================================================
// db.js — connects the backend to MongoDB (the database that stores users,
// their exercise plans, and exercise sessions).
// =============================================================================

import dns from 'node:dns'
import mongoose from 'mongoose'

export default async function connectDB() {
  // The connection string contains your database password, so it lives in
  // backend/.env (never in the code). See .env.example.
  const uri = process.env.MONGO_URI
  if (!uri || uri.startsWith('[')) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.')
  }

  // Optional: some Windows setups can't resolve "mongodb+srv://" addresses
  // (error "querySrv ECONNREFUSED"). Setting MONGO_DNS_SERVERS=1.1.1.1,8.8.8.8
  // in .env makes Node use those DNS servers instead.
  if (process.env.MONGO_DNS_SERVERS) {
    dns.setServers(process.env.MONGO_DNS_SERVERS.split(',').map((s) => s.trim()))
  }

  try {
    // Mongoose opens the connection and reuses it for every query afterwards.
    // dbName picks the database inside your cluster.
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || 'physio-coach',
      serverSelectionTimeoutMS: 15000,
    }).then(() => console.log('CONNECTED'))
  } catch (err) {
    // Turn the most common failures into advice
    if (/querySrv/.test(err.message)) {
      err.message +=
        '\n  -> Node could not look up your mongodb+srv address on this network.' +
        '\n     Fix: use the standard format in .env: mongodb://USER:PASS@host1:27017,host2:27017,host3:27017/?tls=true&authSource=admin' +
        '\n     (Windows can list the hosts: Resolve-DnsName -Type SRV _mongodb._tcp.<your-cluster-address>)'
    } else if (/bad auth|authentication failed/i.test(err.message)) {
      err.message +=
        '\n  -> Wrong database username/password in MONGO_URI. Check Atlas > Database Access.' +
        '\n     Special characters in the password (@ : / ? # %) must be URL-encoded.'
    } else if (/whitelist|IP|timed out|Server selection/i.test(err.message)) {
      err.message +=
        '\n  -> Atlas may be blocking your IP. Check Atlas > Network Access.'
    }
    throw err
  }
  console.log('MongoDB connected')
}
