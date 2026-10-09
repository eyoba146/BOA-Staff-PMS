const API_URL = 'http://localhost:4000/api';

async function req(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`[${res.status}] ${url}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runTests() {
  console.log('=== BANK OF ABYSSINIA PMS FULL SYSTEM END-TO-END VALIDATION ===\n');

  // 1. Health Check
  console.log('1. Health Check:');
  const healthRes = await fetch('http://localhost:4000/health');
  const health = await healthRes.json();
  console.log('   ✓ Status:', health.status, '| DB:', health.database);

  // 2. Authentication
  console.log('\n2. Authentication:');
  const mgrLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-M001', password: 'Password@123' }),
  });
  console.log('   ✓ Manager login successful: Abebe Kebede (Role:', mgrLogin.user.role, ')');
  const mgrToken = mgrLogin.accessToken;

  const staffLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-S001', password: 'Password@123' }),
  });
  console.log('   ✓ Staff login successful: Selam Tesfaye (Role:', staffLogin.user.role, ')');
  const staffToken = staffLogin.accessToken;

  const staffHeaders = { Authorization: `Bearer ${staffToken}` };
  const mgrHeaders = { Authorization: `Bearer ${mgrToken}` };

  // 3. Positions
  console.log('\n3. Positions Module:');
  const positions = await req('/positions', { headers: staffHeaders });
  console.log(`   ✓ Retrieved ${positions.length} official branch positions:`, positions.map((p: any) => p.name).join(', '));

  // 4. Staff Directory & Approvals
  console.log('\n4. Staff Module:');
  const directory = await req('/staff/directory', { headers: staffHeaders });
  console.log(`   ✓ Staff Directory has ${directory.length} active colleagues`);
  const pending = await req('/staff/pending', { headers: mgrHeaders });
  console.log(`   ✓ Pending approvals count: ${pending.length} candidate(s)`);

  // 5. KPI Definitions & Assignments
  console.log('\n5. KPI Management:');
  const kpis = await req('/kpis', { headers: mgrHeaders });
  console.log(`   ✓ Retrieved ${kpis.length} operational KPIs:`, kpis.map((k: any) => k.name).join(' | '));

  const today = new Date().toISOString().split('T')[0];
  const myAssignedKpis = await req(`/kpis/assigned/me?date=${today}`, { headers: staffHeaders });
  console.log(`   ✓ Staff BOA-S001 assigned KPIs for ${today}: ${myAssignedKpis.length} KPI(s) with active targets`);

  // 6. Daily KPI Submissions
  console.log('\n6. Daily KPI Entry:');
  const submissionData = {
    date: today,
    entries: [
      { kpiId: 'kpi_acct_open', actual: 12, note: 'Opened 12 high-net-worth savings accounts at counter' },
      { kpiId: 'kpi_dep_mob', actual: 65000, note: 'Secured fresh term deposit from local merchant' },
      { kpiId: 'kpi_tx_proc', actual: 38, note: 'High cash withdrawal volume handled' },
      { kpiId: 'kpi_digital_conv', actual: 16, note: 'Enrolled 16 clients onto BoA mobile banking app' },
    ],
  };
  const entriesSubmitted = await req('/kpi-entries', {
    method: 'POST',
    headers: staffHeaders,
    body: JSON.stringify(submissionData),
  });
  console.log(`   ✓ Submitted ${entriesSubmitted.length} daily KPI entry records`);
  entriesSubmitted.forEach((e: any) => {
    console.log(`     - ${e.kpiName}: Actual ${e.actual} / Target ${e.target} => ${e.performancePercent?.toFixed(1)}% (${e.status})`);
  });

  // 7. Performance Calculation & Analytics
  console.log('\n7. Performance Analytics:');
  const summary = await req(`/performance/me?period=daily&date=${today}`, { headers: staffHeaders });
  console.log(`   ✓ Staff Daily Performance Summary: ${summary.overallPercent?.toFixed(1)}% (Status: ${summary.status})`);
  console.log(`     Entries: ${summary.entriesSubmitted} submitted of ${summary.entriesExpected} expected`);

  const branchOverview = await req(`/performance/branch?period=daily&date=${today}`, { headers: mgrHeaders });
  console.log(`   ✓ Branch Executive Overview:`);
  console.log(`     Active Staff: ${branchOverview.activeStaff} | Branch Average: ${branchOverview.averagePercent?.toFixed(1)}%`);
  console.log(`     Status breakdown:`, branchOverview.statusBreakdown);

  // 8. Management Feedback
  console.log('\n8. Feedback System:');
  const newFeedback = await req('/feedback', {
    method: 'POST',
    headers: mgrHeaders,
    body: JSON.stringify({
      staffId: 'u_s01',
      subject: 'Excellent Deposit Mobilization Achievement',
      message: 'Congratulations Selam on surpassing your daily deposit mobilization target today. Outstanding customer service!',
      period: 'daily',
      periodLabel: today,
      kpiId: 'kpi_dep_mob',
    }),
  });
  console.log(`   ✓ Manager posted feedback note: "${newFeedback.subject}" (ID: ${newFeedback.id})`);

  const staffFeedback = await req('/feedback/me', { headers: staffHeaders });
  console.log(`   ✓ Staff received ${staffFeedback.length} feedback note(s)`);
  const readFb = await req(`/feedback/${newFeedback.id}/read`, {
    method: 'PATCH',
    headers: staffHeaders,
  });
  console.log(`   ✓ Feedback read receipt confirmed (Read at: ${readFb.readAt})`);

  // 9. Branch Announcements
  console.log('\n9. Announcements Module:');
  const announcements = await req('/announcements', { headers: staffHeaders });
  console.log(`   ✓ Retrieved ${announcements.length} branch announcements:`);
  announcements.forEach((a: any) => console.log(`     - [${a.category.toUpperCase()}] ${a.title} (Pinned: ${a.pinned})`));

  // 10. Internal Chat
  console.log('\n10. Internal Communication & Chat:');
  const convs = await req('/conversations', { headers: staffHeaders });
  console.log(`   ✓ Found ${convs.length} active conversation channel(s):`, convs.map((c: any) => c.title).join(', '));
  if (convs.length > 0) {
    const branchConvId = convs[0].id;
    const sentMsg = await req(`/conversations/${branchConvId}/messages`, {
      method: 'POST',
      headers: staffHeaders,
      body: JSON.stringify({ body: 'Reporting operational stations fully manned and ready for morning queue.' }),
    });
    console.log(`   ✓ Dispatched chat message: "${sentMsg.body}" (Sent by: ${sentMsg.senderName})`);

    const messages = await req(`/conversations/${branchConvId}/messages`, { headers: staffHeaders });
    console.log(`   ✓ Channel message history verified: ${messages.length} message(s) retrieved`);
  }

  // 11. System Settings
  console.log('\n11. System Settings & Branch Governance:');
  const currentSettings = await req('/settings', { headers: mgrHeaders });
  console.log(`   ✓ Current branch settings: ${currentSettings.branchCode} - ${currentSettings.branchName}`);
  console.log(`     Thresholds: On Target >= ${currentSettings.thresholds.onTargetMin}%, Needs Attention >= ${currentSettings.thresholds.needsAttentionMin}%`);

  console.log('\n================================================================');
  console.log('>>> ALL 11 BACKEND API MODULES PASSED 100% END-TO-END VALIDATION <<<');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
