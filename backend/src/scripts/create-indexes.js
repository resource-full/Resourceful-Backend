const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const db = mongoose.connection.db;

  const collections = [
    { name: 'resources', indexes: [
      [{ status: 1, isDeleted: 1, owner: 1 }],
      [{ status: 1, isDeleted: 1, confidenceScore: -1 }],
      [{ status: 1, isDeleted: 1, createdAt: -1 }],
      [{ 'industry': 1 }, { 'experience': 1 }, { 'applicableLocation': 1 }],
      [{ 'name': 'text', 'description': 'text' }]
    ]},
    { name: 'pathways', indexes: [
      [{ status: 1, isDeleted: 1, author: 1 }],
      [{ status: 1, isDeleted: 1, createdAt: -1 }],
      [{ 'industry': 1 }, { 'experience': 1 }],
    ]},
    { name: 'hubs', indexes: [
      [{ owner: 1, isDeleted: 1 }],
      [{ status: 1, isDeleted: 1, createdAt: -1 }],
    ]},
    { name: 'payments', indexes: [
      [{ reference: 1 }],
      [{ status: 1, nextRetryAt: 1 }],
      [{ user: 1, itemType: 1, item: 1, status: 1 }],
    ]},
    { name: 'users', indexes: [
      [{ username: 1 }, { email: 1 }],
    ]},
    { name: 'transactions', indexes: [
      [{ user: 1, createdAt: -1 }],
      [{ 'metadata.paymentReference': 1, category: 1 }],
    ]}
  ];

  for (const col of collections) {
    try {
      const collection = db.collection(col.name);
      for (const idx of col.indexes) {
        await collection.createIndex(idx, { background: true });
        console.log(`Ensured index on ${col.name}: ${JSON.stringify(idx)}`);
      }
    } catch (e) {
      console.error(`Error on ${col.name}:`, e.message);
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
