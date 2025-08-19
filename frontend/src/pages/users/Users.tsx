import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { userAPI, companyAPI } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserList, RoleManagement, UserModals } from './components';
import { 
  User, 
  Company, 
  UserPermissions, 
  Role, 
  PermissionCategory, 
  NewUser, 
  NewRole 
} from '@/types';

const Users = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');

  // Role Management State
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<NewRole>({
    displayName: '',
    description: '',
    permissions: []
  });
  const [creatingRole, setCreatingRole] = useState(false);

  // User Management State
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'user',
    companyId: '',
    password: ''
  });
  const [addingUser, setAddingUser] = useState(false);

  const loadRolesData = useCallback(async () => {
    try {
      // Load roles first
      const rolesResponse = await userAPI.getRoles();
      if (rolesResponse.data.success) {
        const rolesData = rolesResponse.data.roles || [];
        setRoles(rolesData);
        
        // Extract all permissions from roles
        const allPermissions = new Set();
        rolesData.forEach((role: Role) => {
          if (role.permissions && Array.isArray(role.permissions)) {
            role.permissions.forEach((perm: string) => allPermissions.add(perm));
          }
        });
        setPermissions(Array.from(allPermissions));
        
        // Set permission categories based on the actual permission structure
        const categories = [
          { name: 'User Management', permissions: ['users_view', 'users_create', 'users_edit', 'users_delete'] },
          { name: 'Company Management', permissions: ['companies_view', 'companies_create', 'companies_edit', 'companies_delete', 'cross_company_access'] },
          { name: 'Trailer Management', permissions: ['trailers_view', 'trailers_create', 'trailers_edit', 'trailers_delete'] },
          { name: 'GPS Provider Management', permissions: ['providers_view', 'providers_create', 'providers_edit', 'providers_delete', 'providers_test'] },
          { name: 'Location Management', permissions: ['locations_view', 'locations_create', 'locations_edit', 'locations_delete'] },
          { name: 'Notes Management', permissions: ['notes_view', 'notes_create', 'notes_edit', 'notes_delete'] },
          { name: 'Settings & Configuration', permissions: ['settings_view', 'settings_edit'] },
          { name: 'Reports & Analytics', permissions: ['reports_view', 'reports_export'] },
          { name: 'Role Assignment', permissions: ['assign_admin_roles'] }
        ];
        setPermissionCategories(categories);
      }
      
      // Load user permissions (for current user's permissions)
      const permissionsResponse = await userAPI.getPermissions();
      if (permissionsResponse.data.success) {
        const permissionsData = permissionsResponse.data.data;
        if (permissionsData) {
          setUserPermissions(permissionsData);
          // Store assignable roles for role selection filtering
          if (permissionsData.assignableRoles) {
            setAssignableRoles(permissionsData.assignableRoles);
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error loading roles:', error);
      setRoles([]);
    }
  }, []);

  const loadUsersData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load companies
      try {
        const companiesResponse = await companyAPI.getCompanies();
        if (companiesResponse.data.success) {
          setCompanies(companiesResponse.data.companies || companiesResponse.data.data || []);
        } else {
          setCompanies([]);
        }
      } catch (error: unknown) {
        console.error('Error loading companies:', error);
        setCompanies([]);
      }

      // Load users
      try {
        const usersResponse = await userAPI.getUsers();
        if (usersResponse.data.success) {
          const usersData = usersResponse.data.users || usersResponse.data.data || [];
          setUsers(usersData);
        } else {
          setUsers([]);
        }
      } catch (error: unknown) {
        console.error('Error loading users:', error);
        setUsers([]);
      }

      // Load roles and permissions (includes user permissions)
      await loadRolesData();
    } catch (error: unknown) {
      console.error('Error loading users data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [loadRolesData, toast]);

  useEffect(() => {
    loadUsersData();
  }, [loadUsersData]);

  // User Management Handlers
  const handleAddUser = async () => {
    try {
      setAddingUser(true);
      // Convert NewUser to UserData format expected by API
      const userData = {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phone: newUser.phone,
        role: newUser.role, // Send 'role' as expected by backend
        password: newUser.password
      };
      const response = await userAPI.createUser(userData);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
        setAddUserOpen(false);
        setNewUser({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          role: 'user',
          companyId: '',
          password: ''
        });
        loadUsersData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to create user',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive'
      });
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      setUpdatingUser(true);
      const response = await userAPI.updateUser(editingUser.id, editingUser);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
        setEditUserOpen(false);
        setEditingUser(null);
        loadUsersData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to update user',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive'
      });
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await userAPI.deleteUser(userId);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        setEditUserOpen(false);
        setEditingUser(null);
        loadUsersData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to delete user',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive'
      });
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await userAPI.activateUser(userId);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'User activated successfully',
        });
        loadUsersData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to activate user',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error activating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate user',
        variant: 'destructive'
      });
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await userAPI.deactivateUser(userId);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'User deactivated successfully',
        });
        loadUsersData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to deactivate user',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error deactivating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive'
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserOpen(true);
  };

  // Role Management Handlers
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role });
  };

  const handleSaveRolePermissions = async () => {
    if (!editingRole) return;
    
    try {
      const response = await userAPI.updateRolePermissions(editingRole.name, editingRole.permissions);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Role permissions updated successfully',
        });
        setEditingRole(null);
        
        // Reload roles data and update selected role
        await loadRolesData();
        
        // Update the selected role with the new data
        const updatedRoles = await userAPI.getRoles();
        if (updatedRoles.data.success) {
          const updatedRole = updatedRoles.data.roles.find((r: Role) => r.name === editingRole.name);
          if (updatedRole) {
            setSelectedRole(updatedRole);
          }
        }
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to update role permissions',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error updating role permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role permissions',
        variant: 'destructive'
      });
    }
  };

  const handleCreateCustomRole = async () => {
    try {
      setCreatingRole(true);
      
      // Generate a name from displayName (convert to lowercase, replace spaces with underscores)
      const name = newRole.displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      const roleData = {
        name,
        displayName: newRole.displayName,
        description: newRole.description,
        permissions: newRole.permissions
      };
      
      const response = await userAPI.createRole(roleData);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Custom role created successfully',
        });
        setShowCreateRoleDialog(false);
        setNewRole({
          displayName: '',
          description: '',
          permissions: []
        });
        loadRolesData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to create custom role',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error creating custom role:', error);
      toast({
        title: 'Error',
        description: 'Failed to create custom role',
        variant: 'destructive'
      });
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteCustomRole = async (roleName: string) => {
    if (!confirm('Are you sure you want to delete this custom role?')) return;
    
    try {
      const response = await userAPI.deleteRole(roleName);
      if (response.data.success) {
        toast({
          title: 'Success',
          description: 'Custom role deleted successfully',
        });
        if (selectedRole?.name === roleName) {
          setSelectedRole(null);
        }
        loadRolesData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message || 'Failed to delete custom role',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error('Error deleting custom role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom role',
        variant: 'destructive'
      });
    }
  };

  const handleCategoryToggle = (category: PermissionCategory, checked: boolean) => {
    if (!editingRole) return;
    
    const updatedPermissions = checked
      ? [...new Set([...editingRole.permissions, ...category.permissions])]
      : editingRole.permissions.filter(p => !category.permissions.includes(p));
    
    setEditingRole({ ...editingRole, permissions: updatedPermissions });
  };

  const handlePermissionToggle = (permission: string) => {
    if (!editingRole) return;
    
    const updatedPermissions = editingRole.permissions.includes(permission)
      ? editingRole.permissions.filter(p => p !== permission)
      : [...editingRole.permissions, permission];
    
    setEditingRole({ ...editingRole, permissions: updatedPermissions });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">User Management</h1>
              <p className="text-muted-foreground">
                Manage users, roles, and permissions
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserList
                users={users}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAddUser={() => setAddUserOpen(true)}
                onEditUser={handleEditUser}
                onActivateUser={handleActivateUser}
                onDeactivateUser={handleDeactivateUser}
              />
            </TabsContent>

            <TabsContent value="roles">
              <RoleManagement
                roles={roles}
                users={users}
                selectedRole={selectedRole}
                editingRole={editingRole}
                permissionCategories={permissionCategories}
                onRoleSelect={handleRoleSelect}
                onEditRole={handleEditRole}
                onDeleteCustomRole={handleDeleteCustomRole}
                onSaveRolePermissions={handleSaveRolePermissions}
                onCancelEdit={() => setEditingRole(null)}
                onCategoryToggle={handleCategoryToggle}
                onPermissionToggle={handlePermissionToggle}
                onCreateRole={() => setShowCreateRoleDialog(true)}
              />
            </TabsContent>
          </Tabs>

          {/* Modals */}
          <UserModals
            addUserOpen={addUserOpen}
            onAddUserOpenChange={setAddUserOpen}
            newUser={newUser}
            onNewUserChange={setNewUser}
            onAddUser={handleAddUser}
            addingUser={addingUser}
            editUserOpen={editUserOpen}
            onEditUserOpenChange={setEditUserOpen}
            editingUser={editingUser}
            onEditingUserChange={setEditingUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onDeactivateUser={handleDeactivateUser}
            updatingUser={updatingUser}
            showCreateRoleDialog={showCreateRoleDialog}
            onShowCreateRoleDialogChange={setShowCreateRoleDialog}
            newRole={newRole}
            onNewRoleChange={setNewRole}
            onCreateRole={handleCreateCustomRole}
            creatingRole={creatingRole}
            permissionCategories={permissionCategories}
            companies={companies}
            roles={roles}
            assignableRoles={assignableRoles}
          />
        </div>
      </div>
    </div>
  );
};

export default Users;
