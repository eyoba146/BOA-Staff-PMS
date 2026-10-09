import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Supabase database with production Bank of Abyssinia branch dataset...');

  // 1. System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {
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
  console.log('✓ SystemSettings verified');

  // 2. Positions (Clean official banking positions without "(demo)")
  const officialPositions = [
    { name: 'Customer Service Officer', isActive: true },
    { name: 'Relationship Officer', isActive: true },
    { name: 'Cash Officer', isActive: true },
    { name: 'Branch Accountant', isActive: true },
    { name: 'Junior Banking Clerk', isActive: false },
  ];

  for (const pos of officialPositions) {
    await prisma.position.upsert({
      where: { name: pos.name },
      update: { isActive: pos.isActive },
      create: { name: pos.name, isActive: pos.isActive },
    });
  }

  // Clean up legacy demo position names from database if present
  const legacyPositions = [
    'Customer Service Officer (demo)',
    'Relationship Officer (demo)',
    'Cash Officer (demo)',
    'Branch Accountant (demo)',
    'Junior Banking Clerk (demo)',
  ];

  for (const leg of legacyPositions) {
    const cleanName = leg.replace(' (demo)', '');
    const cleanPos = await prisma.position.findUnique({ where: { name: cleanName } });
    if (cleanPos) {
      await prisma.user.updateMany({
        where: { positionTitle: leg },
        data: { positionTitle: cleanName, positionId: cleanPos.id },
      });
      await prisma.position.deleteMany({ where: { name: leg } });
    }
  }
  console.log('✓ Official branch positions verified & legacy demo positions cleaned');

  // 3. Official Staff Accounts
  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  const csoPos = await prisma.position.findUnique({ where: { name: 'Customer Service Officer' } });
  const roPos = await prisma.position.findUnique({ where: { name: 'Relationship Officer' } });
  const acctPos = await prisma.position.findUnique({ where: { name: 'Branch Accountant' } });

  const users = [
    {
      id: 'u_mgr',
      employeeId: 'BOA-M001',
      referenceId: 'REG-M001',
      fullName: 'Abebe Kebede',
      email: 'abebe.kebede@abyssinia.et',
      phone: '+251911234567',
      positionId: null,
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
      positionId: csoPos?.id ?? null,
      positionTitle: 'Customer Service Officer',
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
      positionId: roPos?.id ?? null,
      positionTitle: 'Relationship Officer',
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
      positionId: acctPos?.id ?? null,
      positionTitle: 'Branch Accountant',
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
      positionId: csoPos?.id ?? null,
      positionTitle: 'Customer Service Officer',
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
        positionId: u.positionId,
        positionTitle: u.positionTitle,
        status: u.status,
        role: u.role,
        emailVerified: u.emailVerified,
      },
      create: u,
    });
  }
  console.log('✓ Official branch staff accounts seeded');

  // 4. Official Bank of Abyssinia Branch KPIs
  const initialKpis = [
    {
      id: 'kpi_acct_open',
      name: 'Account Opening & Onboarding',
      description: 'Daily new retail savings, current, and corporate deposit accounts opened with complete KYC verification.',
      unit: 'accounts',
      valueType: 'integer' as const,
      target: 10,
      frequency: 'daily' as const,
      weight: 25,
      calculationRule: 'Target achievement ratio = (Actual Accounts / Target) * 100',
      ruleStatus: 'pending_validation' as const,
      isActive: true,
    },
    {
      id: 'kpi_dep_mob',
      name: 'Deposit Mobilization Volume',
      description: 'Net fresh deposit mobilization achieved through individual client and commercial banking relationships.',
      unit: 'ETB',
      valueType: 'currency' as const,
      target: 50000,
      frequency: 'daily' as const,
      weight: 30,
      calculationRule: 'Target achievement ratio = (Actual ETB / Target) * 100',
      ruleStatus: 'pending_validation' as const,
      isActive: true,
    },
    {
      id: 'kpi_tx_proc',
      name: 'Counter Transactions Serviced',
      description: 'Daily counter and core banking customer transactions serviced adhering to branch SLA standards.',
      unit: 'transactions',
      valueType: 'integer' as const,
      target: 40,
      frequency: 'daily' as const,
      weight: 20,
      calculationRule: 'Target achievement ratio = (Actual Transactions / Target) * 100',
      ruleStatus: 'pending_validation' as const,
      isActive: true,
    },
    {
      id: 'kpi_service_qual',
      name: 'Service Quality & Audit Compliance',
      description: 'Periodic audit checklist score, error-free voucher processing, and adherence to Bank of Abyssinia operational guidelines.',
      unit: '%',
      valueType: 'percentage' as const,
      target: 95,
      frequency: 'weekly' as const,
      weight: 15,
      calculationRule: 'Audit score percentage assessed per operational cycle',
      ruleStatus: 'pending_validation' as const,
      isActive: true,
    },
    {
      id: 'kpi_digital_conv',
      name: 'Digital Banking Conversion',
      description: 'Successful conversion of branch customers onto BoA Mobile Banking, Internet Banking, and Debit Card products.',
      unit: 'users',
      valueType: 'integer' as const,
      target: 15,
      frequency: 'daily' as const,
      weight: 10,
      calculationRule: 'Target achievement ratio = (Actual Users / Target) * 100',
      ruleStatus: 'pending_validation' as const,
      isActive: true,
    },
  ];

  for (const k of initialKpis) {
    await prisma.kpi.upsert({
      where: { id: k.id },
      update: {
        name: k.name,
        description: k.description,
        unit: k.unit,
        valueType: k.valueType,
        target: k.target,
        frequency: k.frequency,
        weight: k.weight,
        calculationRule: k.calculationRule,
        ruleStatus: k.ruleStatus,
        isActive: k.isActive,
      },
      create: k,
    });
  }
  console.log('✓ Bank of Abyssinia Branch KPIs seeded');

  // 5. KPI Assignments for Active Staff Members
  const activeStaffIds = ['u_s01', 'u_s02'];
  const assignedKpiIds = ['kpi_acct_open', 'kpi_dep_mob', 'kpi_tx_proc', 'kpi_service_qual', 'kpi_digital_conv'];

  for (const staffId of activeStaffIds) {
    for (const kpiId of assignedKpiIds) {
      await prisma.kpiAssignment.upsert({
        where: { kpiId_staffId: { kpiId, staffId } },
        update: {},
        create: {
          kpiId,
          staffId,
        },
      });
    }
  }
  console.log('✓ Staff KPI assignments verified');

  // 6. Branch Announcements
  const announcements = [
    {
      id: 'ann_welcome',
      title: 'Branch Performance Management System Launch',
      body: 'Welcome to the Bank of Abyssinia Finfine Main Branch Staff Performance Management System. All branch officers are requested to track operational milestones and record daily achievement metrics before 5:00 PM EAT.',
      category: 'notice' as const,
      status: 'published' as const,
      pinned: true,
      authorId: 'u_mgr',
      publishedAt: new Date(),
    },
    {
      id: 'ann_meeting',
      title: 'Weekly Operational Review Meeting',
      body: 'Branch management will hold a brief alignment meeting every Monday at 8:15 AM in the branch conference room to review previous cycle milestones and digital adoption performance.',
      category: 'meeting' as const,
      status: 'published' as const,
      pinned: false,
      authorId: 'u_mgr',
      publishedAt: new Date(),
    },
  ];

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      update: {
        title: a.title,
        body: a.body,
        category: a.category,
        status: a.status,
        pinned: a.pinned,
      },
      create: a,
    });
  }
  console.log('✓ Branch announcements seeded');

  // 7. Branch Conversation
  const existingBranchConv = await prisma.conversation.findFirst({
    where: { type: 'branch' },
  });

  if (!existingBranchConv) {
    const branchConv = await prisma.conversation.create({
      data: {
        type: 'branch',
        title: 'Finfine Main Branch Channel',
        participants: {
          create: [
            { userId: 'u_mgr' },
            { userId: 'u_s01' },
            { userId: 'u_s02' },
          ],
        },
      },
    });

    await prisma.chatMessage.create({
      data: {
        conversationId: branchConv.id,
        senderId: 'u_mgr',
        body: 'Welcome team! Use this secure branch channel for operational coordination, shift updates, and milestone announcements.',
      },
    });
    console.log('✓ Branch group conversation and inaugural message created');
  }

  console.log('Bank of Abyssinia database initialization completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
