import assert from 'assert';
import {
  calculateCampaignAchievement,
  deriveCampaignStatus,
} from '../src/modules/campaign/campaign.service.js';
import {
  computeStaffSummary,
  computeTrendFromData,
} from '../src/modules/performance/performance.service.js';
import { statusFor, entryPercent } from '../src/utils/calculations.js';
import { renderCommunicationEmail } from '../src/utils/emailTemplates.js';

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('   BOA PMS: COMPREHENSIVE AUTOMATED VERIFICATION SUITE         ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // -------------------------------------------------------------
  // SUITE 1: CAMPAIGN ACHIEVEMENT CALCULATIONS & EDGE CASES
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Campaign Achievement Calculation Engine ---');

  test('Calculates positive numeric plan & actual correctly: 20M plan, 14.5M actual -> 72.5%', () => {
    const ach = calculateCampaignAchievement(14500000, 20000000);
    assert.strictEqual(ach, 72.5, 'Should produce exact 72.5%');
    assert.strictEqual(Math.round(ach!), 73, 'Rounds to 73%');
  });

  test('Calculates positive numeric plan & actual correctly: 150 plan, 112 actual -> 74.7%', () => {
    const ach = calculateCampaignAchievement(112, 150);
    assert.strictEqual(ach, 74.7, 'Should produce 74.7%');
    assert.strictEqual(Math.round(ach!), 75, 'Rounds to 75%');
  });

  test('Handles missing actual result safely: actual = null -> achievement = null', () => {
    const ach = calculateCampaignAchievement(null, 10000000);
    assert.strictEqual(ach, null, 'Unentered actual must not fabricate achievement percentage');
  });

  test('Handles zero target safely without division by zero: target = 0 -> achievement = 0', () => {
    const ach = calculateCampaignAchievement(500, 0);
    assert.strictEqual(ach, 0, 'Zero target should produce 0 without NaN or throwing');
  });

  test('Handles negative or invalid target values safely', () => {
    const ach = calculateCampaignAchievement(500, -100);
    assert.strictEqual(ach, 0, 'Negative target must produce 0');
  });

  // -------------------------------------------------------------
  // SUITE 2: CAMPAIGN STATUS ENGINE
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Campaign Status Rules ---');

  test('Preserves explicit manager status selection (planned, in_progress, completed, cancelled)', () => {
    assert.strictEqual(deriveCampaignStatus('in_progress', '2026-01-01', '2026-01-10'), 'in_progress');
    assert.strictEqual(deriveCampaignStatus('completed', '2026-01-01', '2026-12-31'), 'completed');
    assert.strictEqual(deriveCampaignStatus('cancelled', '2026-01-01', '2026-12-31'), 'cancelled');
    assert.strictEqual(deriveCampaignStatus('planned', '2026-01-01', '2026-12-31'), 'planned');
  });

  test('Automatically derives status from start/end dates when unspecified', () => {
    const futureStart = '2099-01-01';
    const futureEnd = '2099-03-31';
    assert.strictEqual(deriveCampaignStatus(undefined, futureStart, futureEnd), 'planned');

    const pastStart = '2020-01-01';
    const pastEnd = '2020-03-31';
    assert.strictEqual(deriveCampaignStatus(undefined, pastStart, pastEnd), 'completed');
  });

  // -------------------------------------------------------------
  // SUITE 3: COMMUNICATION & FEEDBACK EMAIL TEMPLATE RENDERING
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Multi-channel Communication Templates ---');

  test('Renders feedback communication email with Bank of Abyssinia branding and styling', () => {
    const html = renderCommunicationEmail({
      recipientName: 'Abebe Kebede',
      senderName: 'Branch Manager',
      type: 'feedback',
      subject: 'Weekly KPI Achievement Review',
      message: 'Great consistency on daily transaction logging. Keep monitoring deposit targets.',
      periodLabel: 'October 2026',
      branchName: 'Finfine Main Branch',
    });
    assert.ok(html.includes('BANK OF ABYSSINIA'), 'Must contain official bank identity');
    assert.ok(html.includes('PERFORMANCE FEEDBACK'), 'Must contain feedback badge');
    assert.ok(html.includes('Abebe Kebede'), 'Must address recipient');
    assert.ok(html.includes('Weekly KPI Achievement Review'), 'Must include subject');
    assert.ok(html.includes('Confidentiality Notice'), 'Must maintain confidentiality notice');
  });

  test('Renders warning communication email with formal caution tone', () => {
    const html = renderCommunicationEmail({
      recipientName: 'Chala Tadesse',
      senderName: 'Branch Manager',
      type: 'warning',
      subject: 'Unsubmitted Daily KPI Figures',
      message: 'Notice regarding unrecorded daily figures for 3 consecutive days.',
      branchName: 'Finfine Main Branch',
    });
    assert.ok(html.includes('FORMAL NOTICE'), 'Must contain warning badge');
    assert.ok(html.includes('#dc2626'), 'Must use red accent styling for warning');
  });

  test('Renders appreciation communication email with recognition badge and emerald tone', () => {
    const html = renderCommunicationEmail({
      recipientName: 'Sara Mengistu',
      senderName: 'Branch Manager',
      type: 'appreciation',
      subject: 'Outstanding BOA Pay Merchant Drive',
      message: 'Commendation for surpassing retail merchant onboarding targets by 140%.',
    });
    assert.ok(html.includes('STAFF APPRECIATION'), 'Must contain appreciation badge');
    assert.ok(html.includes('#059669'), 'Must use emerald accent styling for appreciation');
  });

  // -------------------------------------------------------------
  // SUITE 4: KPI CLASSIFICATION & AGGREGATION INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Individual vs Branch KPI Calculations ---');

  const settings = {
    onTargetMin: 85,
    needsAttentionMin: 70,
    weightingEnabled: true,
    thresholdsStatus: 'approved' as const,
  };

  test('Classifies 92% as "on_target"', () => {
    assert.strictEqual(statusFor(92, 85, 70), 'on_target');
  });

  test('Classifies 78% as "needs_attention"', () => {
    assert.strictEqual(statusFor(78, 85, 70), 'needs_attention');
  });

  test('Classifies 64% as "below_target"', () => {
    assert.strictEqual(statusFor(64, 85, 70), 'below_target');
  });

  test('Distinguishes unrated staff (0 assignments) from not_submitted staff', () => {
    const unratedSummary = computeStaffSummary('u_unrated', '2026-10-01', '2026-10-31', [], [], settings);
    assert.strictEqual(unratedSummary.status, 'unrated', 'Employee with 0 assigned KPIs must be unrated');

    const fakeKpi = { id: 'k1', name: 'Test', target: 100, valueType: 'integer', frequency: 'daily', isActive: true, ruleStatus: 'approved', weight: 1 };
    const notSubmittedSummary = computeStaffSummary('u_notsub', '2026-10-01', '2026-10-31', [{ kpiId: 'k1', kpi: fakeKpi }], [], settings);
    assert.strictEqual(notSubmittedSummary.status, 'not_submitted', 'Employee with assigned KPI but 0 entries must be not_submitted');
  });

  // -------------------------------------------------------------
  // SUITE 5: TREND DATA CONTINUITY & NULL SAFETY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Branch Performance Trend Continuity ---');

  test('Generates exactly 6 monthly trend points without NaN or disconnected labels', () => {
    const staffIds = ['u_staff_1'];
    const fakeKpi = { id: 'k1', name: 'Test', target: 100, valueType: 'integer', frequency: 'daily', isActive: true, ruleStatus: 'approved', weight: 1 };
    const assignments = [{ staffId: 'u_staff_1', kpiId: 'k1', kpi: fakeKpi }];
    const entries = [
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-05-15', actual: 90, target: 100 },
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-06-15', actual: 88, target: 100 },
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-07-15', actual: 92, target: 100 },
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-08-15', actual: 95, target: 100 },
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-09-15', actual: 91, target: 100 },
      { staffId: 'u_staff_1', kpiId: 'k1', date: '2026-10-15', actual: 94, target: 100 },
    ];

    const trend = computeTrendFromData(staffIds, 'monthly', '2026-10-15', assignments, entries, false, 6);
    assert.strictEqual(trend.length, 6, 'Must generate exactly 6 points');

    const expectedLabels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    trend.forEach((pt, idx) => {
      assert.strictEqual(pt.label, expectedLabels[idx], `Point ${idx} should have label ${expectedLabels[idx]}`);
      assert.ok(typeof pt.percent === 'number' && Number.isFinite(pt.percent), 'Percent must be a finite number');
    });
  });

  console.log('\n================================================================');
  console.log(`   ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY! `);
  console.log('================================================================\n');
}

runComprehensiveVerification().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
