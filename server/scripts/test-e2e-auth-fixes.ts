import { prisma } from '../src/config/database.js';

const API_URL = 'http://localhost:4000/api';

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runScenarioA() {
  console.log('\n--- SCENARIO A: Resume Registration Verification & Lifecycle ---');
  const uniqueNum = Date.now().toString().slice(-6);
  const testEmail = `candidate.${uniqueNum}@abyssinia.et`;
  const testPassword = 'Password@Valid123';

  // 1. Register candidate
  console.log('1. Registering candidate:', testEmail);
  const regRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Test Candidate ${uniqueNum}`,
      email: testEmail,
      phone: '0911223344',
      position: 'Customer Service Officer',
      password: testPassword,
    }),
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  }
  console.log('   ✓ Registered successfully. Reference ID:', regRes.data.referenceId);
  console.log('   ✓ Authoritative timestamps returned:', {
    expiresAt: regRes.data.expiresAt,
    resendAfter: regRes.data.resendAfter,
    serverTime: regRes.data.serverTime,
  });

  // 2. Confirm candidate persisted in PostgreSQL
  const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!dbUser) throw new Error('User not persisted in PostgreSQL!');
  if (dbUser.status !== 'pending_email_verification') {
    throw new Error(`Unexpected user status in DB: ${dbUser.status}`);
  }
  console.log('   ✓ Verified DB record status:', dbUser.status, '| emailVerified:', dbUser.emailVerified);

  // 3. User closes website & attempts to log in
  console.log('2. User attempts to log in before verifying email:');
  const loginRes = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testEmail,
      password: testPassword,
    }),
  });

  if (loginRes.status !== 403 || loginRes.data.code !== 'EMAIL_NOT_VERIFIED') {
    throw new Error(`Expected 403 EMAIL_NOT_VERIFIED, got [${loginRes.status}]: ${JSON.stringify(loginRes.data)}`);
  }
  console.log('   ✓ Login rejected with 403 EMAIL_NOT_VERIFIED');
  console.log('   ✓ Error payload carries recovery data:', loginRes.data.fieldErrors);

  // 4. User attempts to re-register with existing email
  console.log('3. User attempts to submit registration form again with same email:');
  const reRegRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Test Candidate ${uniqueNum}`,
      email: testEmail,
      phone: '0911223344',
      position: 'Customer Service Officer',
      password: testPassword,
    }),
  });

  if (reRegRes.status !== 409 || reRegRes.data.code !== 'EMAIL_VERIFICATION_PENDING') {
    throw new Error(`Expected 409 EMAIL_VERIFICATION_PENDING, got [${reRegRes.status}]: ${JSON.stringify(reRegRes.data)}`);
  }
  console.log('   ✓ Re-registration recognized existing unverified account with code: EMAIL_VERIFICATION_PENDING');

  // 5. Follow recovery path: retrieve verification status
  console.log('4. Following recovery path -> GET /api/auth/verification-status:');
  const statusRes = await api(`/auth/verification-status?identifier=${encodeURIComponent(testEmail)}`);
  if (!statusRes.ok) {
    throw new Error(`Verification status lookup failed: ${JSON.stringify(statusRes.data)}`);
  }
  console.log('   ✓ Status lookup response:', {
    status: statusRes.data.status,
    hasActiveCode: statusRes.data.hasActiveCode,
    expiresAt: statusRes.data.expiresAt,
    resendAfter: statusRes.data.resendAfter,
    canResend: statusRes.data.canResend,
  });

  // 6. Retrieve active verification code from DB (simulating receipt from Brevo)
  const activeCode = await prisma.verificationCode.findFirst({
    where: { target: testEmail, purpose: 'email_verification', consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!activeCode) throw new Error('No active verification code in DB!');

  // We need the raw code. For verification in test, let's generate a known code or verify hash
  // Let's resend a code to test resend or use verification
  console.log('5. Testing verification with invalid code:');
  const invalidVerify = await api('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, code: '000000' }),
  });
  if (invalidVerify.status !== 400 || invalidVerify.data.code !== 'INVALID_CODE') {
    throw new Error(`Expected 400 INVALID_CODE, got: ${JSON.stringify(invalidVerify.data)}`);
  }
  console.log('   ✓ Invalid code rejected with 400 INVALID_CODE');

  // Let's test demo code bypass rejection
  console.log('6. Confirming demo code 123456 is rejected:');
  const demoCodeVerify = await api('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, code: '123456' }),
  });
  if (demoCodeVerify.status !== 400 || demoCodeVerify.data.code !== 'INVALID_CODE') {
    throw new Error(`Demo code 123456 was NOT rejected! Got: ${JSON.stringify(demoCodeVerify.data)}`);
  }
  console.log('   ✓ Demo code 123456 successfully rejected! (No mock shortcut)');

  // Now create a known code directly or verify
  const testCode = '839210';
  const { hashCode } = await import('../src/utils/code.js');
  await prisma.verificationCode.update({
    where: { id: activeCode.id },
    data: { codeHash: hashCode(testCode) },
  });

  console.log('7. Verifying with valid code:');
  const verifyRes = await api('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, code: testCode }),
  });
  if (!verifyRes.ok) {
    throw new Error(`Verification failed: ${JSON.stringify(verifyRes.data)}`);
  }
  console.log('   ✓ Verification succeeded. Status:', verifyRes.data.status);

  // 7. Check account status after verification
  const updatedUser = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!updatedUser || updatedUser.status !== 'pending_approval' || !updatedUser.emailVerified) {
    throw new Error(`User status not updated to pending_approval: ${JSON.stringify(updatedUser)}`);
  }
  console.log('   ✓ Account transitioned to pending_approval in DB. emailVerified = true');

  // 8. Unapproved user cannot access staff portal
  console.log('8. Confirming unapproved candidate cannot log in:');
  const pendingLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testEmail, password: testPassword }),
  });
  if (pendingLogin.status !== 403 || pendingLogin.data.code !== 'ACCOUNT_PENDING') {
    throw new Error(`Expected 403 ACCOUNT_PENDING, got: ${JSON.stringify(pendingLogin.data)}`);
  }
  console.log('   ✓ Unapproved account rejected from signing in with 403 ACCOUNT_PENDING');

  // 9. Manager approves account
  console.log('9. Branch Manager reviews and approves account:');
  const mgrLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-M001', password: 'Password@123' }),
  });
  const mgrToken = mgrLogin.data.accessToken;

  // Check pending staff list
  const pendingList = await api('/staff/pending', {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const inPending = pendingList.data.find((p: any) => p.email === testEmail);
  if (!inPending) throw new Error('Candidate does not appear in manager pending list!');
  console.log('   ✓ Candidate correctly visible in Manager pending queue');

  // Approve staff
  const assignedEmpId = `BOA-T${uniqueNum}`;
  const approveRes = await api(`/staff/${updatedUser.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mgrToken}` },
    body: JSON.stringify({ employeeId: assignedEmpId }),
  });
  if (!approveRes.ok) throw new Error(`Approval failed: ${JSON.stringify(approveRes.data)}`);
  console.log('   ✓ Candidate approved and assigned Employee ID:', assignedEmpId);

  // 10. Candidate signs in with assigned employee ID
  console.log('10. Approved staff signs in:');
  const approvedLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: assignedEmpId, password: testPassword }),
  });
  if (!approvedLogin.ok) throw new Error(`Approved staff login failed: ${JSON.stringify(approvedLogin.data)}`);
  console.log('   ✓ Approved staff login successful! Role:', approvedLogin.data.user.role);

  return { email: testEmail, employeeId: assignedEmpId };
}

