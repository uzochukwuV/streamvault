/**
 * OracleMonitor - Health monitoring and alerting for the Creator Metrics Oracle
 *
 * Features:
 * - Real-time health metrics
 * - Failed transaction tracking
 * - Performance monitoring
 * - Alert system for critical issues
 * - Automated recovery suggestions
 */

import { creatorMetricsOracle } from "./CreatorMetricsOracle";
import { BlockchainErrorHandler } from "./BlockchainErrorHandler";

interface HealthMetrics {
  timestamp: Date;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  averageGasUsed: number;
  averageResponseTime: number;
  networkStatus: 'healthy' | 'degraded' | 'critical';
  lastSuccessfulSync: Date | null;
  failedTransactions: number;
  pendingRetries: number;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export class OracleMonitor {
  private healthHistory: HealthMetrics[] = [];
  private alerts: Alert[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Health thresholds
  private readonly THRESHOLDS = {
    SUCCESS_RATE_WARNING: 0.9,    // 90% success rate
    SUCCESS_RATE_CRITICAL: 0.7,   // 70% success rate
    MAX_FAILED_TRANSACTIONS: 10,
    MAX_RESPONSE_TIME_MS: 30000,  // 30 seconds
    STALE_DATA_THRESHOLD_HOURS: 2 // 2 hours without successful sync
  };

  constructor(private errorHandler: BlockchainErrorHandler) {}

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMinutes: number = 5): void {
    if (this.isMonitoring) {
      console.log("⚠️ Monitor is already running");
      return;
    }

    console.log(`🔍 Starting oracle monitoring (interval: ${intervalMinutes} minutes)`);

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectHealthMetrics();
      this.checkAlerts();
    }, intervalMinutes * 60 * 1000);

