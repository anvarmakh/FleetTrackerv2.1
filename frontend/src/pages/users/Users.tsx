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
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
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
      // Load user permissions first to check what we can access
      const permissionsResponse = await userAPI.getPermissions();
      if (permissionsResponse.data.success) {
        const permissionsData = permissionsResponse.data.data;
        if (permissionsData) {
          // Extract the userPermissions array from the response
          const userPermsArray = permissionsData.userPermissions || [];
          setUserPermissions(userPermsArray);
          // Store assignable roles for role selection filtering
          if (permissionsData.assignableRoles) {
            setAssignableRoles(permissionsData.assignableRoles);
          }
        }
      }

      // Only load roles if user has roles_view permission
      if (permissionsResponse.data.data?.userPermissions?.includes('roles_view')) {
        console.log('✅ User has roles_view permission');
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
            { name: 'Company Management', permissions: ['companies_view', 'companies_create', 'companies_edit', 'companies_delete', 'companies_switch'] },
            { name: 'Trailer Management', permissions: ['trailers_view', 'trailers_create', 'trailers_edit', 'trailers_delete'] },
            { name: 'GPS Provider Management', permissions: ['providers_view', 'providers_create', 'providers_edit', 'providers_delete', 'providers_test'] },
            { name: 'Location Management', permissions: ['locations_view', 'locations_create', 'locations_edit', 'locations_delete'] },
            { name: 'Notes Management', permissions: ['notes_view', 'notes_create', 'notes_edit', 'notes_delete'] },
            { name: 'Maintenance Settings', permissions: ['maintenance_settings_view', 'maintenance_settings_edit'] },
    { name: 'Company Preferences', permissions: ['company_preferences_view', 'company_preferences_edit'] },
            { name: 'Reports & Analytics', permissions: ['reports_view', 'reports_export'] },
            { name: 'Role Management', permissions: ['roles_view', 'roles_create', 'roles_edit', 'roles_delete'] }
          ];
          setPermissionCategories(categories);
        }
      } else {
        console.log('❌ User does NOT have roles_view permission');
        // User doesn't have roles_view permission
        setRoles([]);
        setPermissions([]);
        setPermissionCategories([]);
      }
    } catch (error: unknown) {
      console.error('Error loading roles:', error);
      setRoles([]);
      setPermissions([]);
      setPermissionCategories([]);
    }
  }, []);

  const loadUsersData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load user permissions first
      const permissionsResponse = await userAPI.getPermissions();
      console.log('🔍 Users Page - Permissions Response:', permissionsResponse.data);
      let userPermissions = [];
      if (permissionsResponse.data.success) {
        userPermissions = permissionsResponse.data.data?.userPermissions || [];
        // Update the state with the permissions array
        setUserPermissions(userPermissions);
      }
      console.log('🔍 Users Page - User Permissions:', userPermissions);
      console.log('🔍 Users Page - User Role:', permissionsResponse.data.data?.userRole);
      
      // Load companies only if user has companies_view permission
      if (userPermissions.includes('companies_view')) {
        console.log('✅ User has companies_view permission');
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
      } else {
        console.log('❌ User does NOT have companies_view permission');
        setCompanies([]);
      }

      // Load users only if user has users_view permission
      if (userPermissions.includes('users_view')) {
        console.log('✅ User has users_view permission');
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
      } else {
        console.log('❌ User does NOT have users_view permission');
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

  // Check user permissions for UI feedback
  const hasPermission = (permission: string) => {
    return Array.isArray(userPermissions) && userPermissions.includes(permission);
  };

  const canViewUsers = hasPermission('users_view');
  const canViewCompanies = hasPermission('companies_view');
  const canViewRoles = hasPermission('roles_view');
  const canManageUsers = hasPermission('users_create') || hasPermission('users_edit') || hasPermission('users_delete');
  const canManageRoles = hasPermission('roles_create') || hasPermission('roles_edit') || hasPermission('roles_delete');

  // Prevent flash by showing loading state until data is ready
  const isDataReady = !loading && userPermissions.length > 0;

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
            </div>
          </div>

          {/* Permission Notice */}
          {isDataReady && (!canViewUsers || !canViewCompanies || !canViewRoles) && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Limited Access Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>Your current permissions limit what you can view and manage:</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {!canViewUsers && <li>Cannot view users list</li>}
                      {!canViewCompanies && <li>Cannot view companies</li>}
                      {!canViewRoles && <li>Cannot view roles and permissions</li>}
                      {!canManageUsers && canViewUsers && <li>Can view users but cannot create/edit/delete</li>}
                      {!canManageRoles && canViewRoles && <li>Can view roles but cannot create/edit/delete</li>}
                    </ul>
                    <p className="mt-2">Contact your administrator if you need additional permissions.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" disabled={!isDataReady || !canViewUsers}>
                Users {!isDataReady || !canViewUsers ? '(No Access)' : ''}
              </TabsTrigger>
              <TabsTrigger value="roles" disabled={!isDataReady || !canViewRoles}>
                Roles & Permissions {!isDataReady || !canViewRoles ? '(No Access)' : ''}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              {!isDataReady ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading user data...</p>
                  </div>
                </div>
              ) : canViewUsers ? (
                <div key="users-tab">
                  <UserList
                    users={users}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAddUser={() => setAddUserOpen(true)}
                    onEditUser={handleEditUser}
                    onActivateUser={handleActivateUser}
                    onDeactivateUser={handleDeactivateUser}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">You don't have permission to view users.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="roles" className="mt-0">
              {!isDataReady ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading role data...</p>
                  </div>
                </div>
              ) : canViewRoles ? (
                <div key="roles-tab">
                  <RoleManagement
                    users={users}
                    onUserUpdate={loadUsersData}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">You don't have permission to view roles and permissions.</p>
                </div>
              )}
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
