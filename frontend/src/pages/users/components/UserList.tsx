import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, X, Search, UserCheck, UserX } from 'lucide-react';
import { User } from '@/types';

interface UserListProps {
  users: User[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  searchQuery,
  onSearchChange,
  onAddUser,
  onEditUser,
  onActivateUser,
  onDeactivateUser
}) => {
  const getUserRoleBadge = (role: string) => {
    const roleConfig = {
      superadmin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
      owner: { label: 'Owner', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
      admin: { label: 'Admin', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
      manager: { label: 'Manager', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      user: { label: 'User', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
    };

    const config = roleConfig[role.toLowerCase() as keyof typeof roleConfig] || roleConfig.user;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getUserStatusBadge = (isActive: boolean) => {
    const statusConfig = {
      true: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
      false: { label: 'Inactive', className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
    };

    const config = statusConfig[isActive.toString() as keyof typeof statusConfig] || statusConfig.false;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    const role = (user.organizationRole || user.organization_role || 'user').toLowerCase();
    const status = (user.isActive || user.is_active ? 'active' : 'inactive').toLowerCase();
    const companyName = (user.companyName || '').toLowerCase();
    
    return fullName.includes(query) || 
           email.includes(query) || 
           role.includes(query) || 
           status.includes(query) || 
           companyName.includes(query);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search users by name, email, role, status..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                {filteredUsers.length} of {users.length} users
              </div>
            )}
            <Button onClick={onAddUser} className="gap-2">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getUserRoleBadge(user.organizationRole || user.organization_role || 'user')}</TableCell>
                  <TableCell>{user.companyName || '-'}</TableCell>
                  <TableCell>{getUserStatusBadge(user.isActive || user.is_active || false)}</TableCell>
                  <TableCell>
                    {user.lastLogin || user.last_login
                      ? new Date(user.lastLogin || user.last_login).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser(user)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {(user.isActive || user.is_active) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivateUser(user.id)}
                          className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                          title="Deactivate"
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivateUser(user.id)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          title="Activate"
                        >
                          <UserCheck className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery 
                        ? `No users found matching "${searchQuery}"`
                        : 'No users found'
                      }
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSearchChange('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserList;
