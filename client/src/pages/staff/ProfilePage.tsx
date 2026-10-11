import { useState, useEffect, type FormEvent } from 'react';
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  Mail,
  Building,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { staffService } from '@/services/staff.service';
import { authService } from '@/services/auth.service';
import { useVerificationTimer } from '@/hooks/useVerificationTimer';
import { PageHeader } from '@/components/shared';
import { ProfilePhotoDialog } from '@/components/profile';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Input,
  PhoneInput,
  Avatar,
  AccountStatusBadge,
  Badge,
  Dialog,
} from '@/components/ui';
import { phone, required, validateForm, hasErrors, strongPassword } from '@/utils/validation';
import { formatDate } from '@/utils/date';
import { toApiError } from '@/services/http/apiClient';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  if (!user) return null;

  // Photo dialog state
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  // Phone number state
  const [contactPhone, setContactPhone] = useState(user.phone);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [savingPhone, setSavingPhone] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyModalError, setVerifyModalError] = useState<string | null>(null);
  const [pendingTimestamps, setPendingTimestamps] = useState<{
    expiresAt?: string;
    resendAfter?: string;
    serverTime?: string;
  }>({});

  const emailTimer = useVerificationTimer({
    expiresAt: pendingTimestamps.expiresAt,
    resendAfter: pendingTimestamps.resendAfter,
    serverTime: pendingTimestamps.serverTime,
  });

  // Keep phone in sync if user changes
  useEffect(() => {
    setContactPhone(user.phone);
  }, [user.phone]);

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
        message: newAvatarUrl
          ? 'Your profile picture has been saved successfully.'
          : 'Your profile picture has been removed.',
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

  const handleUpdatePhone = async (e: FormEvent) => {
    e.preventDefault();
    const err = phone(contactPhone);
    setPhoneError(err);
    if (err) return;

    setSavingPhone(true);
    try {
      const updated = await staffService.updateMyProfile({
        phone: contactPhone.trim(),
      });
      updateUser(updated);
      showToast({
        tone: 'success',
        title: 'Phone number updated',
        message: 'Your official contact phone has been saved.',
      });
    } catch (error) {
      const apiErr = toApiError(error);
      showToast({ tone: 'danger', title: 'Update failed', message: apiErr.message });
    } finally {
      setSavingPhone(false);
    }
  };

  const handleRequestEmailChange = async (e: FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailChangeError('Please enter a valid corporate email address.');
      return;
    }
    if (clean === user.email.toLowerCase()) {
      setEmailChangeError('New email must be different from your current email.');
      return;
    }

    setEmailChangeError(null);
    setRequestingEmailChange(true);
    try {
      const res = await staffService.requestEmailChange(clean);
      setPendingTimestamps({
        expiresAt: res.expiresAt,
        resendAfter: res.resendAfter,
        serverTime: res.serverTime,
      });
      emailTimer.restart(res.expiresAt, res.resendAfter, res.serverTime);
      setVerificationCode('');
      setVerifyModalError(null);
      setEmailModalOpen(true);
      showToast({
        tone: 'gold',
        title: 'Verification Code Sent',
        message: `A 6-digit confirmation code was sent to ${clean}.`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setEmailChangeError(apiErr.message);
      showToast({ tone: 'danger', title: 'Request Failed', message: apiErr.message });
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleResendCode = async () => {
    if (!emailTimer.canResend || requestingEmailChange) return;
    setRequestingEmailChange(true);
    setVerifyModalError(null);
    try {
      const res = await staffService.requestEmailChange(newEmail.trim().toLowerCase());
      setPendingTimestamps({
        expiresAt: res.expiresAt,
        resendAfter: res.resendAfter,
        serverTime: res.serverTime,
      });
      emailTimer.restart(res.expiresAt, res.resendAfter, res.serverTime);
      showToast({
        tone: 'gold',
        title: 'Code Resent',
        message: 'A fresh 6-digit verification code has been dispatched.',
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setVerifyModalError(apiErr.message);
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleConfirmEmailChange = async (e: FormEvent) => {
    e.preventDefault();
    const code = verificationCode.trim();
    if (!code || code.length !== 6) {
      setVerifyModalError('Please enter the complete 6-digit verification code.');
      return;
    }

    setVerifyModalError(null);
    setVerifyingEmail(true);
    try {
      const updatedUser = await staffService.verifyEmailChange(
        newEmail.trim().toLowerCase(),
        code,
      );
      updateUser(updatedUser);
      setEmailModalOpen(false);
      setNewEmail('');
      showToast({
        tone: 'success',
        title: 'Email Address Updated',
        message: `Your account email has been updated to ${updatedUser.email}.`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setVerifyModalError(apiErr.message);
    } finally {
      setVerifyingEmail(false);
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
      showToast({
        tone: 'success',
        title: 'Password changed',
        message: 'Your password has been updated securely.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch {
      showToast({
        tone: 'danger',
        title: 'Password change failed',
        message: 'Current password may be incorrect.',
      });
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
                  className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-gold-500 text-zinc-950 shadow-md ring-2 ring-white transition hover:bg-gold-400 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold-500 cursor-pointer"
                  title="Update profile photo"
                  aria-label="Update profile photo"
                >
                  <Camera className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPhotoDialogOpen(true)}
                className="mt-2 text-xs font-medium text-gold-700 hover:text-gold-800 hover:underline cursor-pointer"
              >
                Change Photo
              </button>

              <h3 className="mt-2 text-base font-semibold text-zinc-900">{user.fullName}</h3>
              <p className="text-xs font-mono text-zinc-500">{user.employeeId}</p>
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
          {/* Contact Details Card */}
          <Card>
            <CardHeader
              title="Official Contact Details"
              description="Keep your verified email address and telephone updated for branch audits and notifications."
            />
            <CardBody className="space-y-6">
              {/* Phone update form */}
              <form onSubmit={handleUpdatePhone} className="space-y-3">
                <Field
                  label="Official Telephone Number"
                  error={phoneError}
                  required
                  hint="Ethiopian format: e.g. 0911 234 567 or +251 91 123 4567 (10 digits for 09/07, or +251 with 9 digits)"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <PhoneInput
                        value={contactPhone}
                        onChange={setContactPhone}
                        error={phoneError}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={savingPhone}
                      disabled={contactPhone === user.phone}
                    >
                      Save Phone
                    </Button>
                  </div>
                </Field>
              </form>

              {/* Verified Email Section & Email Change Workflow */}
              <div className="border-t border-zinc-200 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 block">
                      Current Corporate Email
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="size-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-900 font-mono">
                        {user.email}
                      </span>
                      <Badge tone="success" dot>
                        Verified Active
                      </Badge>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRequestEmailChange} className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-gold-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      Change Official Email Address
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-500">
                    To maintain strict security, updating your email requires entering a 6-digit confirmation code sent to your new address. If unverified, your email remains <span className="font-semibold text-zinc-700">{user.email}</span>.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="Enter new official email address..."
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        leftIcon={<Mail className="size-4 text-zinc-400" />}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={requestingEmailChange}
                      disabled={!newEmail.trim() || newEmail.trim().toLowerCase() === user.email.toLowerCase()}
                      rightIcon={<ArrowRight className="size-4" />}
                    >
                      Send Verification Code
                    </Button>
                  </div>
                  {emailChangeError && (
                    <p className="text-xs text-red-600 font-medium">{emailChangeError}</p>
                  )}
                </form>
              </div>
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

      {/* 6-Digit Email Change Verification Modal */}
      <Dialog
        open={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setVerificationCode('');
          setVerifyModalError(null);
          setNewEmail('');
        }}
        title="Verify Staff Email Address"
        description={`We dispatched a 6-digit confirmation code to ${newEmail}. Please enter it below to finalize your email update.`}
      >
        <form onSubmit={handleConfirmEmailChange} className="space-y-4 pt-2">
          <div className="rounded-lg border border-gold-200 bg-gold-50/70 p-3 text-xs text-gold-950 flex items-start gap-2.5">
            <Lock className="size-4 shrink-0 text-gold-600 mt-0.5" />
            <div>
              <p className="font-semibold">Security Verification Policy</p>
              <p className="text-zinc-600 mt-0.5">
                If not verified, your email remains safely set to <strong className="text-zinc-800">{user.email}</strong>.
              </p>
            </div>
          </div>

          <Field
            label="6-Digit Verification Code"
            error={verifyModalError ?? undefined}
            required
            hint={
              emailTimer.isExpired
                ? 'Code expired. Please request a new one.'
                : `Code expires in ${emailTimer.formatExpires}`
            }
          >
            <Input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="text-center font-mono text-xl tracking-widest font-bold h-12"
              autoFocus
            />
          </Field>

          {verifyModalError && (
            <p className="text-xs text-red-600 font-medium">{verifyModalError}</p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={!emailTimer.canResend || requestingEmailChange}
              className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                emailTimer.canResend && !requestingEmailChange
                  ? 'text-gold-700 hover:text-gold-800 hover:underline'
                  : 'text-zinc-400 cursor-not-allowed'
              }`}
            >
              <RotateCw className="size-3.5" />
              {emailTimer.canResend
                ? 'Resend Verification Code'
                : `Resend available in ${emailTimer.resendRemaining}s`}
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEmailModalOpen(false);
                  setVerificationCode('');
                  setVerifyModalError(null);
                  setNewEmail('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={verifyingEmail}
                disabled={verificationCode.length !== 6 || emailTimer.isExpired}
                leftIcon={<CheckCircle2 className="size-4" />}
              >
                Confirm & Update
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
