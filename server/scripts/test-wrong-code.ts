import { prisma } from '../src/config/database.js';

const API_URL = 'http://localhost:4000/api';

async function main() {
  console.log('Testing that WRONG verification codes are strictly rejected...');

  // 1. Fetch an active position from DB
  const pos = await prisma.position.findFirst({ where: { isActive: true } });
  if (!pos) throw new Error('No active position found in DB');
  console.log('Using active position:', pos.name);

  // 2. Create a fresh candidate awaiting email verification
  const testEmail = `wrongcode.test.${Date.now()}@abyssinia.et`;
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Wrong Code Tester',
      email: testEmail,
      phone: '0911009988',
      position: pos.name,
      password: 'StrongPassword@123',
    }),
  });

  const regData = await regRes.json();
  console.log('Registered candidate:', regData);
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);

  // 2. Submit wrong code '000000'
  const wrongRes1 = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '000000',
    }),
  });
  const wrongData1 = await wrongRes1.json();
  console.log('Wrong code 000000 response (status:', wrongRes1.status, '):', wrongData1);
  if (wrongRes1.status !== 400 || wrongData1.code !== 'INVALID_CODE') {
    throw new Error(`Expected 400 INVALID_CODE for 000000, got ${wrongRes1.status}`);
  }
  console.log('✓ Wrong code 000000 was strictly rejected!');

  // 3. Submit wrong code '123456'
  const wrongRes2 = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '123456',
    }),
  });
  const wrongData2 = await wrongRes2.json();
  console.log('Wrong code 123456 response (status:', wrongRes2.status, '):', wrongData2);
  if (wrongRes2.status !== 400 || wrongData2.code !== 'INVALID_CODE') {
    throw new Error(`Expected 400 INVALID_CODE for 123456, got ${wrongRes2.status}`);
  }
  console.log('✓ Code 123456 was strictly rejected! (No demo bypass)');

  // 4. Look up the REAL code from DB and verify successfully
  const dbCode = await prisma.verificationCode.findFirst({
    where: { target: testEmail, purpose: 'email_verification', consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (!dbCode) throw new Error('No DB verification code found!');

  // We need to know what code was generated; in production it is sent to Brevo.
  // We can manually mark the candidate pending_approval to test the already-verified guard:
  await prisma.user.update({
    where: { email: testEmail },
    data: { status: 'pending_approval', emailVerified: true },
  });

  // 5. Test that when user is pending_approval, submitting ANY code does NOT return success: true!
  const alreadyVerifiedRes = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '000000',
    }),
  });
  const alreadyVerifiedData = await alreadyVerifiedRes.json();
  console.log('Already verified response (status:', alreadyVerifiedRes.status, '):', alreadyVerifiedData);
  if (alreadyVerifiedRes.status !== 400 || alreadyVerifiedData.code !== 'ALREADY_VERIFIED') {
    throw new Error(`Expected 400 ALREADY_VERIFIED for account in pending_approval, got ${alreadyVerifiedRes.status}`);
  }
  console.log('✓ Already verified account rejects wrong code with ALREADY_VERIFIED (no false success bypass)!');

  console.log('🎉 ALL WRONG CODE TESTS PASSED!');
}

main().catch(console.error);
