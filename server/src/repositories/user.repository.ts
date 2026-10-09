import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';

export interface StoredUser {
  id: string;
  employeeId: string;
  referenceId?: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  branchName: string;
  role: 'staff' | 'manager';
  status: 'pending_email_verification' | 'pending_approval' | 'active' | 'rejected' | 'deactivated';
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  avatarUrl?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  assignedKpiCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  phone: string;
  position: string;
  branchName?: string;
  passwordHash: string;
  referenceId: string;
  role?: 'staff' | 'manager';
  status?: StoredUser['status'];
}

// In-memory fallback dataset for development until DATABASE_URL is supplied
const defaultPasswordHash = bcrypt.hashSync('Password@123', 10);

const memoryUsers: StoredUser[] = [
  {
    id: 'u_mgr',
    employeeId: 'BOA-M001',
    fullName: 'Abebe Kebede',
    email: 'abebe.kebede@abyssinia.et',
    phone: '+251911234567',
    position: 'Branch Manager',
    branchName: 'Finfine Main Branch',
    role: 'manager',
    status: 'active',
    passwordHash: defaultPasswordHash,
    emailVerified: true,
    emailVerifiedAt: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'u_s01',
    employeeId: 'BOA-S001',
    fullName: 'Selam Tesfaye',
    email: 'selam.tesfaye@abyssinia.et',
    phone: '+251911345678',
    position: 'Customer Service Officer (demo)',
    branchName: 'Finfine Main Branch',
    role: 'staff',
    status: 'active',
    passwordHash: defaultPasswordHash,
    emailVerified: true,
    emailVerifiedAt: '2026-01-02T08:00:00.000Z',
    approvedAt: '2026-01-02T08:00:00.000Z',
    assignedKpiCount: 3,
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-02T08:00:00.000Z',
  },
  {
    id: 'u_s02',
    employeeId: 'BOA-S002',
    fullName: 'Dawit Alemu',
    email: 'dawit.alemu@abyssinia.et',
    phone: '+251911456789',
    position: 'Relationship Officer (demo)',
    branchName: 'Finfine Main Branch',
    role: 'staff',
    status: 'active',
    passwordHash: defaultPasswordHash,
    emailVerified: true,
    emailVerifiedAt: '2026-01-03T08:00:00.000Z',
    approvedAt: '2026-01-03T08:00:00.000Z',
    assignedKpiCount: 2,
    createdAt: '2026-01-03T08:00:00.000Z',
    updatedAt: '2026-01-03T08:00:00.000Z',
  },
  {
    id: 'u_s09',
    employeeId: '',
    referenceId: 'REG-S009',
    fullName: 'Hanna Bekele',
    email: 'hanna.bekele@abyssinia.et',
    phone: '+251911123456',
    position: 'Branch Accountant (demo)',
    branchName: 'Finfine Main Branch',
    role: 'staff',
    status: 'pending_approval',
    passwordHash: defaultPasswordHash,
    emailVerified: true,
    emailVerifiedAt: '2026-10-07T10:00:00.000Z',
    createdAt: '2026-10-07T09:30:00.000Z',
    updatedAt: '2026-10-07T10:00:00.000Z',
  },
  {
    id: 'u_s10',
    employeeId: '',
    referenceId: 'REG-S010',
    fullName: 'Natnael Girma',
    email: 'natnael.girma@abyssinia.et',
    phone: '+251911654321',
    position: 'Cash Officer (demo)',
    branchName: 'Finfine Main Branch',
    role: 'staff',
    status: 'rejected',
    rejectionReason: 'Position quota full for current cycle. Please reapply next quarter.',
    passwordHash: defaultPasswordHash,
    emailVerified: true,
    emailVerifiedAt: '2026-10-07T10:00:00.000Z',
    createdAt: '2026-10-07T09:00:00.000Z',
    updatedAt: '2026-10-07T11:00:00.000Z',
  },
  {
    id: 'u_s11',
    employeeId: '',
    referenceId: 'REG-S011',
    fullName: 'Elias Desta',
    email: 'elias.desta@abyssinia.et',
    phone: '+251911987654',
    position: 'Customer Service Officer (demo)',
    branchName: 'Finfine Main Branch',
    role: 'staff',
    status: 'pending_email_verification',
    passwordHash: defaultPasswordHash,
    emailVerified: false,
    emailVerifiedAt: null,
    createdAt: '2026-10-07T14:00:00.000Z',
    updatedAt: '2026-10-07T14:00:00.000Z',
  },
];

