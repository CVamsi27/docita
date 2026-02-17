import { PrismaClient } from '@workspace/db';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Dedicated seed script for DEV admin user
 * Email: admin@docita.work
 * Password: password123
 */
async function seedAdminDev() {
  // Setup connection string with SSL fix
  let connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      const sslMode = url.searchParams.get('sslmode');
      if (
        sslMode === 'require' ||
        sslMode === 'prefer' ||
        sslMode === 'verify-ca'
      ) {
        url.searchParams.set('sslmode', 'verify-full');
        if (!url.port) {
          url.port = '5432';
        }
        connectionString = url.toString();
        process.env.DATABASE_URL = connectionString; // Update process.env for Prisma
      }
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL for SSL adjustment', error);
    }
  }

  const prisma = new PrismaClient();

  try {
    console.log('Starting DEV admin user seed...');
    console.log(
      'Using Database URL:',
      process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 20) + '...'
        : 'UNDEFINED',
    );

    const devPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@docita.work' },
      update: {
        password: devPassword,
        role: 'SUPER_ADMIN',
        name: 'Super Admin (Dev)',
      },
      create: {
        email: 'admin@docita.work',
        password: devPassword,
        name: 'Super Admin (Dev)',
        role: 'SUPER_ADMIN',
        clinicId: null,
      },
    });

    console.log('[OK] DEV Admin user seeded successfully');
    console.log('   Email: admin@docita.work');
    console.log('   Password: password123');
    console.log('   Role: SUPER_ADMIN');
    console.log('   User ID:', admin.id);

    await prisma.$disconnect();
  } catch (error) {
    console.error('[ERROR] Error seeding DEV admin user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

seedAdminDev();
