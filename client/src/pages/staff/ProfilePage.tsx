import { useState, type FormEvent } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Phone, Mail, Building, Briefcase, Calendar, Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { staffService } from '@/services/staff.service';
import { authService } from '@/services/auth.service';
import { PageHeader } from '@/components/shared';
import { ProfilePhotoDialog } from '@/components/profile';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Input,
  Avatar,
  AccountStatusBadge,
} from '@/components/ui';
import { email, phone, required, validateForm, hasErrors, strongPassword } from '@/utils/validation';
import { formatDate } from '@/utils/date';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  if (!user) return null;

  // Photo dialog state
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  // Contact info state
  const [contactEmail, setContactEmail] = useState(user.email);
  const [contactPhone, setContactPhone] = useState(user.phone);
  const [contactErrors, setContactErrors] = useState<Record<string, string | undefined>>({});
  const [savingContact, setSavingContact] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | undefined>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePhoto = async (newAvatarUrl: string | null) => {
    try {
      const updated = await staffService.updateMyProfile({ avatarUrl: newAvatarUrl });
      updateUser(updated);
      showToast({
        tone: 'success',
        title: 'Profile photo updated',
        message: newAvatarUrl ? 'Your profile picture has been saved successfully.' : 'Your profile picture has been removed.',
      });
    } catch {
      showToast({
        tone: 'danger',
        title: 'Update failed',
        message: 'Could not save your profile picture. Please try again.',
      });
      throw new Error('Save photo failed');
    }
  };

  const handleUpdateContact = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(
      { email: contactEmail, phone: contactPhone },
      {
        email: [required('Email address'), email],
        phone: [required('Phone number'), phone],
      },
    );

    setContactErrors(errs);
    if (hasErrors(errs)) return;

    setSavingContact(true);
    try {
      const updated = await staffService.updateMyProfile({
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
      });
      updateUser(updated);
      showToast({ tone: 'success', title: 'Profile updated', message: 'Your contact details have been saved.' });
    } catch {
      showToast({ tone: 'danger', title: 'Update failed', message: 'Could not update your contact information.' });
    } finally {
      setSavingContact(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateForm(
      { currentPassword, newPassword, confirmPassword },
      {
        currentPassword: [required('Current password')],
        newPassword: [required('New password'), strongPassword],
        confirmPassword: [required('Confirm password')],
      },
    );

    if (!errs.confirmPassword && newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setPasswordErrors(errs);
    if (hasErrors(errs)) return;

    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      showToast({ tone: 'success', title: 'Password changed', message: 'Your password has been updated securely.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch {
      showToast({ tone: 'danger', title: 'Password change failed', message: 'Current password may be incorrect.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your employment details and maintain your branch contact and security settings."
        documentTitle="My Profile"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Employment & Identity Overview */}
        <Card className="lg:col-span-1">
          <CardHeader title="Identity & Role" />
          <CardBody className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <Avatar
                  name={user.fullName}
                  src={user.avatarUrl}
                  size="xl"
                  className="size-24 text-2xl font-bold bg-ink-900 text-white shadow-md ring-4 ring-zinc-50"
                />
                <button
                  type="button"
                  onClick={() => setPhotoDialogOpen(true)}
                  className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-gold-500 text-zinc-950 shadow-md ring-2 ring-white transition hover:bg-gold-400 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  title="Update profile photo"
                  aria-label="Update profile photo"
                >
                  <Camera className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPhotoDialogOpen(true)}
                className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-800 hover:underline"
              >
                Change Photo
              </button>

              <h3 className="mt-2 text-base font-semibold text-zinc-900">{user.fullName}</h3>
              <p className="text-xs text-zinc-500">{user.employeeId}</p>
              <div className="mt-2.5">
                <AccountStatusBadge status={user.status} />
              </div>
            </div>

            <div className="space-y-3 divide-y divide-zinc-100 border-t border-zinc-100 pt-3 text-xs">
              <div className="flex items-center justify-between pt-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Briefcase className="size-3.5 text-zinc-400" />
                  Position
                </span>
                <span className="font-semibold text-zinc-900">{user.position}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Building className="size-3.5 text-zinc-400" />
                  Branch
                </span>
                <span className="font-semibold text-zinc-900">{user.branchName}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <UserCheck className="size-3.5 text-zinc-400" />
                  System Role
                </span>
                <span className="font-semibold text-zinc-900 capitalize">{user.role}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="flex items-center gap-2 text-zinc-500">
                  <Calendar className="size-3.5 text-zinc-400" />
                  Joined Date
                </span>
                <span className="font-semibold text-zinc-900">{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Contact Information & Password */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Details */}
          <Card>
            <CardHeader
              title="Contact Information"
              description="Keep your official telephone and email contacts up to date for branch notifications."
            />
            <CardBody>
              <form onSubmit={handleUpdateContact} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Work Email" error={contactErrors.email} required>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      leftIcon={<Mail className="size-4 text-zinc-400" />}
                    />
                  </Field>

                  <Field label="Phone Number" error={contactErrors.phone} required hint="e.g. 0911 234 567">
                    <Input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      leftIcon={<Phone className="size-4 text-zinc-400" />}
                    />
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="primary" loading={savingContact}>
                    Save Contact Info
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Password Security */}
          <Card>
            <CardHeader
              title="Security & Password"
              description="Ensure your password is at least 8 characters long, containing uppercase, lowercase, and numbers."
            />
            <CardBody>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Field label="Current Password" error={passwordErrors.currentPassword} required>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                    placeholder="Enter current password"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New Password" error={passwordErrors.newPassword} required>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                      placeholder="Enter new password"
                    />
                  </Field>

                  <Field label="Confirm New Password" error={passwordErrors.confirmPassword} required>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={<ShieldCheck className="size-4 text-zinc-400" />}
                      placeholder="Repeat new password"
                    />
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="secondary" loading={savingPassword}>
                    Update Password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Profile Photo Upload / Camera Modal */}
      <ProfilePhotoDialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        currentAvatarUrl={user.avatarUrl}
        userName={user.fullName}
        onSave={handleSavePhoto}
      />
    </div>
  );
}

