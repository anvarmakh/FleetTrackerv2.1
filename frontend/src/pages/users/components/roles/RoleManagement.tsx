import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { userAPI } from '@/lib/api';
import { User } from '@/types';
import { RoleManagementProps } from './types';
import { useRoleManagement } from './hooks/useRoleManagement';
import { usePermissions } from './hooks/usePermissions';
import RoleList from './RoleList';
import RoleDetails from './RoleDetails';
import PermissionEditor from './PermissionEditor';
import RoleDialogs from './RoleDialogs';
import { isProtectedRole, ROLE_PROTECTION_MESSAGES } from '@/utils/roleConstants';


const RoleManagement: React.FC<RoleManagementProps> = ({ users, onUserUpdate }) => {
  const {
    // State
    permissionStructure,
    selectedRole,
    editingPermissions,
    isEditing,
    showCreateDialog,
    showDeleteDialog,
    newRole,
    allAvailablePermissions,
    userPermissions,
    allRoles,
    
    // Setters
    setSelectedRole,
    setEditingPermissions,
    setIsEditing,
    setShowCreateDialog,
    setShowDeleteDialog,
    setNewRole,
    
    // Functions
    hasPermission,
    canManageRoles,
    canCreateRoles,
    canEditRoles,
    refreshPermissionStructure,
    
    // Toast
    toast
  } = useRoleManagement();

  const { getPermissionByCategoryAndAction } = usePermissions();

  // Helper functions
  const getRoleUserCount = (roleName: string) => {
    return users.filter(user => user.organizationRole?.toLowerCase() === roleName.toLowerCase()).length;
  };

  const getRolePermissionCount = (roleName: string) => {
    const role = allRoles.find(r => r.name === roleName);
    if (role) {
      return role.permissions ? role.permissions.length : 0;
    }
    
    // Fallback to template if role not found
    if (!permissionStructure) return 0;
    const template = permissionStructure.roleTemplates[roleName];
    if (!template) return 0;
    
    // Use simple count from template (backend should handle inheritance)
    return template.blockPermissions.length + template.granularPermissions.length;
  };

  const getSelectedRoleTemplate = () => {
    // First try to find the role in allRoles (includes custom roles)
    const currentRole = allRoles.find(role => role.name === selectedRole);
    if (currentRole) {
      return {
        name: currentRole.displayName,
        description: currentRole.description,
        blockPermissions: currentRole.permissions || [],
        granularPermissions: [],
        isCustom: currentRole.isCustom, // Preserve the isCustom property
        displayName: currentRole.displayName
      };
    }
    
    // Fallback to template if role not found in allRoles
    if (!permissionStructure) return null;
    const template = permissionStructure.roleTemplates[selectedRole];
    if (template) {
      return {
        ...template,
        isCustom: false // System roles are not custom
      };
    }
    return null;
  };

  const getSortedRoles = () => {
    if (allRoles.length === 0) return [];
    
    // Sort roles: system roles first (in predefined order), then custom roles
    const systemRoleOrder = ['owner', 'admin', 'manager', 'user', 'viewer'];
    
    const systemRoles = allRoles.filter(role => !role.isCustom);
    const customRoles = allRoles.filter(role => role.isCustom);
    
    // Sort system roles by predefined order
    const sortedSystemRoles = systemRoles.sort((a, b) => {
      const aIndex = systemRoleOrder.indexOf(a.name.toLowerCase());
      const bIndex = systemRoleOrder.indexOf(b.name.toLowerCase());
      return aIndex - bIndex;
    });
    
    // Sort custom roles by creation date (newest first)
    const sortedCustomRoles = customRoles.sort((a, b) => {
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
    
    return [...sortedSystemRoles, ...sortedCustomRoles];
  };

  // Event handlers
  const handlePermissionToggle = (permission: string) => {
    if (!isEditing) return;
    
    setEditingPermissions(prev => {
      const newPermissions = [...prev];
      
      if (newPermissions.includes(permission)) {
        // Remove permission and its cascading effects
        const filteredPermissions = newPermissions.filter(p => p !== permission);
        
        // If removing a block permission, also remove corresponding granular permissions
        if (permission.includes('_view') || permission.includes('_create') || 
            permission.includes('_edit') || permission.includes('_delete') || 
            permission.includes('_admin')) {
          const action = permission.split('_').pop(); // Get the action (view, create, edit, delete, admin)
          const category = permission.split('_')[0]; // Get the category (fleet, org, analytics)
          
          // Remove corresponding granular permissions based on category and action
          return filteredPermissions.filter(p => {
            // For fleet permissions
            if (category === 'fleet') {
              if (action === 'view' && (p.includes('trailers_view') || p.includes('locations_view') || p.includes('maintenance_view') || p.includes('notes_view'))) {
                return false;
              }
              if (action === 'create' && (p.includes('trailers_create') || p.includes('locations_create') || p.includes('maintenance_create') || p.includes('notes_create'))) {
                return false;
              }
              if (action === 'edit' && (p.includes('trailers_edit') || p.includes('locations_edit') || p.includes('maintenance_edit') || p.includes('notes_edit'))) {
                return false;
              }
              if (action === 'delete' && (p.includes('trailers_delete') || p.includes('locations_delete') || p.includes('maintenance_delete'))) {
                return false;
              }
              if (action === 'admin') {
                return false; // Remove all fleet-related permissions
              }
            }
            
            // For org permissions
            if (category === 'org') {
              if (action === 'view' && (p.includes('users_view') || p.includes('roles_view') || p.includes('companies_view') || p.includes('providers_view') || p.includes('maintenance_settings_view') || p.includes('company_preferences_view'))) {
                return false;
              }
              if (action === 'create' && (p.includes('users_create') || p.includes('roles_create') || p.includes('companies_create') || p.includes('providers_create'))) {
                return false;
              }
              if (action === 'edit' && (p.includes('users_edit') || p.includes('roles_edit') || p.includes('companies_edit') || p.includes('providers_edit') || p.includes('maintenance_settings_edit') || p.includes('company_preferences_edit'))) {
                return false;
              }
              if (action === 'delete' && (p.includes('users_delete') || p.includes('roles_delete') || p.includes('companies_delete') || p.includes('providers_delete'))) {
                return false;
              }
              if (action === 'admin') {
                return false; // Remove all org-related permissions
              }
            }
            
            // For analytics permissions
            if (category === 'analytics') {
              if (action === 'view' && p.includes('reports_view')) {
                return false;
              }
              if (action === 'export' && p.includes('reports_export')) {
                return false;
              }
              if (action === 'admin') {
                return false; // Remove all analytics-related permissions
              }
            }
            
            return true;
          });
        }
        
        return filteredPermissions;
      } else {
        // Add permission and its cascading effects
        newPermissions.push(permission);
        
        // If adding a block permission, also add corresponding granular permissions
        if (permission.includes('_view') || permission.includes('_create') || 
            permission.includes('_edit') || permission.includes('_delete') || 
            permission.includes('_admin')) {
          const action = permission.split('_').pop(); // Get the action (view, create, edit, delete, admin)
          const category = permission.split('_')[0]; // Get the category (fleet, org, analytics)
          
          // Add corresponding granular permissions based on category and action
          const granularPermission = getPermissionByCategoryAndAction(category, action, allAvailablePermissions);
          if (granularPermission && !newPermissions.includes(granularPermission)) {
            newPermissions.push(granularPermission);
          }
        }
        
        return newPermissions;
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    // Prevent editing Owner role
    if (isProtectedRole(selectedRole)) {
      toast({
        title: "Error",
        description: ROLE_PROTECTION_MESSAGES.CANNOT_MODIFY,
        variant: "destructive",
      });
      return;
    }
    
    try {
      const currentRole = allRoles.find(role => role.name === selectedRole);
      
      if (currentRole && currentRole.isCustom) {
        // Update custom role
        await userAPI.updateRole(currentRole.name, {
          permissions: editingPermissions
        });
      } else {
        // Update system role template
        await userAPI.updateRole(selectedRole, {
          permissions: editingPermissions
        });
      }
      
      setIsEditing(false);
      await refreshPermissionStructure();
      
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    } catch (error) {
              // Error saving permissions
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset editing permissions to current role's permissions
    const currentRole = allRoles.find(role => role.name === selectedRole);
    if (currentRole) {
      setEditingPermissions(currentRole.permissions || []);
    } else if (permissionStructure) {
      const template = permissionStructure.roleTemplates[selectedRole];
      if (template) {
        setEditingPermissions([...template.blockPermissions, ...template.granularPermissions]);
      }
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await userAPI.createRole({
        name: newRole.name.trim(),
        displayName: newRole.name.trim(),
        description: newRole.description.trim(),
        permissions: []
      });
      
      setShowCreateDialog(false);
      setNewRole({ name: '', displayName: '', description: '' });
      await refreshPermissionStructure();
      
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    } catch (error: any) {
              // Error creating role
      const errorMessage = error.response?.data?.message || "Failed to create role";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      const currentRole = allRoles.find(role => role.name === selectedRole);
      if (!currentRole || !currentRole.isCustom) {
        toast({
          title: "Error",
          description: "Cannot delete system roles",
          variant: "destructive",
        });
        return;
      }
      
      await userAPI.deleteRole(currentRole.name);
      
      setShowDeleteDialog(false);
      setSelectedRole('');
      await refreshPermissionStructure();
      
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    } catch (error) {
              // Error deleting role
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1">
          <RoleList
            roles={getSortedRoles()}
            selectedRole={selectedRole}
            onRoleSelect={setSelectedRole}
            onCreateRole={() => setShowCreateDialog(true)}
            canCreateRoles={canCreateRoles()}
            getRoleUserCount={getRoleUserCount}
            getRolePermissionCount={getRolePermissionCount}
          />
        </div>

        {/* Role Details and Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRole ? (
            <>
              <RoleDetails
                selectedRole={getSelectedRoleTemplate()}
                isEditing={isEditing}
                onEditPermissions={() => setIsEditing(true)}
                onCancelEdit={handleCancelEdit}
                onSavePermissions={handleSavePermissions}
                onDeleteRole={() => setShowDeleteDialog(true)}
                canEditRoles={canEditRoles()}
                canManageRoles={canManageRoles()}
              />
              
              <PermissionEditor
                permissionStructure={permissionStructure}
                editingPermissions={editingPermissions}
                onPermissionToggle={handlePermissionToggle}
                isEditing={isEditing}
                allAvailablePermissions={allAvailablePermissions}
              />
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  Select a role to view and edit permissions
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <RoleDialogs
        showCreateDialog={showCreateDialog}
        showDeleteDialog={showDeleteDialog}
        newRole={newRole}
        selectedRole={allRoles.find(role => role.name === selectedRole) || null}
        onCloseCreateDialog={() => setShowCreateDialog(false)}
        onCloseDeleteDialog={() => setShowDeleteDialog(false)}
        onNewRoleChange={(field, value) => setNewRole(prev => ({ ...prev, [field]: value }))}
        onCreateRole={handleCreateRole}
        onDeleteRole={handleDeleteRole}
        canCreateRoles={canCreateRoles()}
        canManageRoles={canManageRoles()}
      />
    </div>
  );
};

export default RoleManagement;
