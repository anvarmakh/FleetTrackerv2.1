import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { userAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';
import { Crown, Shield, Target, User as UserIcon, Eye, Plus, Edit, Save, X, Truck, Building, BarChart3, Settings, Users, MapPin, Wrench, FileText, Key, Database, Palette } from 'lucide-react';

interface PermissionStructure {
  permissionStructure: {
    fleet: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    organization: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    analytics: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
    utilities: {
      name: string;
      icon: string;
      blocks: string[];
      granular: {
        [key: string]: {
          name: string;
          permissions: string[];
        };
      };
    };
  };
  roleTemplates: {
    [key: string]: {
      name: string;
      description: string;
      blockPermissions: string[];
      granularPermissions: string[];
    };
  };
  blockPermissions: { [key: string]: string };
  granularPermissions: { [key: string]: string };
}

interface RoleManagementProps {
  users: User[];
  onUserUpdate: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ users, onUserUpdate }) => {
  const [permissionStructure, setPermissionStructure] = useState<PermissionStructure | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('owner');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', displayName: '', description: '' });
  const [allAvailablePermissions, setAllAvailablePermissions] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
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

        // Load user permissions
        const permissionsResponse = await userAPI.getPermissions();
        console.log('🔍 User Permissions Response:', permissionsResponse.data);
        const userPerms = permissionsResponse.data.data?.userPermissions || [];
        setUserPermissions(userPerms);
        console.log('🔍 Current User Permissions:', userPerms);
        console.log('🔍 User Role:', permissionsResponse.data.data?.userRole);
        console.log('🔍 Assignable Roles:', permissionsResponse.data.data?.assignableRoles);
        
        // Debug: Check if user has key permissions
        console.log('🔍 Has fleet_view:', userPerms.includes('fleet_view'));
        console.log('🔍 Has analytics_view:', userPerms.includes('analytics_view'));
        console.log('🔍 Has users_view:', userPerms.includes('users_view'));
        console.log('🔍 Has companies_view:', userPerms.includes('companies_view'));
        console.log('🔍 Has roles_view:', userPerms.includes('roles_view'));
        console.log('🔍 Has org_admin:', userPerms.includes('org_admin'));
        console.log('🔍 Has fleet_admin:', userPerms.includes('fleet_admin'));
        console.log('🔍 Has analytics_admin:', userPerms.includes('analytics_admin'));
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
    if (permissionStructure && selectedRole) {
      const template = permissionStructure.roleTemplates[selectedRole];
      if (template) {
        setEditingPermissions([...template.blockPermissions, ...template.granularPermissions]);
      }
    }
  }, [selectedRole, permissionStructure]);

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

  // Debug: Log permission status
  useEffect(() => {
    if (userPermissions.length > 0) {
      console.log('🔍 Role Management - Permission Check:');
      console.log('  - roles_create:', hasPermission('roles_create'));
      console.log('  - roles_edit:', hasPermission('roles_edit'));
      console.log('  - roles_delete:', hasPermission('roles_delete'));
      console.log('  - org_admin:', hasPermission('org_admin'));
      console.log('  - canManageRoles:', canManageRoles());
      console.log('  - canCreateRoles:', canCreateRoles());
      console.log('  - canEditRoles:', canEditRoles());
    }
  }, [userPermissions]);

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'owner': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'manager': return <Target className="w-4 h-4 text-green-600" />;
      case 'user': return <UserIcon className="w-4 h-4 text-gray-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleUserCount = (roleName: string) => {
    return users.filter(user => user.organizationRole?.toLowerCase() === roleName.toLowerCase()).length;
  };

  const getRolePermissionCount = (roleName: string) => {
    if (!permissionStructure) return 0;
    const template = permissionStructure.roleTemplates[roleName];
    return template ? template.blockPermissions.length + template.granularPermissions.length : 0;
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'fleet management':
        return <Truck className="w-5 h-5" />;
      case 'organization management':
        return <Building className="w-5 h-5" />;
      case 'analytics & reports':
        return <BarChart3 className="w-5 h-5" />;
      case 'utilities & services':
        return <Settings className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getGroupIcon = (groupName: string) => {
    const name = groupName.toLowerCase();
    if (name.includes('users')) return <Users className="w-4 h-4 text-gray-600" />;
    if (name.includes('roles')) return <Key className="w-4 h-4 text-gray-600" />;
    if (name.includes('companies')) return <Building className="w-4 h-4 text-gray-600" />;
    if (name.includes('providers')) return <Database className="w-4 h-4 text-gray-600" />;
    if (name.includes('trailers')) return <Truck className="w-4 h-4 text-gray-600" />;
    if (name.includes('locations')) return <MapPin className="w-4 h-4 text-gray-600" />;
    if (name.includes('maintenance')) return <Wrench className="w-4 h-4 text-gray-600" />;
    if (name.includes('notes')) return <FileText className="w-4 h-4 text-gray-600" />;
    if (name.includes('preferences')) return <Palette className="w-4 h-4 text-gray-600" />;
    if (name.includes('reports')) return <BarChart3 className="w-4 h-4 text-gray-600" />;
    return <Settings className="w-4 h-4 text-gray-600" />;
  };

  const getPermissionCategories = () => {
    if (!permissionStructure) return [];
    
    // Use all available permissions when editing, otherwise use role template permissions
    const permissionsToShow = isEditing ? allAvailablePermissions : editingPermissions;
    
    // Get the permission structure from the backend
    const { permissionStructure: structure } = permissionStructure;
    
    // Create categories based on the actual backend structure
    const categories = [];
    
    // Fleet Management
    if (structure.fleet) {
      const fleetPermissions = permissionsToShow.filter(p => 
        p.includes('fleet_') || 
        p.includes('trailers_') || 
        p.includes('locations_') || 
        p.includes('maintenance_') || 
        p.includes('notes_')
      );
      
      if (fleetPermissions.length > 0) {
        categories.push({
          name: 'Fleet Management',
          description: 'Manage fleet operations, trailers, locations, maintenance, and notes',
          blocks: structure.fleet.blocks.filter(block => permissionsToShow.includes(block)),
          granular: Object.entries(structure.fleet.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => permissionsToShow.includes(p))
          })).filter(group => group.permissions.length > 0)
        });
      }
    }
    
    // Organization Management
    if (structure.organization) {
      const orgPermissions = permissionsToShow.filter(p => 
        p.includes('users_') || 
        p.includes('companies_') || 
        p.includes('providers_') || 
        p.includes('settings_') || 
        p.includes('roles_') || 
        p.includes('org_')
      );
      
      if (orgPermissions.length > 0) {
        categories.push({
          name: 'Organization Management',
          description: 'Manage users, companies, providers, settings, and roles',
          blocks: structure.organization.blocks.filter(block => permissionsToShow.includes(block)),
          granular: Object.entries(structure.organization.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => permissionsToShow.includes(p))
          })).filter(group => group.permissions.length > 0)
        });
      }
    }
    
    // Analytics & Reports
    if (structure.analytics) {
      const analyticsPermissions = permissionsToShow.filter(p => 
        p.includes('analytics_') || 
        p.includes('reports_')
      );
      
      if (analyticsPermissions.length > 0) {
        categories.push({
          name: 'Analytics & Reports',
          description: 'View and export analytics data and reports',
          blocks: structure.analytics.blocks.filter(block => permissionsToShow.includes(block)),
          granular: Object.entries(structure.analytics.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => permissionsToShow.includes(p))
          })).filter(group => group.permissions.length > 0)
        });
      }
    }
    
    // Utilities
    if (structure.utilities) {
      const utilityPermissions = permissionsToShow.filter(p => 
        p.includes('geocoding_')
      );
      
      if (utilityPermissions.length > 0) {
        categories.push({
          name: 'Utilities & Services',
          description: 'Additional utility services and features',
          blocks: structure.utilities.blocks.filter(block => permissionsToShow.includes(block)),
          granular: Object.entries(structure.utilities.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => permissionsToShow.includes(p))
          })).filter(group => group.permissions.length > 0)
        });
      }
    }

    return categories;
  };

  const getPermissionDisplayName = (permission: string) => {
    if (!permissionStructure) return permission;
    
    // Remove common prefixes and format the permission name
    const cleanPermission = permission
      .replace(/^(fleet_|trailers_|locations_|maintenance_|notes_|users_|roles_|companies_|providers_|settings_|analytics_|reports_|org_|geocoding_)/, '')
      .replace(/_/g, ' ')
      .toUpperCase();
    
    return cleanPermission;
  };

  const getPermissionDescription = (permission: string) => {
    const permissionMap: { [key: string]: string } = {
      // Fleet Management
      'fleet_view': 'View fleet information and status',
      'fleet_create': 'Create new fleet entries',
      'fleet_edit': 'Edit existing fleet information',
      'fleet_delete': 'Delete fleet entries',
      'fleet_admin': 'Full fleet administration access',
      
      // Trailers
      'trailers_view': 'View trailer information',
      'trailers_create': 'Create new trailers',
      'trailers_edit': 'Edit trailer details',
      'trailers_delete': 'Delete trailers',
      'trailers_location': 'View and edit trailer locations',
      'trailers_history': 'Access trailer history and logs',
      
      // Locations
      'locations_view': 'View location data',
      'locations_create': 'Create new locations',
      'locations_edit': 'Edit location information',
      'locations_delete': 'Delete locations',
      
      // Maintenance
      'maintenance_view': 'View maintenance records',
      'maintenance_create': 'Create maintenance entries',
      'maintenance_edit': 'Edit maintenance information',
      'maintenance_delete': 'Delete maintenance records',
      'maintenance_alerts': 'Manage maintenance alerts',
      
      // Notes
      'notes_view': 'View notes and comments',
      'notes_create': 'Create new notes',
      'notes_edit': 'Edit existing notes',
      'notes_delete': 'Delete notes',
      'notes_manage': 'Manage all notes (admin)',
      
      // Users
      'users_view': 'View user information',
      'users_create': 'Create new users',
      'users_edit': 'Edit user details',
      'users_delete': 'Delete users',
      
      // Roles
      'roles_view': 'View role definitions',
      'roles_create': 'Create new roles',
      'roles_edit': 'Edit role permissions',
      'roles_delete': 'Delete roles',
      
      // Companies
      'companies_view': 'View company information',
      'companies_create': 'Create new companies',
      'companies_edit': 'Edit company details',
      'companies_delete': 'Delete companies',
      'companies_switch': 'Switch between companies',
      
      // Providers
      'providers_view': 'View GPS provider information',
      'providers_create': 'Add new GPS providers',
      'providers_edit': 'Edit provider settings',
      'providers_delete': 'Remove GPS providers',
      'providers_test': 'Test GPS provider connections',
      
      // Settings
              'maintenance_settings_view': 'View maintenance settings',
        'maintenance_settings_edit': 'Edit maintenance settings',
        'company_preferences_view': 'View company preferences',
        'company_preferences_edit': 'Edit company preferences',
      
      
      // Analytics & Reports
      'analytics_view': 'View analytics and reports',
      'analytics_export': 'Export analytics data',
      'analytics_admin': 'Full analytics administration',
      'reports_view': 'View reports',
      'reports_export': 'Export reports',
      'reports_advanced': 'Access advanced reporting features',
      
      // Organization
      'org_view': 'View organization information',
      'org_create': 'Create organization entities',
      'org_edit': 'Edit organization settings',
      'org_delete': 'Delete organization entities',
      'org_admin': 'Full organization administration',
      
      // Utilities
      'geocoding_view': 'Access geocoding services'
    };
    
    return permissionMap[permission] || 'Manage this feature';
  };

  const getSelectedRoleTemplate = () => {
    if (!permissionStructure) return null;
    return permissionStructure.roleTemplates[selectedRole];
  };

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
              if (action === 'delete' && (p.includes('users_delete') || p.includes('companies_delete') || p.includes('providers_delete') || p.includes('roles_delete'))) {
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
          
          let granularPermissions: string[] = [];
          
          // Add corresponding granular permissions based on category and action
          if (category === 'fleet') {
            if (action === 'view') {
              granularPermissions = ['trailers_view', 'locations_view', 'maintenance_view', 'notes_view'];
            } else if (action === 'create') {
              granularPermissions = ['trailers_create', 'locations_create', 'maintenance_create', 'notes_create'];
            } else if (action === 'edit') {
              granularPermissions = ['trailers_edit', 'locations_edit', 'maintenance_edit', 'notes_edit'];
            } else if (action === 'delete') {
              granularPermissions = ['trailers_delete', 'locations_delete', 'maintenance_delete'];
            } else if (action === 'admin') {
              granularPermissions = [
                'trailers_view', 'trailers_create', 'trailers_edit', 'trailers_delete',
                'locations_view', 'locations_create', 'locations_edit', 'locations_delete',
                'maintenance_view', 'maintenance_create', 'maintenance_edit', 'maintenance_delete',
                'notes_view', 'notes_create', 'notes_edit', 'notes_delete', 'notes_manage'
              ];
            }
          } else if (category === 'org') {
            if (action === 'view') {
              granularPermissions = ['users_view', 'roles_view', 'companies_view', 'providers_view', 'maintenance_settings_view', 'company_preferences_view'];
            } else if (action === 'create') {
              granularPermissions = ['users_create', 'roles_create', 'companies_create', 'providers_create'];
            } else if (action === 'edit') {
              granularPermissions = ['users_edit', 'roles_edit', 'companies_edit', 'providers_edit', 'maintenance_settings_edit', 'company_preferences_edit'];
            } else if (action === 'delete') {
              granularPermissions = ['users_delete', 'roles_delete', 'companies_delete', 'providers_delete'];
            } else if (action === 'admin') {
              granularPermissions = [
                'users_view', 'users_create', 'users_edit', 'users_delete',
                'roles_view', 'roles_create', 'roles_edit', 'roles_delete',
                'companies_view', 'companies_create', 'companies_edit', 'companies_delete', 'companies_switch',
                'providers_view', 'providers_create', 'providers_edit', 'providers_delete', 'providers_test',
                'maintenance_settings_view', 'maintenance_settings_edit', 'company_preferences_view', 'company_preferences_edit'
              ];
            }
          } else if (category === 'analytics') {
            if (action === 'view') {
              granularPermissions = ['reports_view'];
            } else if (action === 'export') {
              granularPermissions = ['reports_export'];
            } else if (action === 'admin') {
              granularPermissions = ['reports_view', 'reports_export', 'reports_advanced'];
            }
          }
          
          // Filter out permissions that are already selected
          const newGranularPermissions = granularPermissions.filter(p => !newPermissions.includes(p));
          
          return [...newPermissions, ...newGranularPermissions];
        }
        
        return newPermissions;
      }
    });
  };

  // Helper function to get permission by category and action
  const getPermissionByCategoryAndAction = (category: string, action: string) => {
    return allAvailablePermissions.find(p => p === `${category}_${action}`);
  };

  // Helper function to check if permission is selected
  const isPermissionSelected = (category: string, action: string) => {
    const permission = getPermissionByCategoryAndAction(category, action);
    return permission ? editingPermissions.includes(permission) : false;
  };

  // Helper function to handle permission toggle for table
  const handleTablePermissionToggle = (category: string, action: string) => {
    const permission = getPermissionByCategoryAndAction(category, action);
    if (permission) {
      handlePermissionToggle(permission);
    }
  };

  // Get all available actions
  const getAvailableActions = () => {
    const actions = new Set<string>();
    allAvailablePermissions.forEach(permission => {
      const action = permission.split('_').pop();
      if (action) actions.add(action);
    });
    return Array.from(actions).sort();
  };

  // Get all available categories
  const getAvailableCategories = () => {
    const categories = new Set<string>();
    allAvailablePermissions.forEach(permission => {
      const category = permission.split('_')[0];
      if (category) categories.add(category);
    });
    return Array.from(categories).sort();
  };

  // Helper function to get block permissions for a category
  const getBlockPermissionsForCategory = (categoryName: string) => {
    const categoryMap: { [key: string]: string[] } = {
      'Fleet Management': ['fleet_view', 'fleet_create', 'fleet_edit', 'fleet_delete', 'fleet_admin'],
      'Organization Management': ['org_view', 'org_create', 'org_edit', 'org_delete', 'org_admin'],
      'Analytics & Reports': ['analytics_view', 'analytics_export', 'analytics_admin']
    };
    return categoryMap[categoryName] || [];
  };

  const handleSavePermissions = async () => {
    try {
      if (!canEditRoles()) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to edit role permissions. Contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      // Split permissions into block and granular
      const blockPermissions = editingPermissions.filter(p => 
        Object.values(permissionStructure?.blockPermissions || {}).includes(p)
      );
      const granularPermissions = editingPermissions.filter(p => 
        Object.values(permissionStructure?.granularPermissions || {}).includes(p)
      );

      // Update role permissions
      await userAPI.updateRole(selectedRole, {
        permissions: [...blockPermissions, ...granularPermissions]
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating role permissions:', error);
      let errorMessage = "Failed to update role permissions";
      
      if (error.response?.status === 403) {
        errorMessage = "Permission denied: You don't have permission to edit role permissions";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCreateNewRole = () => {
    setShowCreateDialog(true);
  };

  const handleCreateRole = async () => {
    try {
      if (!newRole.name || !newRole.displayName) {
        toast({
          title: "Error",
          description: "Role name and display name are required",
          variant: "destructive",
        });
        return;
      }

      if (!canCreateRoles()) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to create roles. Contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      await userAPI.createRole({
        displayName: newRole.displayName,
        description: newRole.description,
        permissions: []
      });

      setShowCreateDialog(false);
      setNewRole({ name: '', displayName: '', description: '' });
      toast({
        title: "Success",
        description: "New role created successfully",
      });
    } catch (error: any) {
      console.error('Error creating role:', error);
      let errorMessage = "Failed to create new role";
      
      if (error.response?.status === 403) {
        errorMessage = "Permission denied: You don't have permission to create roles";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditPermissions = () => {
    if (!canEditRoles()) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit role permissions. Contact your administrator.",
        variant: "destructive",
      });
      return;
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original permissions
    if (permissionStructure && selectedRole) {
      const template = permissionStructure.roleTemplates[selectedRole];
      if (template) {
        setEditingPermissions([...template.blockPermissions, ...template.granularPermissions]);
      }
    }
  };

  const getSortedRoles = () => {
    if (!permissionStructure) return [];
    
    const roleOrder = ['owner', 'admin', 'manager', 'user', 'viewer'];
    return Object.entries(permissionStructure.roleTemplates).sort((a, b) => {
      const aIndex = roleOrder.indexOf(a[0].toLowerCase());
      const bIndex = roleOrder.indexOf(b[0].toLowerCase());
      return aIndex - bIndex;
    });
  };

  if (!permissionStructure) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading permission structure...</div>
        </CardContent>
      </Card>
    );
  }

  const selectedTemplate = getSelectedRoleTemplate();
  const permissionCategories = getPermissionCategories();
  const sortedRoles = getSortedRoles();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Left Panel - Role List */}
            <div className="lg:col-span-1 p-6 border-r">
              <div className="space-y-2">
                {sortedRoles.map(([roleName, template]) => (
                  <div
                    key={roleName}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRole === roleName 
                        ? 'border-black bg-gray-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRole(roleName)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {getRoleIcon(roleName)}
                      <div className="flex-1">
                        <h4 className="font-medium capitalize text-sm">{template.name}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getRoleUserCount(roleName)} user{getRoleUserCount(roleName) !== 1 ? 's' : ''} • {getRolePermissionCount(roleName)} permissions
                    </div>
                  </div>
                ))}
                
                {/* Separator line */}
                <div className="border-t border-gray-200 my-3"></div>
                
                <Button 
                  className="w-full" 
                  variant="outline" 
                  size="sm"
                  onClick={handleCreateNewRole}
                  disabled={!canCreateRoles()}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {canCreateRoles() ? 'Create New Role' : 'Create New Role (No Permission)'}
                </Button>
              </div>
            </div>

            {/* Right Panel - Role Details */}
            <div className="lg:col-span-2 p-6">
              <div className="space-y-6">
                {/* Role Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRoleIcon(selectedRole)}
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{selectedTemplate?.name}</h3>
                      <Badge variant="secondary">System Role</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSavePermissions}>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleEditPermissions}
                        disabled={!canEditRoles()}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {canEditRoles() ? 'Edit Permissions' : 'Edit Permissions (No Permission)'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Role Description */}
                <div>
                  <p className="text-muted-foreground mb-3">{selectedTemplate?.description}</p>
                  <div className="text-sm text-muted-foreground">
                    {getRolePermissionCount(selectedRole)} permissions • {getRoleUserCount(selectedRole)} user{getRoleUserCount(selectedRole) !== 1 ? 's' : ''} assigned
                  </div>
                </div>

                {/* Permissions Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4" />
                    <h3 className="text-base font-semibold">Permissions</h3>
                    {isEditing && (
                      <Badge variant="outline" className="text-xs">
                        Editing Mode
                      </Badge>
                    )}
                    {!canManageRoles() && (
                      <Badge variant="secondary" className="text-xs">
                        Read Only
                      </Badge>
                    )}
                  </div>

                  {!canManageRoles() && (
                    <div className="mb-3 p-2 bg-muted/50 border rounded text-xs text-muted-foreground">
                      <strong>Permission Notice:</strong> You don't have permission to create or edit roles. 
                      This page is in read-only mode. Contact your administrator to manage roles.
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {permissionCategories.map((category) => (
                      <div key={category.name} className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        {/* Category Header */}
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10">
                              {getCategoryIcon(category.name)}
                            </div>
                            <div>
                              <h4 className="font-medium text-sm">{category.name}</h4>
                              <p className="text-xs text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {editingPermissions.filter(p => 
                              category.blocks.includes(p) || 
                              category.granular.some(g => g.permissions.includes(p))
                            ).length}/{category.blocks.length + category.granular.reduce((sum, g) => sum + g.permissions.length, 0)}
                          </Badge>
                        </div>

                        {/* Permissions Table */}
                        <div className="bg-white">
                            <table className="w-full text-sm bg-white">
                              <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                  <th className="text-left p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Category</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">View</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Create</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Edit</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Delete</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Admin</th>
                                  <th className="text-center p-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Other</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {/* Block Permissions Row */}
                                {category.blocks.length > 0 && (
                                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
                                    <td className="p-3 font-semibold text-blue-900 flex items-center gap-2">
                                      <Shield className="w-4 h-4 text-blue-600" />
                                      Block Permissions
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('fleet_view') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('fleet', 'view')}
                                            onCheckedChange={() => handleTablePermissionToggle('fleet', 'view')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('org_view') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('org', 'view')}
                                            onCheckedChange={() => handleTablePermissionToggle('org', 'view')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('analytics_view') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('analytics', 'view')}
                                            onCheckedChange={() => handleTablePermissionToggle('analytics', 'view')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('fleet_create') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('fleet', 'create')}
                                            onCheckedChange={() => handleTablePermissionToggle('fleet', 'create')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('org_create') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('org', 'create')}
                                            onCheckedChange={() => handleTablePermissionToggle('org', 'create')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('fleet_edit') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('fleet', 'edit')}
                                            onCheckedChange={() => handleTablePermissionToggle('fleet', 'edit')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('org_edit') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('org', 'edit')}
                                            onCheckedChange={() => handleTablePermissionToggle('org', 'edit')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('fleet_delete') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('fleet', 'delete')}
                                            onCheckedChange={() => handleTablePermissionToggle('fleet', 'delete')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('org_delete') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('org', 'delete')}
                                            onCheckedChange={() => handleTablePermissionToggle('org', 'delete')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('fleet_admin') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('fleet', 'admin')}
                                            onCheckedChange={() => handleTablePermissionToggle('fleet', 'admin')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('org_admin') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('org', 'admin')}
                                            onCheckedChange={() => handleTablePermissionToggle('org', 'admin')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                      {getBlockPermissionsForCategory(category.name).includes('analytics_admin') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('analytics', 'admin')}
                                            onCheckedChange={() => handleTablePermissionToggle('analytics', 'admin')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {getBlockPermissionsForCategory(category.name).includes('analytics_export') && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={isPermissionSelected('analytics', 'export')}
                                            onCheckedChange={() => handleTablePermissionToggle('analytics', 'export')}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}

                                {/* Granular Permissions Rows */}
                                {category.granular.map((group, index) => (
                                  <tr key={group.name} className={`hover:bg-gray-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                    <td className="p-3 font-medium text-gray-800 flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-gray-100">
                                        {getGroupIcon(group.name)}
                                      </div>
                                      <span className="text-sm">{group.name}</span>
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.some(p => p.includes('_view')) && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={group.permissions.some(p => p.includes('_view') && editingPermissions.includes(p))}
                                            onCheckedChange={() => {
                                              const viewPermission = group.permissions.find(p => p.includes('_view'));
                                              if (viewPermission) handlePermissionToggle(viewPermission);
                                            }}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.some(p => p.includes('_create')) && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={group.permissions.some(p => p.includes('_create') && editingPermissions.includes(p))}
                                            onCheckedChange={() => {
                                              const createPermission = group.permissions.find(p => p.includes('_create'));
                                              if (createPermission) handlePermissionToggle(createPermission);
                                            }}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.some(p => p.includes('_edit')) && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={group.permissions.some(p => p.includes('_edit') && editingPermissions.includes(p))}
                                            onCheckedChange={() => {
                                              const editPermission = group.permissions.find(p => p.includes('_edit'));
                                              if (editPermission) handlePermissionToggle(editPermission);
                                            }}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.some(p => p.includes('_delete')) && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={group.permissions.some(p => p.includes('_delete') && editingPermissions.includes(p))}
                                            onCheckedChange={() => {
                                              const deletePermission = group.permissions.find(p => p.includes('_delete'));
                                              if (deletePermission) handlePermissionToggle(deletePermission);
                                            }}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.some(p => p.includes('_admin')) && (
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={group.permissions.some(p => p.includes('_admin') && editingPermissions.includes(p))}
                                            onCheckedChange={() => {
                                              const adminPermission = group.permissions.find(p => p.includes('_admin'));
                                              if (adminPermission) handlePermissionToggle(adminPermission);
                                            }}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                          />
                                        </div>
                                      )}
                                    </td>
                                    <td className="text-center p-3">
                                      {group.permissions.filter(p => !p.includes('_view') && !p.includes('_create') && !p.includes('_edit') && !p.includes('_delete') && !p.includes('_admin')).map((permission) => (
                                        <div key={permission} className="flex items-center justify-center gap-2 p-1 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                                          <Checkbox
                                            checked={editingPermissions.includes(permission)}
                                            onCheckedChange={() => handlePermissionToggle(permission)}
                                            disabled={!isEditing}
                                            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                          />
                                          <span className="text-xs text-gray-600 font-medium">{getPermissionDisplayName(permission)}</span>
                                        </div>
                                      ))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                    ),)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                placeholder="e.g., custom_role"
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="e.g., Custom Role"
                value={newRole.displayName}
                onChange={(e) => setNewRole(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the role's purpose and permissions..."
                value={newRole.description}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;