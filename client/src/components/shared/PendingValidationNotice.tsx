import type { RuleStatus } from '@/types';
import { Alert } from '../ui';

/**
 * Shown wherever calculated performance appears while rules/thresholds are not approved.
 * Required by the SRS requirement boundary (§2, §16): figures must not be presented as official.
 */
export function PendingValidationNotice({ basis, className }: { basis: RuleStatus; className?: string }) {
  if (basis === 'approved') return null;
  return (
    <Alert tone="validation" title="Demonstration figures — pending management validation" className={className}>
      Performance percentages and statuses use sample KPIs, a conceptual formula and placeholder thresholds. They will be
      replaced by the KPI definitions, formulas and thresholds approved by branch management.
    </Alert>
  );
}
