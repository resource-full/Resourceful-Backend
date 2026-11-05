require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./src/modules/user/user.model');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI;

async function seedSuperAdmin() {
  await mongoose.connect(MONGO_URI);
  const email = process.env.SUPERADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'Admin@123';
  const existing = await User.findOne({ username: 'superadmin' });
  if (existing) {
    existing.email = email;
    existing.password = await bcrypt.hash(password, 10);
    existing.role = 'superadmin';
    existing.isEmailVerified = true;
    await existing.save();
    console.log('Super admin updated:', email);
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    name: 'Super Admin',
    email,
    password: hashed,
    role: 'superadmin',
    username: 'superadmin',
    isEmailVerified: true
  });
  console.log('Super admin created:', email, 'password:', password);
  process.exit(0);
}

seedSuperAdmin().catch(err => { console.error(err); process.exit(1); });
