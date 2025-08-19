import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Crown, 
  Shield, 
  Users as UsersIcon, 
  CheckCircle,
  Building,
  Truck,
  FileText,
  Settings,
  BarChart3,
  Key,
  Palette,
  Zap,
  Star,
  UserCheck,
  UserCog
} from 'lucide-react';
import { Role, User, PermissionCategory } from '@/types';

interface RoleManagementProps {
  roles: Role[];
  users: User[];
  selectedRole: Role | null;
  editingRole: Role | null;
  permissionCategories: PermissionCategory[];
  onRoleSelect: (role: Role) => void;
  onEditRole: (role: Role) => void;
  onDeleteCustomRole: (roleName: string) => void;
  onSaveRolePermissions: () => void;
  onCancelEdit: () => void;
  onCategoryToggle: (category: PermissionCategory, checked: boolean) => void;
  onPermissionToggle: (permission: string) => void;
  onCreateRole: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  roles,
  users,
  selectedRole,
  editingRole,
  permissionCategories,
  onRoleSelect,
  onEditRole,
  onDeleteCustomRole,
  onSaveRolePermissions,
  onCancelEdit,
  onCategoryToggle,
  onPermissionToggle,
  onCreateRole
}) => {
  const getRoleIcon = (roleName: string) => {
    const roleNameLower = roleName.toLowerCase();
    
    const iconMap: { [key: string]: React.ReactNode } = {
      owner: <Crown className="w-5 h-5 text-purple-600" />,
      superadmin: <Crown className="w-5 h-5 text-purple-600" />,
      admin: <Shield className="w-5 h-5 text-blue-600" />,
      manager: <UserCog className="w-5 h-5 text-green-600" />,
      user: <UserCheck className="w-5 h-5 text-gray-600" />
    };
    
    return iconMap[roleNameLower] || <UsersIcon className="w-5 h-5 text-gray-600" />;
  };

  const getPermissionCategoryIcon = (categoryName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'User Management': <UsersIcon className="w-4 h-4" />,
      'Company Management': <Building className="w-4 h-4" />,
      'Trailer Management': <Truck className="w-4 h-4" />,
      'GPS Provider Management': <Key className="w-4 h-4" />,
      'Location Management': <Palette className="w-4 h-4" />,
      'Notes Management': <FileText className="w-4 h-4" />,
      'Settings & Configuration': <Settings className="w-4 h-4" />,
      'Reports & Analytics': <BarChart3 className="w-4 h-4" />,
      'Role Assignment': <UserCog className="w-4 h-4" />
    };
    return iconMap[categoryName] || <Shield className="w-4 h-4" />;
  };

  const formatPermissionName = (permission: string) => {
    return permission
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  {roles.map((role) => {
                    const userCount = users.filter(u => (u.organizationRole || u.organization_role) === role.name).length;
                    return (
                      <div
                        key={role.name}
                        className={`group relative p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                          selectedRole?.name === role.name
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                        }`}
                        onClick={() => onRoleSelect(role)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center">
                              {getRoleIcon(role.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate">{role.displayName}</h4>
                                {role.isCustom && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    Custom
                                  </Badge>
                                )}
                                {!role.isCustom && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    System
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <UsersIcon className="w-3 h-3" />
                                  <span>{userCount} user{userCount !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Shield className="w-3 h-3" />
                                  <span>{role.permissions.length} permissions</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {role.isCustom && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCustomRole(role.name);
                                }}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Create Role Button at the bottom */}
                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={onCreateRole} 
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Role
                  </Button>
                </div>
              </div>
            </div>

            {/* Role Details */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRole ? (
                <div className="space-y-6">
                  {/* Role Header */}
                  <div className="flex items-start justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center">
                        {getRoleIcon(selectedRole.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{selectedRole.displayName}</h3>
                          {selectedRole.isCustom && (
                            <Badge variant="secondary" className="text-xs px-2 py-0">Custom Role</Badge>
                          )}
                          {!selectedRole.isCustom && (
                            <Badge variant="outline" className="text-xs px-2 py-0">System Role</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {selectedRole.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="w-4 h-4" />
                            <span>{selectedRole.permissions.length} permissions</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UsersIcon className="w-4 h-4" />
                            <span>{users.filter(u => (u.organizationRole || u.organization_role) === selectedRole.name).length} users assigned</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedRole.isCustom && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteCustomRole(selectedRole.name)}
                          className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete Role
                        </Button>
                      )}
                      <Button
                        onClick={() => onEditRole(selectedRole)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Permissions
                      </Button>
                    </div>
                  </div>
                  
                  {/* Permissions Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Permissions
                      </h4>
                      {editingRole && editingRole.name === selectedRole.name && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onCancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={onSaveRolePermissions}
                          >
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permissionCategories.map((category) => (
                        <Card key={category.name} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              {getPermissionCategoryIcon(category.name)}
                              <CardTitle className="text-sm">
                                {formatPermissionName(category.name)}
                              </CardTitle>
                              <Badge variant="outline" className="ml-auto">
                                {category.permissions.filter(p => selectedRole.permissions.includes(p)).length}/{category.permissions.length}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {editingRole && editingRole.name === selectedRole.name ? (
                                // Edit mode - show checkboxes
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-category-${category.name}`}
                                      checked={category.permissions.every(p => editingRole.permissions.includes(p))}
                                      onCheckedChange={(checked) => 
                                        onCategoryToggle(category, checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={`edit-category-${category.name}`} className="text-sm font-medium">
                                      Select All
                                    </Label>
                                  </div>
                                  <Separator />
                                  <div className="space-y-2">
                                    {category.permissions.map((permission) => (
                                      <div key={permission} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`edit-permission-${permission}`}
                                          checked={editingRole.permissions.includes(permission)}
                                          onCheckedChange={() => onPermissionToggle(permission)}
                                        />
                                        <Label htmlFor={`edit-permission-${permission}`} className="text-sm">
                                          {formatPermissionName(permission)}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                // View mode - show current permissions
                                category.permissions.map((permission) => (
                                  <div
                                    key={permission}
                                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                                      selectedRole.permissions.includes(permission)
                                        ? 'bg-primary/10 border border-primary/20'
                                        : 'bg-muted/30'
                                    }`}
                                  >
                                    {selectedRole.permissions.includes(permission) ? (
                                      <CheckCircle className="w-4 h-4 text-primary" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {formatPermissionName(permission)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Users with this role */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <UsersIcon className="w-5 h-5" />
                      Users with this Role
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {users.filter(u => (u.organizationRole || u.organization_role) === selectedRole.name).map((user) => (
                        <div key={user.id} className="group flex items-center gap-3 p-3 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {(user.firstName || user.first_name || '')[0]}{(user.lastName || user.last_name || '')[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      ))}
                      {users.filter(u => (u.organizationRole || u.organization_role) === selectedRole.name).length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UsersIcon className="w-8 h-8 opacity-50" />
                          </div>
                          <p className="text-lg font-medium mb-2">No users assigned</p>
                          <p className="text-sm">This role currently has no assigned users</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Crown className="w-10 h-10 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">Select a Role</h3>
                  <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                    Choose a role from the list to view its details, permissions, and assigned users
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;
