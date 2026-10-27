import { prisma } from '../src/config/database.js';

interface BoaMetric {
  code: string;
  name: string;
  valueType: 'currency' | 'integer' | 'decimal';
  unit: string;
  quarterly: number;
  monthly: number;
  weekly: number;
  daily: number | null;
  yearly: number;
  description: string;
}

const METRICS: BoaMetric[] = [
  { code: '1', name: 'LCY Deposit', valueType: 'currency', unit: 'ETB', quarterly: 17875000, monthly: 5958333, weekly: 1489583, daily: 297917, yearly: 71500000, description: 'Local Currency (ETB) Total Deposit volume mobilization target.' },
  { code: '2', name: 'IFB Deposit', valueType: 'currency', unit: 'ETB', quarterly: 692308, monthly: 230769, weekly: 57692, daily: 11538, yearly: 2769232, description: 'Interest-Free Banking (IFB) Deposit mobilization target.' },
  { code: '3', name: 'FCY', valueType: 'currency', unit: 'USD', quarterly: 55797, monthly: 18599, weekly: 4650, daily: 930, yearly: 223188, description: 'Foreign Currency (FCY) overall generation and inflow.' },
  { code: '3.1', name: 'MTO', valueType: 'currency', unit: 'USD', quarterly: 3500, monthly: 1167, weekly: 292, daily: 58, yearly: 14000, description: 'Money Transfer Operator (MTO) remittance inflows.' },
  { code: '3.2', name: 'CASH', valueType: 'currency', unit: 'USD', quarterly: 1552, monthly: 517, weekly: 129, daily: 26, yearly: 6208, description: 'Over-the-counter Foreign Currency cash exchange.' },
  { code: '3.3', name: 'SWIFT', valueType: 'currency', unit: 'USD', quarterly: 10244, monthly: 3415, weekly: 854, daily: 171, yearly: 40976, description: 'Direct SWIFT foreign transfers and cross-border remittances.' },
  { code: '3.4', name: 'CARD', valueType: 'currency', unit: 'USD', quarterly: 501, monthly: 167, weekly: 42, daily: 8, yearly: 2004, description: 'International payment card transactions and POS settlements.' },
  { code: '3.5', name: 'EXPORT', valueType: 'currency', unit: 'USD', quarterly: 40000, monthly: 13333, weekly: 3333, daily: null, yearly: 160000, description: 'Export trade document settlements and proceeds.' },
  { code: '4', name: 'HVC >1Mln', valueType: 'integer', unit: 'Accounts', quarterly: 12, monthly: 4, weekly: 1, daily: null, yearly: 48, description: 'High-Value Customer (HVC) accounts opened (> 1,000,000 ETB).' },
  { code: '5', name: 'CB >1,000', valueType: 'integer', unit: 'Accounts', quarterly: 153, monthly: 51, weekly: 13, daily: 3, yearly: 612, description: 'Conventional Banking Customer accounts opened (> 1,000 ETB).' },
  { code: '6', name: 'IFB CB', valueType: 'integer', unit: 'Accounts', quarterly: 20, monthly: 7, weekly: 2, daily: null, yearly: 80, description: 'Interest-Free Banking Customer accounts opened.' },
  { code: '7', name: 'CARD', valueType: 'integer', unit: 'Cards', quarterly: 299, monthly: 100, weekly: 25, daily: 5, yearly: 1196, description: 'Debit card issuance and activation.' },
  { code: '8', name: 'MB', valueType: 'integer', unit: 'Subscribers', quarterly: 275, monthly: 92, weekly: 23, daily: 5, yearly: 1100, description: 'Mobile Banking (MB) user onboarding and registration.' },
  { code: '9', name: 'AO', valueType: 'decimal', unit: 'Accounts', quarterly: 5, monthly: 2, weekly: 0.4, daily: null, yearly: 20, description: 'Account Opening (Specialized / Corporate portfolio).' },
  { code: '10', name: 'MERCHANT', valueType: 'decimal', unit: 'Merchants', quarterly: 5, monthly: 2, weekly: 0.4, daily: null, yearly: 20, description: 'Merchant acquiring, POS terminal, and QR deployment.' },
];

async function seedBoaKpis() {
  console.log('--- Seeding Bank of Abyssinia Scorecard Metrics ---');

  for (const m of METRICS) {
    const existing = await prisma.kpi.findFirst({
      where: {
        OR: [
          { name: { equals: m.name, mode: 'insensitive' } },
          { code: m.code },
        ],
      },
    });

    const target = m.daily !== null ? m.daily : m.monthly;
    const frequency = m.daily !== null ? 'daily' : 'monthly';

    if (existing) {
      const updated = await prisma.kpi.update({
        where: { id: existing.id },
        data: {
          code: m.code,
          name: m.name,
          unit: m.unit,
          valueType: m.valueType,
          target,
          frequency,
          dailyTarget: m.daily,
          weeklyTarget: m.weekly,
          monthlyTarget: m.monthly,
          quarterlyTarget: m.quarterly,
          yearlyTarget: m.yearly,
          description: m.description,
          isActive: true,
        },
      });
      console.log(`Updated KPI [${updated.code}] ${updated.name}`);
    } else {
      const created = await prisma.kpi.create({
        data: {
          code: m.code,
          name: m.name,
          unit: m.unit,
          valueType: m.valueType,
          target,
          frequency,
          dailyTarget: m.daily,
          weeklyTarget: m.weekly,
          monthlyTarget: m.monthly,
          quarterlyTarget: m.quarterly,
          yearlyTarget: m.yearly,
          description: m.description,
          ruleStatus: 'approved',
          isActive: true,
        },
      });
      console.log(`Created KPI [${created.code}] ${created.name}`);
    }
  }

  console.log('--- Scorecard Seeding Complete ---');
}

seedBoaKpis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
