// ============================================================================
// USER MANAGEMENT COMPONENT
// ============================================================================

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Power, PowerOff, AlertTriangle } from 'lucide-react';
import { User } from '@/types';

interface UserManagementProps {
  orphanedUsers: User[];
  onCleanupOrphanedUsers: () => void;
  onDeleteUser: (user: User) => void;
  onDeactivateUser: (user: User) => void;
  onActivateUser: (user: User) => void;
}

export function UserManagement({
  orphanedUsers,
  onCleanupOrphanedUsers,
  onDeleteUser,
  onDeactivateUser,
  onActivateUser,
}: UserManagementProps) {
  // Helper functions to handle both snake_case and camelCase properties
  const getUserFirstName = (user: User) => user.firstName || user.first_name || '';
  const getUserLastName = (user: User) => user.lastName || user.last_name || '';
  const getUserRole = (user: User) => user.organizationRole || user.organization_role || '';
  const getUserCreatedAt = (user: User) => user.createdAt || user.created_at || '';
  const getUserLastLogin = (user: User) => user.lastLogin || user.last_login;
  const getUserIsActive = (user: User) => user.isActive !== undefined ? user.isActive : user.is_active;

  // Don't render anything if there are no orphaned users
  if (orphanedUsers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Orphaned Users
            </CardTitle>
            <CardDescription>
              Users not associated with any tenant ({orphanedUsers.length} found)
            </CardDescription>
          </div>
          {orphanedUsers.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCleanupOrphanedUsers}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Cleanup All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orphanedUsers.map((user) => (
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
      </CardContent>
    </Card>
  );
}
