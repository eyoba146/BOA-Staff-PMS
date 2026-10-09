import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase database with initial BoA branch dataset...');

  // 1. System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      branchName: 'Finfine Main Branch',
      branchCode: 'BOA-001',
      onTargetMin: 85,
      needsAttentionMin: 70,
      thresholdsStatus: 'pending_validation',
      allowEditSubmitted: true,
      backdateDays: 3,
      entryPolicyStatus: 'pending_validation',
      weightingEnabled: true,
    },
  });
  console.log('✓ SystemSettings seeded');

  // 2. Positions
  const positions = [
    { name: 'Customer Service Officer (demo)', isActive: true },
    { name: 'Relationship Officer (demo)', isActive: true },
    { name: 'Cash Officer (demo)', isActive: true },
    { name: 'Branch Accountant (demo)', isActive: true },
    { name: 'Junior Banking Clerk (demo)', isActive: false },
  ];

  for (const pos of positions) {
    await prisma.position.upsert({
      where: { name: pos.name },
      update: { isActive: pos.isActive },
      create: { name: pos.name, isActive: pos.isActive },
    });
  }
  console.log('✓ Branch positions seeded');

  // 3. Users
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  const users = [
    {
      id: 'u_mgr',
      employeeId: 'BOA-M001',
      referenceId: 'REG-M001',
      fullName: 'Abebe Kebede',
      email: 'abebe.kebede@abyssinia.et',
      phone: '+251911234567',
      positionTitle: 'Branch Manager',
      branchName: 'Finfine Main Branch',
      role: 'manager' as const,
      status: 'active' as const,
      password: defaultPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date('2026-01-01T08:00:00.000Z'),
      approvedAt: new Date('2026-01-01T08:00:00.000Z'),
    },
    {
      id: 'u_s01',
      employeeId: 'BOA-S001',
      referenceId: 'REG-S001',
      fullName: 'Selam Tesfaye',
      email: 'selam.tesfaye@abyssinia.et',
      phone: '+251911345678',
      positionTitle: 'Customer Service Officer (demo)',
      branchName: 'Finfine Main Branch',
      role: 'staff' as const,
      status: 'active' as const,
      password: defaultPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date('2026-01-02T08:00:00.000Z'),
      approvedAt: new Date('2026-01-02T08:00:00.000Z'),
    },
    {
      id: 'u_s02',
      employeeId: 'BOA-S002',
      referenceId: 'REG-S002',
      fullName: 'Dawit Alemu',
      email: 'dawit.alemu@abyssinia.et',
      phone: '+251911456789',
      positionTitle: 'Relationship Officer (demo)',
      branchName: 'Finfine Main Branch',
      role: 'staff' as const,
      status: 'active' as const,
      password: defaultPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date('2026-01-03T08:00:00.000Z'),
      approvedAt: new Date('2026-01-03T08:00:00.000Z'),
    },
    {
      id: 'u_s09',
      employeeId: null,
      referenceId: 'REG-S009',
      fullName: 'Hanna Bekele',
      email: 'hanna.bekele@abyssinia.et',
      phone: '+251911123456',
      positionTitle: 'Branch Accountant (demo)',
      branchName: 'Finfine Main Branch',
      role: 'staff' as const,
      status: 'pending_approval' as const,
      password: defaultPasswordHash,
      emailVerified: true,
      emailVerifiedAt: new Date('2026-10-07T10:00:00.000Z'),
      approvedAt: null,
    },
    {
      id: 'u_s11',
      employeeId: null,
      referenceId: 'REG-S011',
      fullName: 'Elias Desta',
      email: 'elias.desta@abyssinia.et',
      phone: '+251911987654',
      positionTitle: 'Customer Service Officer (demo)',
      branchName: 'Finfine Main Branch',
      role: 'staff' as const,
      status: 'pending_email_verification' as const,
      password: defaultPasswordHash,
      emailVerified: false,
      emailVerifiedAt: null,
      approvedAt: null,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        employeeId: u.employeeId,
        referenceId: u.referenceId,
        positionTitle: u.positionTitle,
        status: u.status,
        role: u.role,
        emailVerified: u.emailVerified,
      },
      create: u,
    });
  }
  console.log('✓ Initial users seeded');

  console.log('Supabase seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
