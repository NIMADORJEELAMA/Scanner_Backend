import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  // 1. Create a default Organization first
  const org = await prisma.organization.upsert({
    where: { name: 'Main Store' },
    update: {},
    create: {
      name: 'Main Store',
      address: 'Jaigaon',
    },
  });

  // 2. Create the Admin User linked to that Organization
  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      email: 'admin@store.com',
      name: 'Main Admin',
      password: password,
      role: 'ADMIN',
      isActive: true,
      // Link to the org we just created/found
      orgId: org.id,
    },
  });

  console.log({ org, admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