    // Initial health check
    this.collectHealthMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("🛑 Oracle monitoring stopped");
  }

  /**
   * Collect current health metrics
   */
  async collectHealthMetrics(): Promise<HealthMetrics> {
    try {
      const timestamp = new Date();

      // Get error handler metrics
      const errorMetrics = this.errorHandler.getHealthMetrics();

      // Calculate success rate from recent history
      const recentMetrics = this.getRecentMetrics(24); // Last 24 hours
      const totalSyncs = recentMetrics.reduce((sum, m) => sum + m.totalSyncs, 0);
      const successfulSyncs = recentMetrics.reduce((sum, m) => sum + m.successfulSyncs, 0);
      const successRate = totalSyncs > 0 ? successfulSyncs / totalSyncs : 1;

      // Calculate average metrics
      const averageGasUsed = this.calculateAverageGasUsed(recentMetrics);
      const averageResponseTime = this.calculateAverageResponseTime(recentMetrics);

      // Determine network status
      const networkStatus = this.determineNetworkStatus(successRate, errorMetrics, averageResponseTime);

      const healthMetrics: HealthMetrics = {
        timestamp,
        totalSyncs,
        successfulSyncs,
        failedSyncs: totalSyncs - successfulSyncs,
        successRate,
        averageGasUsed,
        averageResponseTime,
        networkStatus,
        lastSuccessfulSync: this.getLastSuccessfulSync(),
        failedTransactions: errorMetrics.totalFailedTransactions,
        pendingRetries: errorMetrics.recentFailures
      };

      // Store metrics
      this.healthHistory.push(healthMetrics);

      // Keep only last 7 days of metrics
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.healthHistory = this.healthHistory.filter(m => m.timestamp > sevenDaysAgo);

      console.log(`📊 Health metrics collected:`, {
        successRate: `${(successRate * 100).toFixed(1)}%`,
        networkStatus,
        failedTransactions: errorMetrics.totalFailedTransactions,
        pendingRetries: errorMetrics.recentFailures
      });

      return healthMetrics;

    } catch (error: any) {
      console.error("❌ Failed to collect health metrics:", error.message);

      // Return emergency metrics
      return {
        timestamp: new Date(),
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        averageGasUsed: 0,
        averageResponseTime: 0,
        networkStatus: 'critical',
        lastSuccessfulSync: null,
        failedTransactions: 0,
        pendingRetries: 0
      };
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const latestMetrics = this.healthHistory[this.healthHistory.length - 1];
    if (!latestMetrics) return;

    // Check success rate alerts
    if (latestMetrics.successRate < this.THRESHOLDS.SUCCESS_RATE_CRITICAL) {
      this.createAlert('critical', 'LOW_SUCCESS_RATE',
        `Success rate critically low: ${(latestMetrics.successRate * 100).toFixed(1)}%`,
        { successRate: latestMetrics.successRate }
      );
    } else if (latestMetrics.successRate < this.THRESHOLDS.SUCCESS_RATE_WARNING) {
      this.createAlert('high', 'LOW_SUCCESS_RATE',
        `Success rate below warning threshold: ${(latestMetrics.successRate * 100).toFixed(1)}%`,
        { successRate: latestMetrics.successRate }
      );
    }

    // Check for stale data
    if (latestMetrics.lastSuccessfulSync) {
      const hoursSinceLastSync = (Date.now() - latestMetrics.lastSuccessfulSync.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSync > this.THRESHOLDS.STALE_DATA_THRESHOLD_HOURS) {
        this.createAlert('critical', 'STALE_DATA',
          `No successful sync in ${hoursSinceLastSync.toFixed(1)} hours`,
          { hoursSinceLastSync }
        );
      }
    }

    // Check failed transactions
    if (latestMetrics.failedTransactions > this.THRESHOLDS.MAX_FAILED_TRANSACTIONS) {
      this.createAlert('high', 'HIGH_FAILURE_RATE',
        `High number of failed transactions: ${latestMetrics.failedTransactions}`,
        { failedTransactions: latestMetrics.failedTransactions }
      );
    }

    // Check response time
    if (latestMetrics.averageResponseTime > this.THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      this.createAlert('medium', 'SLOW_RESPONSE',
        `Slow response times: ${(latestMetrics.averageResponseTime / 1000).toFixed(1)}s average`,
        { responseTimeMs: latestMetrics.averageResponseTime }
      );
    }

    // Check network status
    if (latestMetrics.networkStatus === 'critical') {
      this.createAlert('critical', 'NETWORK_CRITICAL',
        'Network status is critical - immediate attention required',
        { networkStatus: latestMetrics.networkStatus }
      );
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(
    severity: Alert['severity'],
    type: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alertId = `${type}-${Date.now()}`;

    // Check if similar alert already exists and is unresolved
    const existingAlert = this.alerts.find(a =>
      a.type === type && !a.resolved &&
      (Date.now() - a.timestamp.getTime()) < 60 * 60 * 1000 // Within last hour
    );

    if (existingAlert) {
      console.log(`⚠️ Skipping duplicate alert: ${type}`);
      return;
    }

    const alert: Alert = {
      id: alertId,
      severity,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata
    };

    this.alerts.push(alert);

    console.log(`🚨 ${severity.toUpperCase()} ALERT: ${message}`);

    // Send alert to external systems
    this.sendAlert(alert);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Resolved alert: ${alert.message}`);
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    activeAlerts: number;
    criticalAlerts: number;
    lastHealthCheck: Date | null;
    uptime: string;
    recommendations: string[];
  } {
    const latestMetrics = this.healthHistory[this.healthHistory.length - 1];
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

    // Generate recommendations
    const recommendations = this.generateRecommendations(latestMetrics, activeAlerts);

    return {
      status: latestMetrics?.networkStatus || 'critical',
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastHealthCheck: latestMetrics?.timestamp || null,
      uptime: this.calculateUptime(),
      recommendations
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    metrics: HealthMetrics | undefined,
    activeAlerts: Alert[]
  ): string[] {
    const recommendations: string[] = [];

    if (!metrics) {
      recommendations.push("System health metrics unavailable - check oracle service");
      return recommendations;
    }

    if (metrics.successRate < this.THRESHOLDS.SUCCESS_RATE_WARNING) {
      recommendations.push("Low success rate detected - check network connectivity and gas settings");
    }

    if (metrics.failedTransactions > 5) {
      recommendations.push("Multiple failed transactions - consider increasing gas price or checking wallet balance");
    }

    if (metrics.averageResponseTime > 15000) {
      recommendations.push("Slow response times - check Filecoin network status");
    }

    if (metrics.pendingRetries > 0) {
      recommendations.push(`${metrics.pendingRetries} transactions pending retry - monitor for resolution`);
    }

    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push("Critical alerts active - immediate investigation required");
    }

    if (recommendations.length === 0) {
      recommendations.push("System operating normally - no action required");
    }

    return recommendations;
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(hours: number): HealthMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.healthHistory.filter(m => m.timestamp > cutoff);
  }

  /**
   * Calculate average gas used
   */
  private calculateAverageGasUsed(metrics: HealthMetrics[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.averageGasUsed, 0);
    return total / metrics.length;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(metrics: HealthMetrics[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0);
    return total / metrics.length;
  }

  /**
   * Determine network status
   */
  private determineNetworkStatus(
    successRate: number,
    errorMetrics: any,
    responseTime: number
  ): 'healthy' | 'degraded' | 'critical' {
    if (successRate < this.THRESHOLDS.SUCCESS_RATE_CRITICAL ||
        errorMetrics.recentFailures > 10 ||
        responseTime > this.THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      return 'critical';
    }

    if (successRate < this.THRESHOLDS.SUCCESS_RATE_WARNING ||
        errorMetrics.recentFailures > 5 ||
        responseTime > 15000) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get last successful sync time
   */
  private getLastSuccessfulSync(): Date | null {
    // This would typically query your database for the last successful sync
    // For now, return a recent time if we have recent successful metrics
    const recentSuccess = this.healthHistory
      .filter(m => m.successRate > 0)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    return recentSuccess?.timestamp || null;
  }

  /**
   * Calculate system uptime
   */
  private calculateUptime(): string {
    if (this.healthHistory.length === 0) return "No data";

    const firstMetric = this.healthHistory[0];
    const uptimeMs = Date.now() - firstMetric.timestamp.getTime();

    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
  }

  /**
   * Send alert to external systems
   */
  private async sendAlert(alert: Alert): Promise<void> {
    try {
      // TODO: Implement integration with your alerting systems
      // Examples:
      // - Send email via SendGrid/SES
      // - Send Slack notification
      // - Send Discord webhook
      // - Log to monitoring service (Sentry, DataDog, etc.)

      console.log(`📤 Sending ${alert.severity} alert to external systems:`, alert.message);

      // Placeholder for actual implementation
      if (alert.severity === 'critical') {
        // Send immediate notification for critical alerts
        console.log("🚨 CRITICAL ALERT - Immediate attention required!");
      }

    } catch (error: any) {
      console.error("❌ Failed to send alert:", error.message);
    }
  }

  /**
   * Get historical health data for dashboards
   */
  getHealthHistory(hours: number = 24): HealthMetrics[] {
    return this.getRecentMetrics(hours);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Export health report
   */
  exportHealthReport(): {
    generatedAt: Date;
    systemStatus: ReturnType<typeof this.getSystemStatus>;
    recentMetrics: HealthMetrics[];
    activeAlerts: Alert[];
    errorBreakdown: any;
  } {
    const errorMetrics = this.errorHandler.getHealthMetrics();

    return {
      generatedAt: new Date(),
      systemStatus: this.getSystemStatus(),
      recentMetrics: this.getRecentMetrics(24),
      activeAlerts: this.getActiveAlerts(),
      errorBreakdown: errorMetrics.errorTypes
    };
  }
}

// Export singleton instance
export const oracleMonitor = new OracleMonitor(
  // You'll need to pass the error handler instance here
  {} as BlockchainErrorHandler
);