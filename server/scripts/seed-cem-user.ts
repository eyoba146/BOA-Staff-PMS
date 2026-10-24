import { prisma } from '../src/config/database.js';
import { hashPassword, comparePassword } from '../src/utils/password.js';

async function seed() {
  console.log('--- Checking & Provisioning Users ---');

  // 1. Verify manager
  const mgr = await prisma.user.findUnique({ where: { id: 'u_mgr' } });
  if (mgr) {
    const isPassValid = await comparePassword('Password@123', mgr.password);
    console.log(`Manager [${mgr.email}] Password@123 match:`, isPassValid);
    if (!isPassValid) {
      const hashed = await hashPassword('Password@123');
      await prisma.user.update({
        where: { id: 'u_mgr' },
        data: { password: hashed },
      });
      console.log('Updated manager password to Password@123');
    }
  }

  // 2. Ensure Customer Experience Manager position exists
  let cemPos = await prisma.position.findFirst({ where: { name: 'Customer Experience Manager' } });
  if (!cemPos) {
    cemPos = await prisma.position.create({
      data: {
        name: 'Customer Experience Manager',
        department: 'Customer Service',
      },
    });
  }

  // 3. Ensure Staff positions exist
  let ceoPos = await prisma.position.findFirst({ where: { name: 'Customer Experience Officer' } });
  if (!ceoPos) {
    ceoPos = await prisma.position.create({
      data: {
        name: 'Customer Experience Officer',
        department: 'Customer Service',
      },
    });
  }

  const defaultPasswordHash = await hashPassword('Password@123');

  // 4. Create/Upsert standard staff users for testing
  const staff1 = await prisma.user.upsert({
    where: { email: 'dawit.alemu@abyssinia.et' },
    update: {
      status: 'active',
      emailVerified: true,
      positionId: ceoPos.id,
      positionTitle: ceoPos.name,
      role: 'staff',
    },
    create: {
      employeeId: 'BOA-S001',
      fullName: 'Dawit Alemu',
      email: 'dawit.alemu@abyssinia.et',
      phone: '0911000001',
      password: defaultPasswordHash,
      positionId: ceoPos.id,
      positionTitle: ceoPos.name,
      branchName: 'Mengistu Worku Branch',
      role: 'staff',
      status: 'active',
      emailVerified: true,
    },
  });
  console.log('Staff 1 ready:', staff1.fullName, `(${staff1.email})`);

  const staff2 = await prisma.user.upsert({
    where: { email: 'sara.bekele@abyssinia.et' },
    update: {
      status: 'active',
      emailVerified: true,
      role: 'staff',
    },
    create: {
      employeeId: 'BOA-S002',
      fullName: 'Sara Bekele',
      email: 'sara.bekele@abyssinia.et',
      phone: '0911000002',
      password: defaultPasswordHash,
      positionTitle: 'Customer Service Officer',
      branchName: 'Mengistu Worku Branch',
      role: 'staff',
      status: 'active',
      emailVerified: true,
    },
  });
  console.log('Staff 2 ready:', staff2.fullName, `(${staff2.email})`);

  // 5. Create/Upsert dedicated Customer Experience Manager
  const cemUser = await prisma.user.upsert({
    where: { email: 'cem@abyssinia.et' },
    update: {
      role: 'customer_experience_manager',
      status: 'active',
      emailVerified: true,
      positionId: cemPos.id,
      positionTitle: cemPos.name,
    },
    create: {
      employeeId: 'BOA-CEM001',
      fullName: 'Bethlehem Tadesse',
      email: 'cem@abyssinia.et',
      phone: '0911999999',
      password: defaultPasswordHash,
      positionId: cemPos.id,
      positionTitle: cemPos.name,
      branchName: 'Mengistu Worku Branch',
      role: 'customer_experience_manager',
      status: 'active',
      emailVerified: true,
    },
  });
  console.log('CEM user ready:', cemUser.fullName, `(${cemUser.email})`);

  // 6. Ensure ManagerScope is assigned
  await prisma.managerScope.upsert({
    where: { userId: cemUser.id },
    update: {
      scopeType: 'branch',
      allowedPositions: [],
      allowedStaffIds: [],
      assignedById: mgr?.id || 'u_mgr',
    },
    create: {
      userId: cemUser.id,
      scopeType: 'branch',
      allowedPositions: [],
      allowedStaffIds: [],
      assignedById: mgr?.id || 'u_mgr',
    },
  });
  console.log('CEM scope configured for full branch oversight.');

  console.log('\n--- Provisioning Complete ---');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
