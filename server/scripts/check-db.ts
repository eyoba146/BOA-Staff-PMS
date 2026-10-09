import { prisma } from '../src/config/database.js';

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, employeeId: true, role: true, status: true, positionTitle: true } });
  const positions = await prisma.position.findMany();
  const kpis = await prisma.kpi.findMany();
  const settings = await prisma.systemSettings.findMany();

  console.log('Users count:', users.length);
  users.forEach((u: any) => console.log(`- ${u.id}: ${u.fullName} (${u.email}) [${u.role}/${u.status}] EmpID: ${u.employeeId} Pos: ${u.positionTitle}`));
  console.log('Positions count:', positions.length, positions.map((p: any) => p.name));
  console.log('KPIs count:', kpis.length);
  console.log('Settings:', settings);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
