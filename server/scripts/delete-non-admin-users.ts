import { prisma } from '../src/config/database.js';

async function main() {
  console.log('--- Deleting all users except admin (manager) ---');

  // 1. Identify admin users
  const admins = await prisma.user.findMany({
    where: { role: 'manager' },
    select: { id: true, email: true, fullName: true, employeeId: true, role: true },
  });

  console.log(`Found ${admins.length} admin user(s):`, admins);
  if (admins.length === 0) {
    throw new Error('Safety abort: No admin/manager user found! Refusing to delete users.');
  }

  const adminIds = admins.map((a: any) => a.id);

  // 2. Identify non-admin users to delete
  const nonAdminUsers = await prisma.user.findMany({
    where: {
      id: { notIn: adminIds },
      role: { not: 'manager' },
    },
    select: { id: true, email: true, fullName: true, employeeId: true, referenceId: true },
  });

  console.log(`Found ${nonAdminUsers.length} non-admin user(s) to delete.`);
  if (nonAdminUsers.length === 0) {
    console.log('No non-admin users found in database. Database already clean.');
    return;
  }

  const userIdsToDelete = nonAdminUsers.map((u: any) => u.id);
  const targetsToDelete = nonAdminUsers.flatMap((u: any) =>
    [u.email, u.employeeId, u.referenceId].filter(Boolean) as string[]
  );

  console.log('Deleting dependent records safely...');

  // 3. Clean up related tables explicitly to avoid foreign key issues
  const kpiAssignments = await prisma.kpiAssignment.deleteMany({
    where: { staffId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${kpiAssignments.count} KPI assignments.`);

  const kpiEntries = await prisma.kpiEntry.deleteMany({
    where: { staffId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${kpiEntries.count} KPI entries.`);

  const feedbackReceived = await prisma.feedback.deleteMany({
    where: { staffId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${feedbackReceived.count} feedbacks received by deleted users.`);

  const feedbackSent = await prisma.feedback.deleteMany({
    where: { managerId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${feedbackSent.count} feedbacks sent by deleted users.`);

  const announcementReads = await prisma.announcementRead.deleteMany({
    where: { userId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${announcementReads.count} announcement read receipts.`);

  const announcementsAuthored = await prisma.announcement.deleteMany({
    where: { authorId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${announcementsAuthored.count} announcements authored by deleted users.`);

  const chatMessages = await prisma.chatMessage.deleteMany({
    where: { senderId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${chatMessages.count} chat messages.`);

  const conversationParticipants = await prisma.conversationParticipant.deleteMany({
    where: { userId: { in: userIdsToDelete } },
  });
  console.log(`Deleted ${conversationParticipants.count} conversation participants.`);

  // Clean up direct conversations that have no or only 1 participant left
  const directConversations = await prisma.conversation.findMany({
    where: { type: 'direct' },
    include: { participants: true },
  });
  const emptyDirectConvs = directConversations.filter((c: any) => c.participants.length < 2);
  if (emptyDirectConvs.length > 0) {
    const deletedConvs = await prisma.conversation.deleteMany({
      where: { id: { in: emptyDirectConvs.map((c: any) => c.id) } },
    });
    console.log(`Deleted ${deletedConvs.count} orphaned direct conversations.`);
  }

  // Update audit logs actor to null if referencing deleted users
  const auditLogs = await prisma.auditLog.updateMany({
    where: { actorId: { in: userIdsToDelete } },
    data: { actorId: null },
  });
  console.log(`Detached actor from ${auditLogs.count} audit logs.`);

  // Clean up verification codes for deleted users
  if (targetsToDelete.length > 0) {
    const verifCodes = await prisma.verificationCode.deleteMany({
      where: { target: { in: targetsToDelete } },
    });
    console.log(`Deleted ${verifCodes.count} verification codes.`);
  }

  // 4. Finally delete non-admin users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIdsToDelete } },
  });
  console.log(`Successfully deleted ${deletedUsers.count} non-admin user(s) from database.`);

  // 5. Verify remaining users
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, status: true, employeeId: true },
  });
  console.log('Remaining users in database:');
  remainingUsers.forEach((u: any) => {
    console.log(`- ${u.id}: ${u.fullName} (${u.email}) [Role: ${u.role}, Status: ${u.status}, EmpID: ${u.employeeId}]`);
  });
}

main()
  .catch((e) => {
    console.error('Error during user deletion:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
