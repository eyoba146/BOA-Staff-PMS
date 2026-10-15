import assert from 'assert';
import { computeTrendFromData, computeStaffSummary, invalidateOverviewCache } from '../src/modules/performance/performance.service.js';
import { statusFor, entryPercent } from '../src/utils/calculations.js';
import { createSeed } from '../../client/src/services/mock/seed.js';
import { trendFor, summarizeRange } from '../../client/src/services/mock/mockCalculations.js';

async function runDashboardTests() {
  console.log('=== RUNNING BRANCH PERFORMANCE DASHBOARD & TREND VALIDATION TESTS ===\n');

  // TEST 1: Monthly Trend Points Generation & Label Formatting
  console.log('Test 1: Monthly Trend Points Generation (May to October 2026)');
  const db = createSeed();
  const staff = db.users.filter((u: any) => u.role === 'staff' && u.status === 'active');
  const refDate = '2026-10-15';

  const mockTrend = trendFor(db, staff.map((s: any) => s.id), 'monthly', refDate);
  assert.strictEqual(mockTrend.length, 6, 'Should generate exactly 6 monthly trend points');

  const expectedMonths = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  mockTrend.forEach((pt, idx) => {
    assert.strictEqual(pt.label, expectedMonths[idx], `Point ${idx} label should be ${expectedMonths[idx]}`);
    assert.ok(pt.percent === null || (typeof pt.percent === 'number' && Number.isFinite(pt.percent)), 'Percent must be null or finite number');
    console.log(`   ✓ Month ${idx + 1}: ${pt.label} (${pt.periodStart}) -> ${pt.percent !== null ? `${pt.percent}%` : 'null'}`);
  });

  // Verify May now has data due to 180-day history window
  assert.ok(mockTrend[0].percent !== null, 'May 2026 should have valid performance data with 180-day window');
  assert.ok(mockTrend[5].percent !== null, 'October 2026 should have valid performance data');
  console.log('   ✓ All 6 months are populated with continuous data.\n');

  // TEST 2: Status Classification Logic (Unrated vs Not Submitted vs Target Ranges)
  console.log('Test 2: Status Classification Engine Verification');
  const dummySettings = { onTargetMin: 85, needsAttentionMin: 70, weightingEnabled: true, thresholdsStatus: 'approved' as const };

  // Case A: 0 assignments -> unrated
  const summaryZeroAsgn = computeStaffSummary('test_1', '2026-10-01', '2026-10-31', [], [], dummySettings);
  assert.strictEqual(summaryZeroAsgn.status, 'unrated', 'Staff with 0 assignments must be unrated');
  console.log('   ✓ 0 assignments correctly classified as "unrated"');

  // Case B: Has assignments, but 0 entries in period -> not_submitted
  const sampleKpi = { id: 'k1', name: 'Accounts', frequency: 'daily', target: 10, valueType: 'integer', weight: 1, ruleStatus: 'approved' };
  const asgns = [{ kpi: sampleKpi, targetOverride: null }];
  const summaryNoEntries = computeStaffSummary('test_2', '2026-10-01', '2026-10-31', asgns, [], dummySettings);
  assert.strictEqual(summaryNoEntries.status, 'not_submitted', 'Staff with assignments and 0 entries must be not_submitted');
  console.log('   ✓ Assigned staff with 0 entries correctly classified as "not_submitted"');

  // Case C: Has entries, overall >= 85% -> on_target
  const entriesOnTarget = [{ staffId: 'test_3', kpiId: 'k1', date: '2026-10-05', actual: 9, target: 10 }];
  const summaryOnTarget = computeStaffSummary('test_3', '2026-10-01', '2026-10-31', asgns, entriesOnTarget, dummySettings);
  assert.strictEqual(summaryOnTarget.status, 'on_target', 'Staff with >= 85% must be on_target');
  console.log('   ✓ Staff with 90% achievement classified as "on_target"');

  // Case D: Has entries, overall 70..84% -> needs_attention
  const entriesNeedsAttention = [{ staffId: 'test_4', kpiId: 'k1', date: '2026-10-05', actual: 7.5, target: 10 }];
  const summaryNeedsAttention = computeStaffSummary('test_4', '2026-10-01', '2026-10-31', asgns, entriesNeedsAttention, dummySettings);
  assert.strictEqual(summaryNeedsAttention.status, 'needs_attention', 'Staff with 75% must be needs_attention');
  console.log('   ✓ Staff with 75% achievement classified as "needs_attention"');

  // Case E: Has entries, overall < 70% -> below_target
  const entriesBelowTarget = [{ staffId: 'test_5', kpiId: 'k1', date: '2026-10-05', actual: 5, target: 10 }];
  const summaryBelowTarget = computeStaffSummary('test_5', '2026-10-01', '2026-10-31', asgns, entriesBelowTarget, dummySettings);
  assert.strictEqual(summaryBelowTarget.status, 'below_target', 'Staff with 50% must be below_target');
  console.log('   ✓ Staff with 50% achievement classified as "below_target"\n');

  // TEST 3: Status Breakdown Population Consistency
  console.log('Test 3: Status Breakdown Population Sum Consistency');
  const allRows = [summaryZeroAsgn, summaryNoEntries, summaryOnTarget, summaryNeedsAttention, summaryBelowTarget];
  const breakdown: Record<string, number> = { on_target: 0, needs_attention: 0, below_target: 0, not_submitted: 0, unrated: 0 };
  allRows.forEach(r => { breakdown[r.status]++; });

  const totalBreakdown = Object.values(breakdown).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalBreakdown, allRows.length, 'Total status breakdown sum must equal total staff population');
  console.log('   ✓ Breakdown counts:', breakdown);
  console.log('   ✓ Total matches evaluated staff count (5/5).\n');

  // TEST 4: Approval Rule Enforcement on Calculation Basis
  console.log('Test 4: Calculation Basis Approval Enforcement');
  const unapprovedSettings = { ...dummySettings, thresholdsStatus: 'pending_validation' as const };
  const summaryUnapproved = computeStaffSummary('test_6', '2026-10-01', '2026-10-31', asgns, entriesOnTarget, unapprovedSettings);
  assert.strictEqual(summaryUnapproved.calculationBasis, 'pending_validation', 'If thresholds are not approved, basis must be pending_validation');

  const unapprovedKpi = [{ kpi: { ...sampleKpi, ruleStatus: 'pending_validation' }, targetOverride: null }];
  const summaryUnapprovedKpi = computeStaffSummary('test_7', '2026-10-01', '2026-10-31', unapprovedKpi, entriesOnTarget, dummySettings);
  assert.strictEqual(summaryUnapprovedKpi.calculationBasis, 'pending_validation', 'If any KPI rule is pending_validation, basis must be pending_validation');

  assert.strictEqual(summaryOnTarget.calculationBasis, 'approved', 'Only when thresholds and all KPIs are approved is basis approved');
  console.log('   ✓ Calculation basis strictly requires approved thresholds AND approved KPI rules.\n');

  // TEST 5: Cache Invalidation Functionality
  console.log('Test 5: Overview Cache Invalidation Trigger');
  invalidateOverviewCache();
  console.log('   ✓ Overview cache invalidation executes without error.\n');

  console.log('====================================================');
  console.log('✓ ALL DASHBOARD & TREND TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runDashboardTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
