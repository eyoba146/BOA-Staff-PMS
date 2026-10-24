import { prisma } from '../src/config/database.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { staffService } from '../src/modules/staff/staff.service.js';
import * as feedbackService from '../src/modules/feedback/feedback.service.js';
import * as chatService from '../src/modules/chat/chat.service.js';
import { isStaffInScope, getStaffIdsInScope } from '../src/utils/scope.js';
import { ApiError } from '../src/utils/apiError.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('--- Starting Customer Experience Manager Feature Test Suite ---');

  // 1. Setup Test Actors
  const admin = await prisma.user.findFirst({
    where: { role: 'manager', status: 'active' },
  });

  if (!admin) {
    throw new Error('No active administrator user found in database for testing.');
  }

  const createdTestUserIds: string[] = [];
  let testStaffCem: any;
  let testStaffScoped: any;
  let testStaffOutScope: any;

  const existingStaff = await prisma.user.findMany({
    where: { role: 'staff', status: 'active' },
    take: 3,
  });

  if (existingStaff.length >= 3) {
    [testStaffCem, testStaffScoped, testStaffOutScope] = existingStaff;
  } else {
    const timestamp = Date.now();
    testStaffCem = await prisma.user.create({
      data: {
        email: `cem-fixture-${timestamp}@test.boa.et`,
        fullName: 'Test CEM Officer',
        phone: '+251911000001',
        positionTitle: 'Customer Service Officer',
        branchName: 'Finfinne Branch',
        password: 'hashed-password-fixture',
        role: 'staff',
        status: 'active',
        emailVerified: true,
      },
    });
    createdTestUserIds.push(testStaffCem.id);

    testStaffScoped = await prisma.user.create({
      data: {
        email: `scoped-fixture-${timestamp}@test.boa.et`,
        fullName: 'Test In-Scope Officer',
        phone: '+251911000002',
        positionTitle: 'Senior Teller',
        branchName: 'Finfinne Branch',
        password: 'hashed-password-fixture',
        role: 'staff',
        status: 'active',
        emailVerified: true,
      },
    });
    createdTestUserIds.push(testStaffScoped.id);

    testStaffOutScope = await prisma.user.create({
      data: {
        email: `outscope-fixture-${timestamp}@test.boa.et`,
        fullName: 'Test Out-Of-Scope Officer',
        phone: '+251911000003',
        positionTitle: 'Auditor',
        branchName: 'Finfinne Branch',
        password: 'hashed-password-fixture',
        role: 'staff',
        status: 'active',
        emailVerified: true,
      },
    });
    createdTestUserIds.push(testStaffOutScope.id);
  }

  const originalRole = testStaffCem.role;

  try {
    // -------------------------------------------------------------
    // Test Category 1: Administrator Role Assignment & Revocation
    // -------------------------------------------------------------
    console.log('\n--- 1. Role Assignment & Scope Controls ---');

    // Admin assigns CEM role with branch scope
    const assignedUser = await userRepository.assignCemRole(testStaffCem.id, admin.id, {
      scopeType: 'branch',
    });
    assert(assignedUser?.role === 'customer_experience_manager', 'Administrator assigns Customer Experience Manager role');

    const dbUserAfterAssign = await prisma.user.findUnique({
      where: { id: testStaffCem.id },
      include: { managerScope: true },
    });
    assert(dbUserAfterAssign?.role === 'customer_experience_manager', 'CEM role persisted in database user table');
    assert(dbUserAfterAssign?.managerScope?.scopeType === 'branch', 'ManagerScope record persisted with branch scope');

    // Admin reconfigures scope to specific staff
    await staffService.updateCemScope(testStaffCem.id, admin.id, {
      scopeType: 'staff',
      allowedStaffIds: [testStaffScoped.id],
      allowedPositions: [],
    });

    const updatedScope = await prisma.managerScope.findUnique({
      where: { userId: testStaffCem.id },
    });
    assert(updatedScope?.scopeType === 'staff', 'ManagerScope updated to staff-specific scope');
    assert(updatedScope?.allowedStaffIds.includes(testStaffScoped.id) === true, 'Permitted staff ID persisted in scope');

    // Scope check: in-scope staff should return true, out-of-scope should return false
    const inScope = await isStaffInScope({ id: testStaffCem.id, role: 'customer_experience_manager' }, testStaffScoped.id);
    assert(inScope === true, 'isStaffInScope returns true for permitted staff');

    const outScope = await isStaffInScope({ id: testStaffCem.id, role: 'customer_experience_manager' }, testStaffOutScope?.id || 'non-existent');
    assert(outScope === false, 'isStaffInScope returns false for out-of-scope staff');

    // CEM cannot elevate or modify another manager's scope
    const cemDbUser = await userRepository.findById(testStaffCem.id);
    assert(cemDbUser?.role === 'customer_experience_manager', 'CEM role is not manager');
    const hasAdminAccess = cemDbUser?.role === 'manager';
    assert(hasAdminAccess === false, 'Non-admin CEM has no manager role access');

    // -------------------------------------------------------------
    // Test Category 2: Immediate Role Revocation & Live DB Enforcement
    // -------------------------------------------------------------
    console.log('\n--- 2. Immediate Role Revocation ---');

    // Admin revokes CEM role
    await userRepository.revokeCemRole(testStaffCem.id, admin.id);
    const dbUserAfterRevoke = await prisma.user.findUnique({
      where: { id: testStaffCem.id },
      include: { managerScope: true },
    });
    assert(dbUserAfterRevoke?.role === 'staff', 'Role cleanly reverts to standard staff on revocation');
    assert(dbUserAfterRevoke?.managerScope === null, 'ManagerScope record deleted on role revocation');

    // Live DB verification: user with stale token claim 'customer_experience_manager' should be rejected
    const effectiveScopeIds = await getStaffIdsInScope({ id: testStaffCem.id, role: 'customer_experience_manager' });
    assert(!effectiveScopeIds.includes(testStaffScoped.id), 'Revoked user with stale session claim cannot access other staff in scope');

    // Re-assign CEM role for subsequent testing
    await userRepository.assignCemRole(testStaffCem.id, admin.id, {
      scopeType: 'staff',
      allowedStaffIds: [testStaffScoped.id],
    });

    // -------------------------------------------------------------
    // Test Category 3: KPI-Linked Coaching & Feedback Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 3. KPI-Linked Feedback & Staff Coaching Workflow ---');

    const kpi = await prisma.kpi.findFirst();

    // CEM creates actionable feedback within scope
    const feedbackResult = await feedbackService.createFeedback(
      testStaffCem.id,
      {
        staffId: testStaffScoped.id,
        subject: 'Service Quality Coaching: Queue Wait Times',
        message: 'Excellent engagement observed, but customer onboarding took 14 minutes. Let us streamline KYC steps.',
        suggestedAction: 'Review fast-track account opening SOP and shadow senior officer on Monday.',
        followUpDate: '2026-11-01',
        kpiId: kpi?.id,
        type: 'feedback',
        audience: 'recipient_only',
      },
      { id: testStaffCem.id, role: 'customer_experience_manager' },
    );

    assert(feedbackResult.success === true, 'CEM successfully creates feedback within authorized scope');
    const createdFeedback = feedbackResult.items[0];
    assert(createdFeedback.suggestedAction?.includes('fast-track') === true, 'Feedback persists suggested improvement action');
    assert(createdFeedback.status === 'pending', 'Initial feedback lifecycle status is pending');
    assert(createdFeedback.followUpDate === '2026-11-01', 'Feedback persists optional follow-up target date');

    // Out-of-scope feedback attempt: CEM tries to give feedback to staff member not in scope
    if (testStaffOutScope) {
      let outOfScopeRejected = false;
      try {
        await feedbackService.createFeedback(
          testStaffCem.id,
          {
            staffId: testStaffOutScope.id,
            subject: 'Unauthorized Feedback',
            message: 'This should be blocked by scope boundary checks.',
          },
          { id: testStaffCem.id, role: 'customer_experience_manager' },
        );
      } catch (err: any) {
        outOfScopeRejected = err.status === 403 || err.statusCode === 403;
      }
      assert(outOfScopeRejected, 'Feedback creation for out-of-scope staff is rejected (403 Forbidden)');
    }

    // Staff member acknowledges coaching feedback
    const acknowledged = await feedbackService.acknowledgeFeedback(createdFeedback.id, testStaffScoped.id);
    assert(acknowledged.status === 'acknowledged', 'Staff member successfully acknowledges coaching feedback');
    assert(acknowledged.acknowledgedAt !== null, 'Acknowledgment timestamp recorded');

    // Staff member replies to feedback
    const replied = await feedbackService.replyFeedback(
      createdFeedback.id,
      testStaffScoped.id,
      'Understood. I will complete the refresher module by Friday.',
    );
    assert(replied.staffReply?.includes('refresher module') === true, 'Staff reply recorded in feedback thread');
    assert(replied.staffRepliedAt !== null, 'Staff reply timestamp recorded');

    // -------------------------------------------------------------
    // Test Category 4: Scoped Group Chat & Moderation Capabilities
    // -------------------------------------------------------------
    console.log('\n--- 4. Group Chat & Moderation Controls ---');

    // CEM creates an authorized work group chat
    const testGroup = await chatService.createGroupConversation(
      testStaffCem.id,
      'customer_experience_manager',
      'Customer Experience Focus Group',
      'Working group for service delivery improvement',
      [testStaffScoped.id],
    );
    assert(testGroup.type === 'group', 'CEM can create scoped work group conversation');
    assert(testGroup.title === 'Customer Experience Focus Group', 'Group conversation title saved');

    // CEM sends a test message in the group
    const msg = await chatService.sendMessage(testGroup.id, testStaffScoped.id, 'Notice: Please ensure all queue tokens are served.');
    assert(msg.conversationId === testGroup.id, 'Message sent to managed group');

    // CEM pins the message
    const pinnedMsg = await chatService.pinMessage(testGroup.id, msg.id, testStaffCem.id, 'customer_experience_manager');
    assert(pinnedMsg.isPinned === true, 'CEM can pin message in authorized group');
    assert(pinnedMsg.pinnedById === testStaffCem.id, 'Pinning actor ID recorded');

    // CEM unpins the message
    const unpinnedMsg = await chatService.pinMessage(testGroup.id, msg.id, testStaffCem.id, 'customer_experience_manager');
    assert(unpinnedMsg.isPinned === false, 'CEM can unpin message in authorized group');

    // CEM moderates inappropriate message in the group
    const inappropriateMsg = await chatService.sendMessage(
      testGroup.id,
      testStaffScoped.id,
      'Unprofessional message content that violates standards',
    );

    const moderatedMsg = await chatService.moderateMessage(
      testGroup.id,
      inappropriateMsg.id,
      testStaffCem.id,
      'customer_experience_manager',
      'Inappropriate communication standard violation',
    );
    assert(moderatedMsg.isModerated === true, 'Message flagged as moderated');
    assert(moderatedMsg.body.includes('removed by a moderator') === true, 'Message body replaced with official moderation notice');
    assert(moderatedMsg.moderationReason === 'Inappropriate communication standard violation', 'Moderation reason recorded');

    // Restriction check: CEM cannot delete admin or remove admin
    let adminRemovalBlocked = false;
    try {
      // Add admin to group
      await prisma.conversationParticipant.create({
        data: { conversationId: testGroup.id, userId: admin.id, role: 'member' },
      });
      // CEM tries to remove admin
      await chatService.removeGroupParticipant(testGroup.id, testStaffCem.id, 'customer_experience_manager', admin.id);
    } catch (err: any) {
      adminRemovalBlocked = err.status === 403 || err.statusCode === 403;
    }
    assert(adminRemovalBlocked, 'CEM cannot remove or demote an administrator from group (403 Forbidden)');

    // Restriction check: CEM cannot moderate direct messages of other users
    let dmModerationBlocked = false;
    let directConvId: string | null = null;
    try {
      // Create a dummy direct conversation between admin and another staff
      const directConv = await prisma.conversation.create({
        data: {
          type: 'direct',
          title: 'Private Test Chat',
          participants: {
            create: [
              { userId: admin.id, role: 'member' },
              { userId: testStaffScoped.id, role: 'member' },
            ],
          },
        },
      });
      directConvId = directConv.id;
      const dmMsg = await prisma.chatMessage.create({
        data: {
          conversationId: directConv.id,
          senderId: admin.id,
          body: 'Private admin correspondence',
        },
      });

      // CEM attempts to moderate this private message
      await chatService.moderateMessage(directConv.id, dmMsg.id, testStaffCem.id, 'customer_experience_manager', 'attempted moderation');
    } catch (err: any) {
      dmModerationBlocked = err.status === 403 || err.statusCode === 403;
    }
    assert(dmModerationBlocked, 'CEM cannot moderate or interfere with private direct messages (403 Forbidden)');

    // Clean up created test entities
    await prisma.feedback.deleteMany({
      where: { subject: { startsWith: 'Service Quality Coaching' } },
    });
    if (directConvId) {
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: directConvId } }).catch(() => null);
      await prisma.chatMessage.deleteMany({ where: { conversationId: directConvId } }).catch(() => null);
      await prisma.conversation.delete({ where: { id: directConvId } }).catch(() => null);
    }
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: testGroup.id } }).catch(() => null);
    await prisma.chatMessage.deleteMany({ where: { conversationId: testGroup.id } }).catch(() => null);
    await prisma.conversation.delete({
      where: { id: testGroup.id },
    }).catch(() => null);

  } finally {
    if (createdTestUserIds.length > 0) {
      await prisma.managerScope.deleteMany({
        where: { userId: { in: createdTestUserIds } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { userId: { in: createdTestUserIds } },
      });
      await prisma.chatMessage.deleteMany({
        where: { senderId: { in: createdTestUserIds } },
      });
      await prisma.feedback.deleteMany({
        where: { OR: [{ staffId: { in: createdTestUserIds } }, { managerId: { in: createdTestUserIds } }] },
      });
      await prisma.user.deleteMany({
        where: { id: { in: createdTestUserIds } },
      });
    } else {
      // Revert user role back to original state
      await prisma.user.update({
        where: { id: testStaffCem.id },
        data: { role: originalRole },
      });
      await prisma.managerScope.deleteMany({
        where: { userId: testStaffCem.id },
      });
    }
  }

  console.log('\n========================================');
  console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
  console.log('========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
