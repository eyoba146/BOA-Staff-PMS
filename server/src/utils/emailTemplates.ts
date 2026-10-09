/**
 * Premium Bank of Abyssinia branded transactional email templates.
 * Engineered for 100% responsive rendering across Gmail, Outlook, Apple Mail, and mobile clients.
 */

interface VerificationEmailOptions {
  fullName: string;
  code: string;
  referenceId?: string;
  purpose: 'registration' | 'password_reset' | 'test';
}

interface ApprovalEmailOptions {
  fullName: string;
  employeeId: string;
  position: string;
  branchName: string;
}

interface RejectionEmailOptions {
  fullName: string;
  referenceId?: string;
  reason: string;
  branchName: string;
}

export function renderVerificationCodeEmail({
  fullName,
  code,
  referenceId,
  purpose,
}: VerificationEmailOptions): string {
  const isPasswordReset = purpose === 'password_reset';
  const isTest = purpose === 'test';

  const headline = isPasswordReset
    ? 'Password Recovery Authorization'
    : isTest
    ? 'Email Integration Verified'
    : 'Verify Your Staff Account';

  const instruction = isPasswordReset
    ? 'We received a request to reset your branch workstation credentials. Please enter the following 6-digit one-time code to authorize your password update:'
    : isTest
    ? 'Your Brevo email delivery integration is officially verified and operational. Use this one-time code to complete your system validation:'
    : 'Thank you for submitting your staff registration request. Please enter the following 6-digit one-time authorization code to confirm your email:';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bank of Abyssinia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f2f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f2f4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Top Gold Brand Gradient Ribbon -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #b45309 0%, #d97706 25%, #f59e0b 50%, #fbbf24 85%, #d97706 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          
          <!-- Executive Header (Ink Black + Gold) -->
          <tr>
            <td style="background-color: #09090b; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Bank Brand Identity -->
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2.5px; color: #f59e0b; text-transform: uppercase; margin-bottom: 6px;">
                      BANK OF ABYSSINIA
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                      Branch Staff Performance System
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <!-- Security Badge -->
                    <div style="display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 9999px; color: #fbbf24; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      SECURITY AUTH
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 38px 36px 30px 36px; background-color: #ffffff;">
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.4px;">
                ${headline}
              </h1>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Hello <strong style="color: #09090b;">${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                ${instruction}
              </p>

              <!-- Luxury Black & Gold Authorization Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center" style="background: #09090b; border-radius: 14px; padding: 28px 24px; border: 1.5px solid #d97706; box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.08);">
                    <div style="font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">
                      One-Time Verification Code
                    </div>
                    <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #f59e0b; font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace; text-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);">
                      ${code}
                    </div>
                    <div style="margin-top: 14px; font-size: 12px; color: #a1a1aa; font-weight: 500;">
                      ⏱️ Valid for <strong style="color: #fbbf24;">5 minutes</strong> · Single-use only
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Reference Badge if available -->
              ${
                referenceId
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #64748b;">
                    Candidate Reference ID:
                  </td>
                  <td align="right" style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #09090b; font-family: monospace;">
                    ${referenceId}
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <!-- Bank Security Advisory Notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 3px;">
                      Bank Security Notice
                    </div>
                    <div style="font-size: 12.5px; line-height: 1.5; color: #b45309;">
                      Keep this code confidential. Bank of Abyssinia administrators and branch management will never ask for your one-time passwords or security credentials.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #71717a;">
                If you did not initiate this request, please disregard this email or report immediately to your branch manager.
              </p>
            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 26px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12.5px; font-weight: 700; color: #475569;">
                Bank of Abyssinia S.C. · Finfine Main Branch
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Internal Branch Staff Performance Management System (PMS)<br>
                This automated system notification contains privileged banking workstation communication.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function renderApprovalEmail({
  fullName,
  employeeId,
  position,
  branchName,
}: ApprovalEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Approved — Bank of Abyssinia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f2f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f2f4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #d97706 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color: #09090b; padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2.5px; color: #f59e0b; text-transform: uppercase; margin-bottom: 6px;">
                      BANK OF ABYSSINIA
                    </div>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                      Staff Account Approved
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="display: inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      ACTIVE
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 38px 36px 30px 36px; background-color: #ffffff;">
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.4px;">
                Welcome to the Branch Performance Portal
              </h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Hello <strong style="color: #09090b;">${fullName}</strong>,
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Your staff registration has been officially reviewed and approved by management for <strong>${branchName}</strong>. You are now authorized to sign in to your branch workstation.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      Official Employee ID
                    </div>
                    <div style="font-size: 26px; font-weight: 800; color: #09090b; font-family: monospace; letter-spacing: 2px;">
                      ${employeeId}
                    </div>
                    <div style="margin-top: 12px; font-size: 13px; color: #475569;">
                      Position: <strong style="color: #09090b;">${position}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14.5px; line-height: 1.6; color: #52525b;">
                You can now log in using your assigned Employee ID (<strong>${employeeId}</strong>) and the password you created during registration.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 26px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12.5px; font-weight: 700; color: #475569;">
                Bank of Abyssinia S.C. · ${branchName}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Internal Branch Staff Performance Management System (PMS)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function renderRejectionEmail({
  fullName,
  referenceId,
  reason,
  branchName,
}: RejectionEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Update — Bank of Abyssinia</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f2f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f2f4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="height: 6px; background: #ef4444; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color: #09090b; padding: 32px 36px; text-align: left;">
              <div style="font-size: 11px; font-weight: 800; letter-spacing: 2.5px; color: #f59e0b; text-transform: uppercase; margin-bottom: 6px;">
                BANK OF ABYSSINIA
              </div>
              <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                Staff Registration Status Update
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 38px 36px 30px 36px; background-color: #ffffff;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Hello <strong style="color: #09090b;">${fullName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #52525b;">
                Your staff registration for <strong>${branchName}</strong> has been reviewed. At this time, management has not approved the application.
              </p>

              <!-- Reason Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">
                      Management Review Note
                    </div>
                    <div style="font-size: 13.5px; line-height: 1.5; color: #7f1d1d;">
                      ${reason}
                    </div>
                  </td>
                </tr>
              </table>

              ${
                referenceId
                  ? `
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Tracking Reference ID: <strong style="color: #09090b; font-family: monospace;">${referenceId}</strong>
              </p>
              `
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 26px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12.5px; font-weight: 700; color: #475569;">
                Bank of Abyssinia S.C. · ${branchName}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Internal Branch Staff Performance Management System (PMS)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
