// ============================================================================
// SYSTEM HEALTH COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Database, Server, HardDrive, Cpu } from 'lucide-react';
import { SystemHealth as SystemHealthType } from '@/types';

interface SystemHealthProps {
  health: SystemHealthType | null;
}

export function SystemHealth({ health }: SystemHealthProps) {
  // Early return if health data is not available
  if (!health) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <Activity className="w-8 h-8 text-gray-300" />
                <span>System health data not available</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string | undefined | null) => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }
    
    switch (status.toLowerCase()) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Overall System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium">System Health</span>
            {getStatusBadge(health?.overallStatus)}
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Database Connection</span>
              {getStatusBadge(health?.databaseStatus)}
            </div>
            <div className="flex items-center justify-between">
              <span>Database Size</span>
              <span className="text-sm text-gray-600">{formatBytes(health?.databaseSize || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Connections</span>
              <span className="text-sm text-gray-600">{health?.activeConnections || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Server Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Server Uptime</span>
              <span className="text-sm text-gray-600">{formatUptime(health?.serverUptime || 0)}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Memory Usage</span>
                <span className="text-sm text-gray-600">{health?.memoryUsage?.toFixed(1) || '0.0'}%</span>
              </div>
              <Progress value={health?.memoryUsage || 0} className="w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>CPU Usage</span>
                <span className="text-sm text-gray-600">{health?.cpuUsage?.toFixed(1) || '0.0'}%</span>
              </div>
              <Progress value={health?.cpuUsage || 0} className="w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Disk Usage</span>
                <span className="text-sm text-gray-600">{health?.diskUsage?.toFixed(1) || '0.0'}%</span>
              </div>
              <Progress value={health?.diskUsage || 0} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Average Response Time</span>
                <span className="text-sm text-gray-600">{health?.avgResponseTime || 0}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Requests per Second</span>
                <span className="text-sm text-gray-600">{health?.requestsPerSecond || 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Error Rate</span>
                <span className="text-sm text-gray-600">{(health?.errorRate || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Sessions</span>
                <span className="text-sm text-gray-600">{health?.activeSessions || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Storage</span>
              <span className="text-sm text-gray-600">{formatBytes(health?.totalStorage || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Used Storage</span>
              <span className="text-sm text-gray-600">{formatBytes(health?.usedStorage || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Available Storage</span>
              <span className="text-sm text-gray-600">{formatBytes(health?.availableStorage || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