function mapPrismaUser(u: any): StoredUser {
  return {
    id: u.id,
    employeeId: u.employeeId ?? '',
    referenceId: u.referenceId ?? undefined,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    position: u.positionTitle,
    branchName: u.branchName,
    role: u.role as 'staff' | 'manager',
    status: u.status as StoredUser['status'],
    passwordHash: u.password,
    emailVerified: u.emailVerified,
    emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
    avatarUrl: u.avatarUrl,
    approvedAt: u.approvedAt ? u.approvedAt.toISOString() : null,
    rejectionReason: u.rejectionReason,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export const userRepository = {
  async findById(id: string): Promise<StoredUser | null> {
    if (env.DATABASE_URL) {
      try {
        const u = await prisma.user.findUnique({ where: { id } });
        if (u) return mapPrismaUser(u);
      } catch {
        // Fall back to memory on DB connection issue
      }
    }
    return memoryUsers.find((u) => u.id === id) ?? null;
  },

  async findByEmail(email: string): Promise<StoredUser | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (env.DATABASE_URL) {
      try {
        const u = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (u) return mapPrismaUser(u);
      } catch {
        // Fall back to memory
      }
    }
    return memoryUsers.find((u) => u.email.toLowerCase() === cleanEmail) ?? null;
  },

  async findByEmployeeId(employeeId: string): Promise<StoredUser | null> {
    const cleanId = employeeId.trim().toUpperCase();
    if (!cleanId) return null;
    if (env.DATABASE_URL) {
      try {
        const u = await prisma.user.findUnique({ where: { employeeId: cleanId } });
        if (u) return mapPrismaUser(u);
      } catch {
        // Fall back to memory
      }
    }
    return memoryUsers.find((u) => u.employeeId && u.employeeId.toUpperCase() === cleanId) ?? null;
  },

  async findByReferenceId(referenceId: string): Promise<StoredUser | null> {
    const cleanRef = referenceId.trim().toUpperCase();
    if (!cleanRef) return null;
    if (env.DATABASE_URL) {
      try {
        const u = await prisma.user.findUnique({ where: { referenceId: cleanRef } });
        if (u) return mapPrismaUser(u);
      } catch {
        // Fall back to memory
      }
    }
    return (
      memoryUsers.find((u) => u.referenceId && u.referenceId.toUpperCase() === cleanRef) ?? null
    );
  },

  async findByIdentifier(identifier: string): Promise<StoredUser | null> {
    const id = identifier.trim().toLowerCase();
    if (env.DATABASE_URL) {
      try {
        const u = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: id, mode: 'insensitive' } },
              { employeeId: { equals: identifier.trim(), mode: 'insensitive' } },
              { referenceId: { equals: identifier.trim(), mode: 'insensitive' } },
            ],
          },
        });
        if (u) return mapPrismaUser(u);
      } catch {
        // Fall back to memory
      }
    }
    return (
      memoryUsers.find(
        (u) =>
          u.email.toLowerCase() === id ||
          (u.employeeId && u.employeeId.toLowerCase() === id) ||
          (u.referenceId && u.referenceId.toLowerCase() === id),
      ) ?? null
    );
  },

  async createUser(data: CreateUserData): Promise<StoredUser> {
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: '',
      referenceId: data.referenceId,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      position: data.position.trim(),
      branchName: data.branchName ?? 'Finfine Main Branch',
      role: data.role ?? 'staff',
      status: data.status ?? 'pending_email_verification',
      passwordHash: data.passwordHash,
      emailVerified: false,
      emailVerifiedAt: null,
      avatarUrl: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    };

    if (env.DATABASE_URL) {
      try {
        const created = await prisma.user.create({
          data: {
            fullName: newUser.fullName,
            email: newUser.email,
            phone: newUser.phone,
            positionTitle: newUser.position,
            branchName: newUser.branchName,
            role: newUser.role,
            status: newUser.status,
            password: newUser.passwordHash,
            referenceId: newUser.referenceId,
            employeeId: null,
            emailVerified: false,
          },
        });
        return mapPrismaUser(created);
      } catch {
        // Fall back to memory
      }
    }

    memoryUsers.push(newUser);
    return newUser;
  },

  async verifyEmail(id: string): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    if (env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
            status: 'pending_approval',
          },
        });
        return mapPrismaUser(updated);
      } catch {
        // Fall back to memory
      }
    }

    const user = memoryUsers.find((u) => u.id === id);
    if (user) {
      user.emailVerified = true;
      user.emailVerifiedAt = now;
      if (user.status === 'pending_email_verification') {
        user.status = 'pending_approval';
      }
      user.updatedAt = now;
      return user;
    }
    return null;
  },

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    if (env.DATABASE_URL) {
      try {
        await prisma.user.update({
          where: { id },
          data: { password: newPasswordHash },
        });
        return;
      } catch {
        // Fall back to memory
      }
    }
    const user = memoryUsers.find((u) => u.id === id);
    if (user) {
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date().toISOString();
    }
  },

  async findPendingStaff(): Promise<StoredUser[]> {
    if (env.DATABASE_URL) {
      try {
        const pending = await prisma.user.findMany({
          where: {
            role: 'staff',
            status: 'pending_approval',
          },
          orderBy: { createdAt: 'desc' },
        });
        return pending.map(mapPrismaUser);
      } catch {
        // Fall back to memory
      }
    }

    return memoryUsers
      .filter((u) => u.role === 'staff' && u.status === 'pending_approval')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async approveStaff(
    id: string,
    employeeId: string,
    kpiIds?: string[],
  ): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    const cleanEmpId = employeeId.trim().toUpperCase();

    if (env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            employeeId: cleanEmpId,
            status: 'active',
            approvedAt: new Date(),
          },
        });
        return mapPrismaUser(updated);
      } catch {
        // Fall back to memory
      }
    }

    const user = memoryUsers.find((u) => u.id === id && u.role === 'staff');
    if (user) {
      user.employeeId = cleanEmpId;
      user.status = 'active';
      user.approvedAt = now;
      user.updatedAt = now;
      if (kpiIds && kpiIds.length > 0) {
        user.assignedKpiCount = kpiIds.length;
      }
      return user;
    }
    return null;
  },

  async rejectStaff(id: string, reason: string): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    if (env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            status: 'rejected',
            rejectionReason: reason,
            approvedAt: new Date(),
          },
        });
        return mapPrismaUser(updated);
      } catch {
        // Fall back to memory
      }
    }

    const user = memoryUsers.find((u) => u.id === id && u.role === 'staff');
    if (user) {
      user.status = 'rejected';
      user.rejectionReason = reason;
      user.approvedAt = now;
      user.updatedAt = now;
      return user;
    }
    return null;
  },

  async setStaffStatus(id: string, status: 'active' | 'deactivated'): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    if (env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: { status },
        });
        return mapPrismaUser(updated);
      } catch {
        // Fall back to memory
      }
    }

    const user = memoryUsers.find((u) => u.id === id && u.role === 'staff');
    if (user) {
      user.status = status;
      user.updatedAt = now;
      return user;
    }
    return null;
  },

  async updateProfile(
    id: string,
    updates: { email?: string; phone?: string; avatarUrl?: string | null },
  ): Promise<StoredUser | null> {
    const now = new Date().toISOString();
    if (env.DATABASE_URL) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: updates,
        });
        return mapPrismaUser(updated);
      } catch {
        // Fall back to memory
      }
    }

    const user = memoryUsers.find((u) => u.id === id);
    if (user) {
      if (updates.email !== undefined) user.email = updates.email.trim().toLowerCase();
      if (updates.phone !== undefined) user.phone = updates.phone.trim();
      if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
      user.updatedAt = now;
      return user;
    }
    return null;
  },

  async listStaff(filter?: { status?: string; search?: string }): Promise<StoredUser[]> {
    const q = filter?.search?.trim().toLowerCase();
    const status = filter?.status && filter.status !== 'all' ? filter.status : undefined;

    if (env.DATABASE_URL) {
      try {
        const staff = await prisma.user.findMany({
          where: {
            role: 'staff',
            status: status ? (status as any) : { not: 'pending_email_verification' },
            ...(q
              ? {
                  OR: [
                    { fullName: { contains: q, mode: 'insensitive' } },
                    { employeeId: { contains: q, mode: 'insensitive' } },
                    { positionTitle: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          orderBy: { fullName: 'asc' },
        });
        return staff.map(mapPrismaUser);
      } catch {
        // Fall back to memory
      }
    }

    return memoryUsers
      .filter((u) => u.role === 'staff' && u.status !== 'pending_email_verification')
      .filter((u) => !status || u.status === status)
      .filter(
        (u) =>
          !q ||
          [u.fullName, u.employeeId, u.position, u.email].some((f) =>
            f.toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async listDirectory(): Promise<StoredUser[]> {
    if (env.DATABASE_URL) {
      try {
        const activeUsers = await prisma.user.findMany({
          where: { status: 'active' },
          orderBy: { fullName: 'asc' },
        });
        return activeUsers.map(mapPrismaUser);
      } catch {
        // Fall back to memory
      }
    }

    return memoryUsers
      .filter((u) => u.status === 'active')
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async listAll(): Promise<StoredUser[]> {
    if (env.DATABASE_URL) {
      try {
        const users = await prisma.user.findMany();
        return users.map(mapPrismaUser);
      } catch {
        // Fall back to memory
      }
    }
    return [...memoryUsers];
  },
};
