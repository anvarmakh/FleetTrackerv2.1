// ============================================================================
// ADMIN ACTIONS COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building, Users, Settings, UserPlus, Shield } from 'lucide-react';
import { Tenant, User } from '@/types';

interface AdminActionsProps {
  newTenantData: any;
  newUserData: any;
  tenants: Tenant[];
  onNewTenantDataChange: (data: any) => void;
  onNewUserDataChange: (data: any) => void;
  onCreateTenant: () => void;
  onCreateUser: () => void;

  onUserManagement: () => void;
  onTenantSettings: () => void;
}

export function AdminActions({
  newTenantData,
  newUserData,
  tenants,
  onNewTenantDataChange,
  onNewUserDataChange,
  onCreateTenant,
  onCreateUser,

  onUserManagement,
  onTenantSettings,
}: AdminActionsProps) {
  const handleTenantDataChange = (field: string, value: string) => {
    onNewTenantDataChange({
      ...newTenantData,
      [field]: value,
    });
  };

  const handleUserDataChange = (field: string, value: string) => {
    onNewUserDataChange({
      ...newUserData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Tenant and User Forms - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Tenant Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Create New Tenant
            </CardTitle>
            <CardDescription>
              Create a new tenant with initial company and owner user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Tenant Name</Label>
                <Input
                  id="tenantName"
                  placeholder="Enter tenant name"
                  value={newTenantData.tenantName || ''}
                  onChange={(e) => handleTenantDataChange('tenantName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={newTenantData.companyName || ''}
                  onChange={(e) => handleTenantDataChange('companyName', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Owner Email</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="Enter owner email"
                  value={newTenantData.ownerEmail || ''}
                  onChange={(e) => handleTenantDataChange('ownerEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerFirstName">Owner First Name</Label>
                <Input
                  id="ownerFirstName"
                  placeholder="Enter first name"
                  value={newTenantData.ownerFirstName || ''}
                  onChange={(e) => handleTenantDataChange('ownerFirstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerLastName">Owner Last Name</Label>
                <Input
                  id="ownerLastName"
                  placeholder="Enter last name"
                  value={newTenantData.ownerLastName || ''}
                  onChange={(e) => handleTenantDataChange('ownerLastName', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ownerPassword">Owner Password</Label>
                <Input
                  id="ownerPassword"
                  type="password"
                  placeholder="Enter password"
                  value={newTenantData.ownerPassword || ''}
                  onChange={(e) => handleTenantDataChange('ownerPassword', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={newTenantData.confirmPassword || ''}
                  onChange={(e) => handleTenantDataChange('confirmPassword', e.target.value)}
                />
              </div>
            </div>
            <Button onClick={onCreateTenant} className="w-full">
              Create Tenant
            </Button>
          </CardContent>
        </Card>

        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </CardTitle>
            <CardDescription>
              Create a new user for an existing tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  placeholder="Enter user email"
                  value={newUserData.email || ''}
                  onChange={(e) => handleUserDataChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userTenant">Tenant</Label>
                <Select
                  value={newUserData.tenantId || ''}
                  onValueChange={(value) => handleUserDataChange('tenantId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.tenantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userFirstName">First Name</Label>
                <Input
                  id="userFirstName"
                  placeholder="Enter first name"
                  value={newUserData.firstName || ''}
                  onChange={(e) => handleUserDataChange('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userLastName">Last Name</Label>
                <Input
                  id="userLastName"
                  placeholder="Enter last name"
                  value={newUserData.lastName || ''}
                  onChange={(e) => handleUserDataChange('lastName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Role</Label>
                <Select
                  value={newUserData.role || ''}
                  onValueChange={(value) => handleUserDataChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userPassword">Password</Label>
                <Input
                  id="userPassword"
                  type="password"
                  placeholder="Enter password"
                  value={newUserData.password || ''}
                  onChange={(e) => handleUserDataChange('password', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userConfirmPassword">Confirm Password</Label>
                <Input
                  id="userConfirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={newUserData.confirmPassword || ''}
                  onChange={(e) => handleUserDataChange('confirmPassword', e.target.value)}
                />
              </div>
            </div>
            <Button onClick={onCreateUser} className="w-full">
              Create User
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Management
          </CardTitle>
          <CardDescription>
            Administrative actions for system maintenance and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <Button
              variant="outline"
              onClick={onUserManagement}
              className="flex items-center gap-2 h-auto p-4 flex-col"
            >
              <Users className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">User Management</div>
                <div className="text-sm text-muted-foreground">Manage system users</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={onTenantSettings}
              className="flex items-center gap-2 h-auto p-4 flex-col"
            >
              <Shield className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Tenant Settings</div>
                <div className="text-sm text-muted-foreground">Configure tenant policies</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
