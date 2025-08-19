import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { UserX, Trash2, Shield } from 'lucide-react';
import { User, Company, Role, NewUser, PermissionCategory, NewRole } from '@/types';

interface UserModalsProps {
  // Add User Modal
  addUserOpen: boolean;
  onAddUserOpenChange: (open: boolean) => void;
  newUser: NewUser;
  onNewUserChange: (user: NewUser) => void;
  onAddUser: () => void;
  addingUser: boolean;
  
  // Edit User Modal
  editUserOpen: boolean;
  onEditUserOpenChange: (open: boolean) => void;
  editingUser: User | null;
  onEditingUserChange: (user: User | null) => void;
  onUpdateUser: () => void;
  onDeleteUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  updatingUser: boolean;
  
  // Create Role Modal
  showCreateRoleDialog: boolean;
  onShowCreateRoleDialogChange: (open: boolean) => void;
  newRole: NewRole;
  onNewRoleChange: (role: NewRole) => void;
  onCreateRole: () => void;
  creatingRole: boolean;
  permissionCategories: PermissionCategory[];
  
  // Data
  companies: Company[];
  roles: Role[];
  assignableRoles: string[];
}

const UserModals: React.FC<UserModalsProps> = ({
  addUserOpen,
  onAddUserOpenChange,
  newUser,
  onNewUserChange,
  onAddUser,
  addingUser,
  editUserOpen,
  onEditUserOpenChange,
  editingUser,
  onEditingUserChange,
  onUpdateUser,
  onDeleteUser,
  onDeactivateUser,
  updatingUser,
  showCreateRoleDialog,
  onShowCreateRoleDialogChange,
  newRole,
  onNewRoleChange,
  onCreateRole,
  creatingRole,
  permissionCategories,
  companies,
  roles,
  assignableRoles
}) => {
  const formatPermissionName = (permission: string) => {
    return permission
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCategoryToggle = (category: PermissionCategory, checked: boolean) => {
    const updatedPermissions = checked
      ? [...new Set([...newRole.permissions, ...category.permissions])]
      : newRole.permissions.filter((p: string) => !category.permissions.includes(p));
    
    onNewRoleChange({ ...newRole, permissions: updatedPermissions });
  };

  const handlePermissionToggle = (permission: string) => {
    const updatedPermissions = newRole.permissions.includes(permission)
      ? newRole.permissions.filter((p: string) => p !== permission)
      : [...newRole.permissions, permission];
    
    onNewRoleChange({ ...newRole, permissions: updatedPermissions });
  };

  return (
    <>
      {/* Add User Modal */}
      <Dialog open={addUserOpen} onOpenChange={onAddUserOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => onNewUserChange({ ...newUser, firstName: e.target.value })}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => onNewUserChange({ ...newUser, lastName: e.target.value })}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => onNewUserChange({ ...newUser, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={newUser.phone}
                onChange={(e) => onNewUserChange({ ...newUser, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value) => onNewUserChange({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter(role => assignableRoles && assignableRoles.includes(role.name))
                    .map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Select 
                value={newUser.companyId} 
                onValueChange={(value) => onNewUserChange({ ...newUser, companyId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => onNewUserChange({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onAddUserOpenChange(false)}
              disabled={addingUser}
            >
              Cancel
            </Button>
            <Button 
              onClick={onAddUser}
              disabled={addingUser || !newUser.email || !newUser.firstName || !newUser.lastName || !newUser.password}
            >
              {addingUser ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Modal */}
      <Dialog open={showCreateRoleDialog} onOpenChange={onShowCreateRoleDialogChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Create New Role
            </DialogTitle>
            <DialogDescription>
              Create a custom role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleDisplayName">Role Name</Label>
                <Input
                  id="roleDisplayName"
                  value={newRole.displayName}
                  onChange={(e) => onNewRoleChange({ ...newRole, displayName: e.target.value })}
                  placeholder="Enter role name (e.g., Fleet Manager)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={newRole.description}
                  onChange={(e) => onNewRoleChange({ ...newRole, description: e.target.value })}
                  placeholder="Describe what this role can do"
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Permissions</Label>
                <span className="text-sm text-muted-foreground">
                  {newRole.permissions.length} selected
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {permissionCategories.map((category) => (
                  <div key={category.name} className="space-y-3 p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-category-${category.name}`}
                        checked={category.permissions.every(p => newRole.permissions.includes(p))}
                        onCheckedChange={(checked) => 
                          handleCategoryToggle(category, checked as boolean)
                        }
                      />
                      <Label htmlFor={`create-category-${category.name}`} className="text-sm font-medium">
                        {category.name}
                      </Label>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {category.permissions.filter(p => newRole.permissions.includes(p)).length}/{category.permissions.length}
                      </span>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      {category.permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`create-permission-${permission}`}
                            checked={newRole.permissions.includes(permission)}
                            onCheckedChange={() => handlePermissionToggle(permission)}
                          />
                          <Label htmlFor={`create-permission-${permission}`} className="text-sm">
                            {formatPermissionName(permission)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => onShowCreateRoleDialogChange(false)}
              disabled={creatingRole}
            >
              Cancel
            </Button>
            <Button 
              onClick={onCreateRole}
              disabled={creatingRole || !newRole.displayName || !newRole.description || newRole.permissions.length === 0}
            >
              {creatingRole ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={editUserOpen} onOpenChange={onEditUserOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => onEditingUserChange({ ...editingUser, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => onEditingUserChange({ ...editingUser, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => onEditingUserChange({ ...editingUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editingUser.phone || ''}
                  onChange={(e) => onEditingUserChange({ ...editingUser, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => onEditingUserChange({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter(role => assignableRoles && assignableRoles.includes(role.name))
                      .map((role) => (
                        <SelectItem key={role.name} value={role.name}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Select 
                  value={editingUser.companyId || ''} 
                  onValueChange={(value) => onEditingUserChange({ ...editingUser, companyId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {editingUser?.status === 'active' && (
                <Button 
                  variant="outline"
                  onClick={() => editingUser && onDeactivateUser(editingUser.id)}
                  disabled={updatingUser}
                  className="gap-2 min-w-[100px]"
                >
                  <UserX className="w-4 h-4" />
                  Deactivate
                </Button>
              )}
              <Button 
                variant="destructive"
                onClick={() => editingUser && onDeleteUser(editingUser.id)}
                disabled={updatingUser}
                className="gap-2 min-w-[100px]"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onEditUserOpenChange(false)}
                disabled={updatingUser}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={onUpdateUser}
                disabled={updatingUser || !editingUser?.firstName || !editingUser?.lastName}
                className="min-w-[100px]"
              >
                {updatingUser ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserModals;