async function runScenarioB() {
  console.log('\n--- SCENARIO B: Countdown Persistence Across Refreshes ---');
  const uniqueNum = Date.now().toString().slice(-6);
  const testEmail = `countdown.${uniqueNum}@abyssinia.et`;

  // 1. Register account
  const regRes = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Countdown Test ${uniqueNum}`,
      email: testEmail,
      phone: '0911998877',
      position: 'Customer Service Officer',
      password: 'Password@Valid123',
    }),
  });
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);

  const initialExpiresAt = new Date(regRes.data.expiresAt).getTime();
  const initialResendAfter = new Date(regRes.data.resendAfter).getTime();
  console.log('   ✓ Initial code registered. Expiration target:', regRes.data.expiresAt);

  // 2. Wait 3 seconds
  console.log('   Waiting 3 seconds to simulate time passing before page reload...');
  await new Promise((r) => setTimeout(r, 3000));

  // 3. Query status again (simulating Ctrl + Shift + R or page reload)
  console.log('   Simulating page reload: fetching /api/auth/verification-status...');
  const statusRes = await api(`/auth/verification-status?identifier=${encodeURIComponent(testEmail)}`);
  if (!statusRes.ok) throw new Error(`Status lookup failed: ${JSON.stringify(statusRes.data)}`);

  const reloadedExpiresAt = new Date(statusRes.data.expiresAt).getTime();
  const reloadedResendAfter = new Date(statusRes.data.resendAfter).getTime();

  // Authoritative timestamps MUST match the original issued code timestamps!
  if (Math.abs(reloadedExpiresAt - initialExpiresAt) > 1000) {
    throw new Error(`Expiration timestamp shifted! Initial: ${initialExpiresAt}, Reloaded: ${reloadedExpiresAt}`);
  }
  if (Math.abs(reloadedResendAfter - initialResendAfter) > 1000) {
    throw new Error(`Resend timestamp shifted! Initial: ${initialResendAfter}, Reloaded: ${reloadedResendAfter}`);
  }

  // Remaining seconds must have decreased by ~3 seconds (297s, not reset to 300s)
  if (statusRes.data.expiresInSeconds >= 300) {
    throw new Error(`Expires countdown reset to >= 300s! Current: ${statusRes.data.expiresInSeconds}`);
  }
  if (statusRes.data.resendCooldownSeconds >= 60) {
    throw new Error(`Resend cooldown reset to >= 60s! Current: ${statusRes.data.resendCooldownSeconds}`);
  }

  console.log(`   ✓ Timestamps match perfectly!`);
  console.log(`   ✓ Remaining seconds: ${statusRes.data.expiresInSeconds}s (was 300s)`);
  console.log(`   ✓ Resend cooldown: ${statusRes.data.resendCooldownSeconds}s (was 60s)`);

  // 4. Test code expiration rejection
  console.log('   Simulating expired code in DB...');
  await prisma.verificationCode.updateMany({
    where: { target: testEmail, purpose: 'email_verification' },
    data: { expiresAt: new Date(Date.now() - 10000) }, // 10 seconds in past
  });

  const expiredVerify = await api('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, code: '111111' }),
  });
  if (expiredVerify.status !== 400 || expiredVerify.data.code !== 'CODE_EXPIRED') {
    throw new Error(`Expected 400 CODE_EXPIRED, got: ${JSON.stringify(expiredVerify.data)}`);
  }
  console.log('   ✓ Expired code rejected with 400 CODE_EXPIRED');
}

async function runScenarioC() {
  console.log('\n--- SCENARIO C: Resend Security & Atomic Cooldown Enforcement ---');
  const uniqueNum = Date.now().toString().slice(-6);
  const testEmail = `resend.${uniqueNum}@abyssinia.et`;

  // 1. Register
  await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      fullName: `Resend Security ${uniqueNum}`,
      email: testEmail,
      phone: '0911776655',
      position: 'Customer Service Officer',
      password: 'Password@Valid123',
    }),
  });

  // 2. Immediate premature resend attempt
  console.log('1. Attempting immediate resend during 60-second cooldown:');
  const prematureRes = await api('/auth/resend-email-code', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });
  if (prematureRes.status !== 429 || prematureRes.data.code !== 'RATE_LIMIT') {
    throw new Error(`Expected 429 RATE_LIMIT, got: ${JSON.stringify(prematureRes.data)}`);
  }
  console.log('   ✓ Premature resend rejected with 429 RATE_LIMIT:');
  console.log('     "', prematureRes.data.message, '"');

  // 3. Verify cooldown remains enforced after a few seconds
  await new Promise((r) => setTimeout(r, 1500));
  const prematureRes2 = await api('/auth/resend-email-code', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });
  if (prematureRes2.status !== 429 || prematureRes2.data.code !== 'RATE_LIMIT') {
    throw new Error(`Expected 429 RATE_LIMIT on second attempt, got: ${JSON.stringify(prematureRes2.data)}`);
  }
  console.log('   ✓ Cooldown continuously enforced on repeated attempts');

  // 4. Set resendAfter in past to simulate cooldown expiry
  console.log('2. Simulating cooldown expiry in database...');
  await prisma.verificationCode.updateMany({
    where: { target: testEmail, purpose: 'email_verification', consumed: false },
    data: { resendAfter: new Date(Date.now() - 1000) },
  });

  // 5. Request new code
  console.log('3. Requesting new code after cooldown expiry:');
  const validResend = await api('/auth/resend-email-code', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });
  if (!validResend.ok) {
    throw new Error(`Valid resend failed: ${JSON.stringify(validResend.data)}`);
  }
  console.log('   ✓ New code issued successfully. New timestamps returned:');
  console.log('     expiresAt:', validResend.data.expiresAt, '| resendAfter:', validResend.data.resendAfter);

  // 6. Check that old code was marked consumed and cannot be reused
  const allCodes = await prisma.verificationCode.findMany({
    where: { target: testEmail, purpose: 'email_verification' },
    orderBy: { createdAt: 'asc' },
  });
  if (allCodes.length !== 2) throw new Error(`Expected 2 codes, found ${allCodes.length}`);
  if (!allCodes[0].consumed) throw new Error('First code was not invalidated upon resend!');
  if (allCodes[1].consumed) throw new Error('Second code should be unconsumed!');
  console.log('   ✓ Previous code atomically invalidated upon resend');
}

async function runScenarioD() {
  console.log('\n--- SCENARIO D: Mock Authentication & Security Shortcut Removal ---');

  // 1. Confirm hardcoded password bypasses fail
  console.log('1. Testing that hardcoded passwords do NOT bypass authentication:');
  // Create user with a known different password
  const uniqueNum = Date.now().toString().slice(-6);
  const testEmail = `mocktest.${uniqueNum}@abyssinia.et`;
  const { hashPassword } = await import('../src/utils/password.js');
  const realHash = await hashPassword('SpecificPassword!999');

  const testUser = await prisma.user.create({
    data: {
      fullName: 'Mock Test User',
      email: testEmail,
      employeeId: `BOA-MOCK${uniqueNum}`,
      phone: '0911000000',
      positionTitle: 'Customer Service Officer',
      branchName: 'Finfine Main Branch',
      role: 'staff',
      status: 'active',
      password: realHash,
      emailVerified: true,
    },
  });

  // Attempt login with "Password@123"
  const bypass1 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUser.employeeId, password: 'Password@123' }),
  });
  if (bypass1.status !== 401 || bypass1.data.code !== 'INVALID_CREDENTIALS') {
    throw new Error(`Hardcoded Password@123 was NOT rejected! Got: ${JSON.stringify(bypass1.data)}`);
  }
  console.log('   ✓ Password@123 correctly rejected (401 INVALID_CREDENTIALS)');

  // Attempt login with "Demo@1234"
  const bypass2 = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUser.employeeId, password: 'Demo@1234' }),
  });
  if (bypass2.status !== 401 || bypass2.data.code !== 'INVALID_CREDENTIALS') {
    throw new Error(`Hardcoded Demo@1234 was NOT rejected! Got: ${JSON.stringify(bypass2.data)}`);
  }
  console.log('   ✓ Demo@1234 correctly rejected (401 INVALID_CREDENTIALS)');

  // Real password succeeds
  const realLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: testUser.employeeId, password: 'SpecificPassword!999' }),
  });
  if (!realLogin.ok) throw new Error(`Real password failed: ${JSON.stringify(realLogin.data)}`);
  console.log('   ✓ Actual bcrypt password verified successfully');

  // 2. Confirm unauthorized access is blocked
  console.log('2. Testing protected endpoints reject missing or forged tokens:');
  const noToken = await api('/auth/me');
  if (noToken.status !== 401) throw new Error(`Expected 401, got ${noToken.status}`);
  console.log('   ✓ Missing token rejected with 401');

  const forgedToken = await api('/auth/me', {
    headers: { Authorization: 'Bearer forged.token.value' },
  });
  if (forgedToken.status !== 401) throw new Error(`Expected 401, got ${forgedToken.status}`);
  console.log('   ✓ Forged token rejected with 401');

  // 3. Confirm staff cannot access manager endpoints
  const staffToken = realLogin.data.accessToken;
  const mgrOnly = await api('/staff/pending', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (mgrOnly.status !== 403) throw new Error(`Expected 403 for staff on manager route, got ${mgrOnly.status}`);
  console.log('   ✓ Staff token rejected from Manager endpoint with 403 Forbidden');
}

async function runScenarioE() {
  console.log('\n--- SCENARIO E: Regression Testing ---');

  // 1. Manager login
  console.log('1. Manager login:');
  const mgrLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-M001', password: 'Password@123' }),
  });
  if (!mgrLogin.ok) throw new Error('Manager login failed');
  console.log('   ✓ Manager login ok:', mgrLogin.data.user.fullName);

  // 2. Staff login
  console.log('2. Staff login:');
  const staffLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-S001', password: 'Password@123' }),
  });
  if (!staffLogin.ok) throw new Error('Staff login failed');
  console.log('   ✓ Staff login ok:', staffLogin.data.user.fullName);

  // 3. Password reset request
  console.log('3. Password reset flow:');
  const resetReq = await api('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-S001' }),
  });
  if (!resetReq.ok) throw new Error(`Password reset request failed: ${JSON.stringify(resetReq.data)}`);
  console.log('   ✓ Password recovery request dispatched:', resetReq.data.maskedEmail);
  console.log('   ✓ Authoritative timestamps returned for reset cooldown and expiration:', {
    expiresAt: resetReq.data.expiresAt,
    resendAfter: resetReq.data.resendAfter,
  });

  // Verify demo code 123456 cannot reset password
  const demoResetVerify = await api('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'BOA-S001', code: '123456' }),
  });
  if (demoResetVerify.status !== 400 || demoResetVerify.data.code !== 'INVALID_CODE') {
    throw new Error(`Demo code 123456 should be rejected, got: ${JSON.stringify(demoResetVerify.data)}`);
  }
  console.log('   ✓ Demo code 123456 rejected on password reset');

  // 4. Registration status lookup
  console.log('4. Registration status lookup:');
  const regStatus = await api('/auth/registration-status?identifier=BOA-S001');
  if (!regStatus.ok) throw new Error('Registration status failed');
  console.log('   ✓ Registration status lookup ok:', regStatus.data.fullName, '| Status:', regStatus.data.status);
}

async function main() {
  try {
    await runScenarioA();
    await runScenarioB();
    await runScenarioC();
    await runScenarioD();
    await runScenarioE();

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END SCENARIOS A, B, C, D, E PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
