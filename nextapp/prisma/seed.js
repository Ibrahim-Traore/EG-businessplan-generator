'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@efficienceglobale.com' },
    update: {},
    create: {
      email:    'admin@efficienceglobale.com',
      password: hashed,
      name:     'Administrateur EG',
      role:     'ADMIN',
    },
  });
  console.log('✓ Compte admin :', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
