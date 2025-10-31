/**
 * Module 05: Token Exchange - Compliance Service
 *
 * Manages spot-only compliance alerts and violation reporting
 */

import {
  ComplianceAlert,
  ComplianceStatusResponse,
  ReportViolationDTO,
  ReportViolationResponse,
  AlertType,
  AlertSeverity,
  TokenType,
} from '../types/token-exchange.types';
import { query, insert, update, findMany, count } from '../utils/database';

// ============================================================================
// Compliance Status
// ============================================================================

/**
 * Get overall compliance status for all tokens
 */
export async function getComplianceStatus(): Promise<ComplianceStatusResponse> {
  // Get stats for PollCoin
  const pollStats = await getTokenComplianceStats('pollcoin');

  // Get stats for Gratium
  const gratStats = await getTokenComplianceStats('gratium');

  // Get active alerts
  const activeAlerts = await findMany<ComplianceAlert>(
    'compliance_alerts',
    { status: 'open' },
    { orderBy: 'created_at DESC', limit: 5 }
  );

  const activeCount = await count('compliance_alerts', { status: 'open' });

  // Determine overall status
  const overallStatus =
    pollStats.violations > 0 || gratStats.violations > 0
      ? 'violation_detected'
      : 'compliant';

  return {
    overall_status: overallStatus,
    last_check: new Date(),
    tokens: {
      pollcoin: pollStats,
      gratium: gratStats,
    },
    alerts: {
      active: activeCount,
      recent: activeAlerts,
    },
  };
}

/**
 * Get compliance stats for a specific token
 */
