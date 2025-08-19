// ============================================================================
// ADMIN OVERVIEW COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminOverview as AdminOverviewType } from '@/types';

interface AdminOverviewProps {
  overview: AdminOverviewType;
  tenants: any[];
}

export function AdminOverview({ overview, tenants }: AdminOverviewProps) {
  const getStatusBadge = (status: string) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.totalTenants}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.totalUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.totalCompanies}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trailers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.totalTrailers || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tenants.reduce((sum, tenant) => sum + (tenant.providerCount || 0), 0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          {getStatusBadge(overview.systemStatus)}
        </CardContent>
      </Card>
    </div>
  );
}
