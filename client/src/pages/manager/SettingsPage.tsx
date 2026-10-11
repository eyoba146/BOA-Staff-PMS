import { useState, useCallback, useEffect, type FormEvent } from 'react';
import {
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Building2,
  Hash,
  Save,
  CheckCircle2,
  Mail,
  User as UserIcon,
  Clock,
} from 'lucide-react';
import { settingsService } from '@/services/settings.service';
import { authService } from '@/services/auth.service';
import { toApiError } from '@/services/http/apiClient';
import { useVerificationTimer } from '@/hooks/useVerificationTimer';
import { env } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/context/ToastContext';
import { PageHeader, AsyncBoundary, ConfirmDialog, PendingValidationNotice } from '@/components/shared';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Input,
  Checkbox,
  Dialog,
  Alert,
} from '@/components/ui';
import { required, strongPassword, validateForm, hasErrors } from '@/utils/validation';
import { PositionManagementSection } from '@/components/manager';
import type { SystemSettings } from '@/types';

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const loadSettings = useCallback(async () => {
    return settingsService.get();
  }, []);

  const state = useAsync(loadSettings, [loadSettings]);

  // Branch Manager Profile state
  const [managerFullName, setManagerFullName] = useState(user?.fullName || '');
  const [savingManagerName, setSavingManagerName] = useState(false);
  const [managerNameError, setManagerNameError] = useState<string | null>(null);

  // Email change state
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [emailChangeModalOpen, setEmailChangeModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyModalError, setVerifyModalError] = useState<string | null>(null);
  const [pendingEmailTimestamps, setPendingEmailTimestamps] = useState<{
    expiresAt: string | null;
    resendAfter: string | null;
    serverTime: string | null;
  }>({ expiresAt: null, resendAfter: null, serverTime: null });

  const emailTimer = useVerificationTimer({
    expiresAt: pendingEmailTimestamps.expiresAt,
    resendAfter: pendingEmailTimestamps.resendAfter,
    serverTime: pendingEmailTimestamps.serverTime,
    autoStart: emailChangeModalOpen,
  });

  useEffect(() => {
    if (user?.fullName) {
      setManagerFullName(user.fullName);
    }
  }, [user?.fullName]);

  // Branch Information state
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchErrors, setBranchErrors] = useState<Record<string, string | undefined>>({});
  const [savingBranch, setSavingBranch] = useState(false);

  // Thresholds state
  const [onTargetMin, setOnTargetMin] = useState<number>(85);
  const [needsAttentionMin, setNeedsAttentionMin] = useState<number>(70);
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Policy state
  const [allowEdit, setAllowEdit] = useState(true);
  const [backdateDays, setBackdateDays] = useState(3);
  const [weightingEnabled, setWeightingEnabled] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | undefined>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Reset demo data state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Sync state when loaded
  useEffect(() => {
    if (state.data) {
      setBranchName(state.data.branchName);
      setBranchCode(state.data.branchCode);
      setOnTargetMin(state.data.thresholds.onTargetMin);
      setNeedsAttentionMin(state.data.thresholds.needsAttentionMin);
      setAllowEdit(state.data.entryPolicy.allowEditSubmitted);
      setBackdateDays(state.data.entryPolicy.backdateDays);
      setWeightingEnabled(state.data.weightingEnabled);
    }
  }, [state.data]);

  const handleSaveManagerName = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = managerFullName.trim();
    if (!trimmed || trimmed.length < 3) {
      setManagerNameError('Full name must be at least 3 characters.');
      return;
    }
    setManagerNameError(null);
    setSavingManagerName(true);
    try {
      const updatedUser = await settingsService.updateManagerProfile({ fullName: trimmed });
      updateUser(updatedUser);
      showToast({
        tone: 'success',
        title: 'Manager Profile Updated',
        message: `Branch Manager name has been updated to "${trimmed}".`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setManagerNameError(apiErr.message);
      showToast({ tone: 'danger', title: 'Update Failed', message: apiErr.message });
    } finally {
      setSavingManagerName(false);
    }
  };

  const handleRequestEmailChange = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = newManagerEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailChangeError('Please enter a valid email address.');
      return;
    }
    if (cleanEmail === user?.email.toLowerCase()) {
      setEmailChangeError('New email must be different from the current manager email.');
      return;
    }

    setEmailChangeError(null);
    setRequestingEmailChange(true);
    try {
      const res = await settingsService.requestManagerEmailChange({ newEmail: cleanEmail });
      setPendingEmailTimestamps({
        expiresAt: res.expiresAt,
        resendAfter: res.resendAfter,
        serverTime: res.serverTime,
      });
      emailTimer.restart(res.expiresAt, res.resendAfter, res.serverTime);
      setVerificationCode('');
      setVerifyModalError(null);
      setEmailChangeModalOpen(true);
      showToast({
        tone: 'gold',
        title: 'Verification Code Sent',
        message: `A 6-digit code was dispatched to ${cleanEmail}.`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setEmailChangeError(apiErr.message);
      showToast({ tone: 'danger', title: 'Request Failed', message: apiErr.message });
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleResendEmailCode = async () => {
    if (!emailTimer.canResend) return;
    try {
      const res = await settingsService.requestManagerEmailChange({ newEmail: newManagerEmail.trim().toLowerCase() });
      setPendingEmailTimestamps({
        expiresAt: res.expiresAt,
        resendAfter: res.resendAfter,
        serverTime: res.serverTime,
      });
      emailTimer.restart(res.expiresAt, res.resendAfter, res.serverTime);
      showToast({
        tone: 'gold',
        title: 'New Code Dispatched',
        message: `A new 6-digit verification code has been sent.`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setVerifyModalError(apiErr.message);
    }
  };

  const handleVerifyEmailChange = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      setVerifyModalError('Please enter the 6-digit verification code.');
      return;
    }

    setVerifyingCode(true);
    setVerifyModalError(null);
    try {
      const res = await settingsService.verifyManagerEmailChange({
        newEmail: newManagerEmail.trim().toLowerCase(),
        code: cleanCode,
      });
      updateUser(res.user);
      setEmailChangeModalOpen(false);
      setNewManagerEmail('');
      setVerificationCode('');
      showToast({
        tone: 'success',
        title: 'Email Address Updated',
        message: `Branch Manager email updated to "${res.user.email}".`,
      });
    } catch (err) {
      const apiErr = toApiError(err);
      setVerifyModalError(apiErr.message);
      showToast({ tone: 'danger', title: 'Verification Failed', message: apiErr.message });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSaveBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!state.data) return;

    const trimmedName = branchName.trim();
    const trimmedCode = branchCode.trim().toUpperCase();

    const errs: Record<string, string | undefined> = {};
    if (!trimmedName) {
      errs.branchName = 'Branch name is required.';
    } else if (trimmedName.length < 3) {
      errs.branchName = 'Branch name must be at least 3 characters.';
    }

    if (!trimmedCode) {
      errs.branchCode = 'Branch code is required.';
    } else if (trimmedCode.length < 2) {
      errs.branchCode = 'Branch code must be at least 2 characters.';
    }

    setBranchErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingBranch(true);
    try {
      const updated: SystemSettings = {
        ...state.data,
        branchName: trimmedName,
        branchCode: trimmedCode,
      };
      await settingsService.update(updated);
      state.setData(updated);
      if (user) {
        updateUser({ ...user, branchName: trimmedName });
      }
      showToast({
        tone: 'success',
        title: 'Branch information updated',
        message: `Branch profile updated to "${trimmedName}" (${trimmedCode}).`,
      });
    } catch {
      showToast({
        tone: 'danger',
        title: 'Failed to save',
        message: 'Could not update branch information.',
      });
    } finally {
      setSavingBranch(false);
    }
  };

  const handleSaveThresholds = async (e: FormEvent) => {
    e.preventDefault();
    if (!state.data) return;

    if (needsAttentionMin >= onTargetMin) {
      showToast({
        tone: 'danger',
        title: 'Validation error',
        message: 'The "Needs Attention" minimum must be lower than the "On Target" minimum.',
      });
      return;
    }

    setSavingThresholds(true);
    try {
      const updated: SystemSettings = {
        ...state.data,
        thresholds: {
          ...state.data.thresholds,
          onTargetMin: Number(onTargetMin),
          needsAttentionMin: Number(needsAttentionMin),
        },
      };
      await settingsService.update(updated);
      state.setData(updated);
      showToast({ tone: 'success', title: 'Thresholds saved', message: 'Performance rating thresholds updated.' });
    } catch {
      showToast({ tone: 'danger', title: 'Failed to save', message: 'Could not update threshold settings.' });
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleSavePolicy = async (e: FormEvent) => {
    e.preventDefault();
    if (!state.data) return;

    setSavingPolicy(true);
    try {
      const updated: SystemSettings = {
        ...state.data,
        entryPolicy: {
          ...state.data.entryPolicy,
          allowEditSubmitted: allowEdit,
          backdateDays: Number(backdateDays),
        },
        weightingEnabled,
      };
      await settingsService.update(updated);
      state.setData(updated);
      showToast({ tone: 'success', title: 'Policy saved', message: 'KPI submission policies updated.' });
    } catch {
      showToast({ tone: 'danger', title: 'Failed to save', message: 'Could not update policy settings.' });
    } finally {
      setSavingPolicy(false);
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
      showToast({ tone: 'success', title: 'Password changed', message: 'Manager password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch {
      showToast({ tone: 'danger', title: 'Failed', message: 'Could not update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!settingsService.resetDemoData) return;
    setResetting(true);
    try {
      await settingsService.resetDemoData();
      showToast({
        tone: 'neutral',
        title: 'Demo database reset',
        message: 'Sample records and seed transactions restored.',
      });
      setResetConfirmOpen(false);
      window.location.reload();
    } catch {
      showToast({ tone: 'danger', title: 'Reset failed', message: 'Could not reset demo database.' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Settings & Policies"
        description="Branch profile, performance thresholds, submission policies, and system configuration."
        documentTitle="Settings"
      />

      <AsyncBoundary state={state}>
        {(settings) => {
          return (
            <div className="space-y-6">
              {/* Branch Information */}
              <Card>
                <CardHeader
                  title="Branch Information"
                  description="Primary branch identification and operational instance configuration."
                  actions={
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                      Active Branch Instance
                    </span>
                  }
                />
                <CardBody className="space-y-4">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    As branch administrator, you can update this branch's official name and branch code. Changes immediately reflect in top navigation, employee profiles, and registration records.
                  </p>

                  <form onSubmit={handleSaveBranch} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Branch Name"
                        error={branchErrors.branchName}
                        hint="Official name of this branch (e.g. Finfine Main Branch, Bole Medhanialem Branch)."
                        required
                      >
                        <Input
                          value={branchName}
                          onChange={(e) => {
                            setBranchName(e.target.value);
                            if (branchErrors.branchName) setBranchErrors((err) => ({ ...err, branchName: undefined }));
                          }}
                          leftIcon={<Building2 className="size-4 text-zinc-400" />}
                          placeholder="e.g. Bole Medhanialem Branch"
                          autoComplete="off"
                        />
                      </Field>

                      <Field
                        label="Branch Code"
                        error={branchErrors.branchCode}
                        hint="Official BoA branch identifier or ledger code (e.g. BOA-001, BOLE-104)."
                        required
                      >
                        <Input
                          value={branchCode}
                          onChange={(e) => {
                            setBranchCode(e.target.value.toUpperCase());
                            if (branchErrors.branchCode) setBranchErrors((err) => ({ ...err, branchCode: undefined }));
                          }}
                          leftIcon={<Hash className="size-4 text-zinc-400" />}
                          placeholder="e.g. BOA-001"
                          autoComplete="off"
                          className="font-mono uppercase"
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-100 pt-3">
                      <div className="text-[11.5px] text-zinc-400">
                        Current active branch:{' '}
                        <span className="font-semibold text-zinc-700">{settings.branchName}</span>{' '}
                        <span className="font-mono text-zinc-500">({settings.branchCode})</span>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingBranch}
                        leftIcon={<Save className="size-4" />}
                      >
                        Save Branch Information
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Branch Manager Profile & Account Credentials */}
              <Card>
                <CardHeader
                  title="Branch Manager Identity & Credentials"
                  description="Administrative credentials and official identity of the presiding Branch Manager. Changing manager identity updates official records, while email updates require 6-digit Brevo email verification."
                  actions={
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300 bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-900">
                      <ShieldCheck className="size-3.5 text-gold-600" />
                      Appointed Manager
                    </span>
                  }
                />
                <CardBody className="space-y-6">
                  {/* Manager Full Name Update */}
                  <form onSubmit={handleSaveManagerName} className="space-y-4 pb-6 border-b border-zinc-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-900">Manager Full Name</h4>
                      <span className="text-[11px] font-mono text-zinc-400">Employee ID: {user?.employeeId || 'BOA-M001'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1">
                        <Field
                          label="Full Name"
                          error={managerNameError || undefined}
                          hint="Official first, father's, and grandfather's name of the manager."
                          required
                        >
                          <Input
                            value={managerFullName}
                            onChange={(e) => {
                              setManagerFullName(e.target.value);
                              if (managerNameError) setManagerNameError(null);
                            }}
                            leftIcon={<UserIcon className="size-4 text-zinc-400" />}
                            placeholder="e.g. Abebe Kebede"
                          />
                        </Field>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingManagerName}
                        leftIcon={<Save className="size-3.5" />}
                        className="sm:mb-6"
                      >
                        Update Name
                      </Button>
                    </div>
                  </form>

                  {/* Manager Email Update with Verification */}
                  <form onSubmit={handleRequestEmailChange} className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Manager Email Address</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Changing the manager email requires a 6-digit verification code sent to the new address before the update is applied.
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-zinc-400 block text-[11px]">Current Registered Email</span>
                        <span className="font-semibold text-zinc-900 font-mono mt-0.5 block">{user?.email}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <CheckCircle2 className="size-3" />
                        Verified Active
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1">
                        <Field
                          label="New Email Address"
                          error={emailChangeError || undefined}
                          hint="Enter the new official email address to transfer manager notifications and recovery access."
                          required
                        >
                          <Input
                            type="email"
                            value={newManagerEmail}
                            onChange={(e) => {
                              setNewManagerEmail(e.target.value);
                              if (emailChangeError) setEmailChangeError(null);
                            }}
                            leftIcon={<Mail className="size-4 text-zinc-400" />}
                            placeholder="e.g. new.manager@abyssinia.et"
                          />
                        </Field>
                      </div>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={requestingEmailChange}
                        leftIcon={<Mail className="size-3.5" />}
                        className="sm:mb-6"
                      >
                        Send Verification Code
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Branch Staff Positions Management */}
              <PositionManagementSection />

              {/* Performance Status Thresholds */}
              <Card>
                <CardHeader
                  title="Performance Thresholds"
                  description="Percentage benchmarks that categorize staff achievements into On Target, Needs Attention, and Below Target."
                />
                <CardBody className="space-y-4">
                  <PendingValidationNotice
                    basis={settings.thresholds.status}
                  />

                  <form onSubmit={handleSaveThresholds} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="On Target Minimum (%)"
                        hint="Staff scoring at or above this percentage receive the 'On Target' rating."
                        required
                      >
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={onTargetMin}
                          onChange={(e) => setOnTargetMin(Number(e.target.value))}
                        />
                      </Field>

                      <Field
                        label="Needs Attention Minimum (%)"
                        hint="Staff scoring between this value and the On Target threshold receive 'Needs Attention'."
                        required
                      >
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={needsAttentionMin}
                          onChange={(e) => setNeedsAttentionMin(Number(e.target.value))}
                        />
                      </Field>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="primary" loading={savingThresholds}>
                        Save Thresholds
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* KPI Entry & Weighting Policies */}
              <Card>
                <CardHeader
                  title="KPI Submission & Weighting Policy"
                  description="Rules governing daily recording windows, submission editing, and weighted formulas."
                />
                <CardBody className="space-y-4">
                  <PendingValidationNotice
                    basis={settings.entryPolicy.status}
                  />

                  <form onSubmit={handleSavePolicy} className="space-y-4">
                    <div className="space-y-3">
                      <Checkbox
                        checked={allowEdit}
                        onChange={(e) => setAllowEdit(e.target.checked)}
                        label="Allow editing submitted entries"
                        description="When enabled, staff can update an existing entry for an eligible past date within the allowable backdating window."
                      />

                      <Checkbox
                        checked={weightingEnabled}
                        onChange={(e) => setWeightingEnabled(e.target.checked)}
                        label="Enable KPI Weighting"
                        description="Calculate aggregated overall scores by multiplying KPI percentages by assigned weight percentages."
                      />
                    </div>

                    <Field
                      label="Maximum Backdating Window (Days)"
                      hint="Number of past calendar days staff are permitted to backdate KPI entries."
                      className="max-w-xs pt-2"
                    >
                      <Input
                        type="number"
                        min={0}
                        max={14}
                        value={backdateDays}
                        onChange={(e) => setBackdateDays(Number(e.target.value))}
                      />
                    </Field>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="primary" loading={savingPolicy}>
                        Save Policy Settings
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Account Security Card */}
              <Card>
                <CardHeader
                  title="Manager Account Security"
                  description="Update password credentials for the branch manager administrator account."
                />
                <CardBody>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <Field label="Current Password" error={passwordErrors.currentPassword} required>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="New Password" error={passwordErrors.newPassword} required>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          leftIcon={<KeyRound className="size-4 text-zinc-400" />}
                        />
                      </Field>

                      <Field label="Confirm Password" error={passwordErrors.confirmPassword} required>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          leftIcon={<ShieldCheck className="size-4 text-zinc-400" />}
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

              {/* Demo Mode Database Reset (mock mode only) */}
              {env.useMockApi && (
                <Card className="border-violet-200 bg-violet-50/30">
                  <CardHeader
                    title="Demonstration Database Control"
                    description="Reset the browser's localStorage mock database back to original baseline seed records."
                  />
                  <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-zinc-600">
                      Restores initial sample KPIs, staff rosters, seed entries, announcements, and feedback.
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<RotateCcw className="size-3.5" />}
                      onClick={() => setResetConfirmOpen(true)}
                    >
                      Reset Demo Data
                    </Button>
                  </CardBody>
                </Card>
              )}

              {/* Confirm Reset Dialog */}
              <ConfirmDialog
                open={resetConfirmOpen}
                onCancel={() => setResetConfirmOpen(false)}
                onConfirm={handleResetDemoData}
                title="Reset Demonstration Database"
                description="Are you sure you want to reseed the demonstration database? All locally recorded KPI entries, announcements, and custom feedback will be replaced by initial demo data."
                confirmLabel="Reset to Seed"
                destructive
                loading={resetting}
              />

              {/* Manager Email Verification Dialog */}
              <Dialog
                open={emailChangeModalOpen}
                onClose={() => {
                  if (!verifyingCode) setEmailChangeModalOpen(false);
                }}
                title="Verify New Manager Email Address"
                description={`Enter the 6-digit authorization code dispatched to ${newManagerEmail}.`}
                size="md"
                busy={verifyingCode}
                footer={
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setEmailChangeModalOpen(false)}
                      disabled={verifyingCode}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleVerifyEmailChange}
                      loading={verifyingCode}
                      disabled={verificationCode.trim().length !== 6 || emailTimer.isExpired}
                    >
                      Confirm Email Update
                    </Button>
                  </>
                }
              >
                <div className="space-y-4 py-2">
                  <Alert tone="info">
                    A secure 6-digit verification code has been dispatched to{' '}
                    <strong className="text-zinc-900 font-bold">{newManagerEmail}</strong>.
                    This code expires in 5 minutes.
                  </Alert>

                  <Field
                    label="6-Digit Verification Code"
                    error={verifyModalError || undefined}
                    required
                    hint="Check your inbox or spam folder for the one-time code."
                  >
                    <Input
                      value={verificationCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(val);
                        if (verifyModalError) setVerifyModalError(null);
                      }}
                      placeholder="• • • • • •"
                      maxLength={6}
                      autoFocus
                      className="text-center font-mono text-xl tracking-[0.3em] font-black h-12"
                    />
                  </Field>

                  {/* Expiration countdown & resend */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="size-3.5 text-zinc-400" />
                      {emailTimer.isExpired ? (
                        <span className="text-red-600 font-semibold">Code expired</span>
                      ) : (
                        <span>Expires in {emailTimer.formatExpires}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!emailTimer.canResend || verifyingCode}
                      onClick={handleResendEmailCode}
                      className="font-medium text-gold-700 hover:text-gold-800 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {emailTimer.canResend ? 'Resend Code' : `Resend in ${emailTimer.formatResend}`}
                    </button>
                  </div>
                </div>
              </Dialog>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