async function getTokenComplianceStats(tokenType: TokenType) {
  const result = await query<{
    total: string;
    compliant: string;
    violations: string;
  }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN compliance_status = 'compliant' THEN 1 ELSE 0 END) as compliant,
      SUM(CASE WHEN compliance_status = 'violation_detected' THEN 1 ELSE 0 END) as violations
     FROM dex_listings
     WHERE token_type = $1`,
    [tokenType]
  );

  const stats = result.rows[0] || { total: '0', compliant: '0', violations: '0' };
  const total = parseInt(stats.total);
  const compliant = parseInt(stats.compliant);
  const violations = parseInt(stats.violations);

  let summary = 'All DEX listings are spot-only compliant';
  if (violations > 0) {
    summary = `${violations} violation(s) detected out of ${total} listings`;
  } else if (total === 0) {
    summary = 'No DEX listings found';
  }

  return {
    status: violations > 0 ? ('violation_detected' as const) : ('compliant' as const),
    total_listings: total,
    compliant_listings: compliant,
    violations,
    summary,
  };
}

// ============================================================================
// Alert Management
// ============================================================================

/**
 * Create a compliance alert
 */
export async function createAlert(data: {
  alert_type: AlertType;
  severity: AlertSeverity;
  token_type?: TokenType;
  dex_name?: string;
  pool_address?: string;
  description: string;
  recommended_action?: string;
}): Promise<ComplianceAlert> {
  return await insert<ComplianceAlert>('compliance_alerts', {
    alert_type: data.alert_type,
    severity: data.severity,
    token_type: data.token_type || null,
    dex_name: data.dex_name || null,
    pool_address: data.pool_address || null,
    description: data.description,
    recommended_action: data.recommended_action || null,
    status: 'open',
  });
}

/**
 * Resolve a compliance alert
 */
export async function resolveAlert(
  alertId: string,
  resolutionNotes: string
): Promise<ComplianceAlert | null> {
  return await update<ComplianceAlert>(
    'compliance_alerts',
    { id: alertId },
    {
      status: 'resolved',
      resolved_at: new Date(),
      resolution_notes: resolutionNotes,
    }
  );
}

/**
 * Dismiss an alert (false positive)
 */
export async function dismissAlert(
  alertId: string,
  reason: string
): Promise<ComplianceAlert | null> {
  return await update<ComplianceAlert>(
    'compliance_alerts',
    { id: alertId },
    {
      status: 'dismissed',
      resolved_at: new Date(),
      resolution_notes: `Dismissed: ${reason}`,
    }
  );
}

/**
 * Get all alerts (filterable)
 */
export async function getAlerts(filters?: {
  status?: 'open' | 'investigating' | 'resolved' | 'dismissed';
  severity?: AlertSeverity;
  token_type?: TokenType;
}): Promise<ComplianceAlert[]> {
  return await findMany<ComplianceAlert>(
    'compliance_alerts',
    filters,
    { orderBy: 'created_at DESC' }
  );
}

// ============================================================================
// Violation Reporting
// ============================================================================

/**
 * User-reported violation
 */
export async function reportViolation(
  data: ReportViolationDTO
): Promise<ReportViolationResponse> {
  // Determine severity based on violation type
  const severityMap: Record<AlertType, AlertSeverity> = {
    lending_integration_detected: 'critical',
    shorting_enabled_on_pool: 'critical',
    margin_trading_enabled: 'critical',
    flash_loan_enabled: 'warning',
    unusual_volume_spike: 'warning',
    price_manipulation_suspected: 'critical',
    whale_accumulation: 'info',
    regulatory_concern: 'warning',
  };

  const severity = severityMap[data.violation_type] || 'warning';

  // Create alert
  const alert = await createAlert({
    alert_type: data.violation_type,
    severity,
    dex_name: data.dex_name,
    pool_address: data.pool_address,
    description: `User-reported: ${data.description}${data.evidence_url ? ` (Evidence: ${data.evidence_url})` : ''}`,
    recommended_action: 'Investigate user report and verify violation',
  });

  // In production: Reward user with Light Score for helping maintain compliance
  const rewardLightScore = severity === 'critical';

  return {
    success: true,
    report_id: alert.id,
    status: 'received',
    reward_light_score: rewardLightScore,
    message: 'Thank you! Our compliance team will investigate.',
  };
}

// ============================================================================
// Automated Compliance Checks
// ============================================================================

/**
 * Scan DEX listings for violations (scheduled job)
 */
export async function scanForViolations(): Promise<{
  violations_found: number;
  alerts_created: number;
}> {
  // Get all listings that might have violations
  const suspiciousListings = await query<{
    id: string;
    dex_name: string;
    token_type: string;
    pool_address: string;
    is_leverage_pool: boolean;
    is_shorting_enabled: boolean;
    has_lending_integration: boolean;
  }>(
    `SELECT id, dex_name, token_type, pool_address,
            is_leverage_pool, is_shorting_enabled, has_lending_integration
     FROM dex_listings
     WHERE (is_leverage_pool = true OR is_shorting_enabled = true OR has_lending_integration = true)
       AND compliance_status != 'blocked'`
  );

  let alertsCreated = 0;

  for (const listing of suspiciousListings.rows) {
    // Check if alert already exists for this pool
    const existingAlert = await query<ComplianceAlert>(
      `SELECT id FROM compliance_alerts
       WHERE pool_address = $1 AND status IN ('open', 'investigating')
       LIMIT 1`,
      [listing.pool_address]
    );

    if (existingAlert.rows.length === 0) {
      // Create new alert
      let alertType: AlertType = 'lending_integration_detected';
      if (listing.is_shorting_enabled) {
        alertType = 'shorting_enabled_on_pool';
      } else if (listing.is_leverage_pool) {
        alertType = 'margin_trading_enabled';
      }

      await createAlert({
        alert_type: alertType,
        severity: 'critical',
        token_type: listing.token_type as TokenType,
        dex_name: listing.dex_name,
        pool_address: listing.pool_address,
        description: `Automated scan detected spot-only violation on ${listing.dex_name} for ${listing.token_type}`,
        recommended_action: 'Block this pool and investigate further',
      });

      alertsCreated++;
    }
  }

  return {
    violations_found: suspiciousListings.rows.length,
    alerts_created: alertsCreated,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  getComplianceStatus,
  createAlert,
  resolveAlert,
  dismissAlert,
  getAlerts,
  reportViolation,
  scanForViolations,
};
