// ============================================================================
// TENANT MANAGEMENT COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Building, Trash2, Power, PowerOff } from 'lucide-react';
import { Tenant, User } from '@/types';

interface TenantManagementProps {
  tenants: Tenant[];
  expandedTenants: Set<string>;
  onToggleTenantExpansion: (tenantId: string) => void;
  onViewTenantDetails: (tenant: Tenant) => void;
  onDeleteTenant: (tenant: Tenant) => void;
  onDeactivateTenant: (tenant: Tenant) => void;
  onActivateTenant: (tenant: Tenant) => void;
  onDeleteUser: (user: User) => void;
  onDeactivateUser: (user: User) => void;
  onActivateUser: (user: User) => void;
}

export function TenantManagement({
  tenants,
  expandedTenants,
  onToggleTenantExpansion,
  onViewTenantDetails,
  onDeleteTenant,
  onDeactivateTenant,
  onActivateTenant,
  onDeleteUser,
  onDeactivateUser,
  onActivateUser,
}: TenantManagementProps) {
  // Helper functions to handle both snake_case and camelCase properties
  const getUserFirstName = (user: User) => user.firstName || user.first_name || '';
  const getUserLastName = (user: User) => user.lastName || user.last_name || '';
  const getUserRole = (user: User) => user.organizationRole || user.organization_role || '';
  const getUserCreatedAt = (user: User) => user.createdAt || user.created_at || '';
  const getUserLastLogin = (user: User) => user.lastLogin || user.last_login;
  const getUserIsActive = (user: User) => user.isActive !== undefined ? user.isActive : user.is_active;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenants & Users Overview</CardTitle>
        <CardDescription>All registered tenants and their users</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant ID</TableHead>
              <TableHead>Tenant Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Trailers</TableHead>
              <TableHead>Providers</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants && tenants.length > 0 ? (
              tenants.map((tenant) => (
                <React.Fragment key={tenant.tenantId}>
                  <TableRow>
                    <TableCell className="font-medium">{tenant.tenantId}</TableCell>
                    <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} 
                             className={tenant.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}>
                        {tenant.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{tenant.userCount || tenant.user_count || 0}</span>
                        <span className="text-xs text-gray-500">
                          {tenant.status === 'active' 
                            ? `${tenant.activeUserCount || tenant.active_user_count || 0} active` 
                            : `${(tenant.userCount || tenant.user_count || 0) - (tenant.activeUserCount || tenant.active_user_count || 0)} inactive`
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{tenant.companyCount || tenant.company_count || 0}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50">
                        {tenant.trailerCount || tenant.trailer_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.providerCount || tenant.provider_count || 0}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(tenant.lastActivity || tenant.last_activity).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleTenantExpansion(tenant.tenantId)}
                          className="h-8 w-8 p-0"
                          title="View Users"
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewTenantDetails(tenant)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Building className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDeactivateTenant(tenant)}
                          className="h-8 w-8 p-0"
                          title="Deactivate Tenant"
                        >
                          <PowerOff className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onActivateTenant(tenant)}
                          className="h-8 w-8 p-0"
                          title="Activate Tenant"
                        >
                          <Power className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteTenant(tenant)}
                          className="h-8 w-8 p-0"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedTenants.has(tenant.tenantId) && (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <div className="bg-gray-50 p-4 border-t">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg">Users for {tenant.tenantId}</h4>
                            <Badge variant="secondary">{tenant.users?.length || 0} users</Badge>
                          </div>
                          {tenant.users && tenant.users.length > 0 ? (
                            <div className="overflow-hidden rounded-lg border bg-white">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    <TableHead className="font-medium">Name</TableHead>
                                    <TableHead className="font-medium">Email</TableHead>
                                    <TableHead className="font-medium">Role</TableHead>
                                    <TableHead className="font-medium">Status</TableHead>
                                    <TableHead className="font-medium">Created</TableHead>
                                    <TableHead className="font-medium">Last Login</TableHead>
                                    <TableHead className="font-medium">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tenant.users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-gray-50">
                                      <TableCell className="font-medium">
                                        {`${getUserFirstName(user)} ${getUserLastName(user)}`}
                                      </TableCell>
                                      <TableCell className="text-blue-600">{user.email}</TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={getUserRole(user) === 'owner' ? 'default' : 
                                                  getUserRole(user) === 'admin' ? 'secondary' : 'outline'}
                                          className={getUserRole(user) === 'owner' ? 'bg-purple-500' : 
                                                   getUserRole(user) === 'admin' ? 'bg-blue-500' : ''}
                                        >
                                          {getUserRole(user)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={getUserIsActive(user) ? 'default' : 'secondary'} 
                                               className={getUserIsActive(user) ? 'bg-green-500' : 'bg-gray-400'}>
                                          {getUserIsActive(user) ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-gray-600">
                                        {new Date(getUserCreatedAt(user)).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell className="text-gray-600">
                                        {getUserLastLogin(user) ? 
                                          new Date(getUserLastLogin(user)!).toLocaleDateString() : 
                                          <span className="text-gray-400">Never</span>
                                        }
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => onDeactivateUser(user)}
                                            className="h-6 w-6 p-0"
                                            title="Deactivate User"
                                          >
                                            <PowerOff className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => onActivateUser(user)}
                                            className="h-6 w-6 p-0"
                                            title="Activate User"
                                          >
                                            <Power className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => onDeleteUser(user)}
                                            className="h-6 w-6 p-0"
                                            title="Delete User"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <Users className="w-8 h-8 text-gray-300" />
                                <span>No users found for this tenant</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No tenants found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
