import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { userAPI } from '@/lib/api';
import { PermissionStructure, Role, NewRole } from '../types';

export const useRoleManagement = () => {
  const [permissionStructure, setPermissionStructure] = useState<PermissionStructure | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('owner');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newRole, setNewRole] = useState<NewRole>({ name: '', displayName: '', description: '' });
  const [allAvailablePermissions, setAllAvailablePermissions] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const { toast } = useToast();

  // Load permission structure and user permissions
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load permission structure
        const structureResponse = await userAPI.getPermissionStructure();
        setPermissionStructure(structureResponse.data.data);
        
        // Extract all available permissions
        const { blockPermissions, granularPermissions } = structureResponse.data.data;
        const allPermissions = [
          ...Object.values(blockPermissions as Record<string, string>),
          ...Object.values(granularPermissions as Record<string, string>)
        ];
        setAllAvailablePermissions(allPermissions);

        // Load all roles (including custom roles)
        const rolesResponse = await userAPI.getRoles();
        if (rolesResponse.data.success) {
          setAllRoles(rolesResponse.data.roles || []);
        }

        // Load user permissions
        const permissionsResponse = await userAPI.getPermissions();
        const userPerms = permissionsResponse.data.data?.userPermissions || [];
        setUserPermissions(userPerms);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load permission data",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  // Load permissions when role is selected
  useEffect(() => {
    if (selectedRole) {
      // First try to find the role in allRoles (includes custom roles)
      const currentRole = allRoles.find(role => role.name === selectedRole);
      if (currentRole) {
        setEditingPermissions(currentRole.permissions || []);
      } else if (permissionStructure) {
        // Fallback to template if role not found in allRoles
        const template = permissionStructure.roleTemplates[selectedRole];
        if (template) {
          setEditingPermissions([...template.blockPermissions, ...template.granularPermissions]);
        }
      }
    }
  }, [selectedRole, permissionStructure, allRoles]);

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission);
  };

  // Check if user can manage roles (including org_admin which includes role permissions)
  const canManageRoles = () => {
    return hasPermission('roles_create') || 
           hasPermission('roles_edit') || 
           hasPermission('roles_delete') || 
           hasPermission('org_admin');
  };

  // Check if user can create roles
  const canCreateRoles = () => {
    return hasPermission('roles_create') || hasPermission('org_admin');
  };

  // Check if user can edit roles
  const canEditRoles = () => {
    return hasPermission('roles_edit') || hasPermission('org_admin');
  };

  // Function to refresh permission structure and roles
  const refreshPermissionStructure = async () => {
    try {
      const structureResponse = await userAPI.getPermissionStructure();
      setPermissionStructure(structureResponse.data.data);
      
      // Reload all roles
      const rolesResponse = await userAPI.getRoles();
      if (rolesResponse.data.success) {
        setAllRoles(rolesResponse.data.roles || []);
      }
      
      // Update editing permissions for current role
      if (selectedRole) {
        const currentRole = allRoles.find(role => role.name === selectedRole);
        if (currentRole) {
          setEditingPermissions(currentRole.permissions || []);
        } else {
          // Fallback to template if role not found
          const template = structureResponse.data.data.roleTemplates[selectedRole];
          if (template) {
            setEditingPermissions([...template.blockPermissions, ...template.granularPermissions]);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing permission structure:', error);
      toast({
        title: "Error",
        description: "Failed to refresh permission data",
        variant: "destructive",
      });
    }
  };

  return {
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
  };
};
