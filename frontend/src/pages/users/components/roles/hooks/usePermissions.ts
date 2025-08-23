import { PermissionStructure } from '../types';
import { PermissionCategoryWithCounts } from '@/types';

export const usePermissions = () => {
  // Helper function to get permission by category and action
  const getPermissionByCategoryAndAction = (category: string, action: string, allAvailablePermissions: string[]) => {
    return allAvailablePermissions.find(p => p === `${category}_${action}`);
  };

  // Helper function to check if permission is selected
  const isPermissionSelected = (category: string, action: string, editingPermissions: string[], allAvailablePermissions: string[]) => {
    const permission = getPermissionByCategoryAndAction(category, action, allAvailablePermissions);
    return permission ? editingPermissions.includes(permission) : false;
  };

  // Get all available actions
  const getAvailableActions = (allAvailablePermissions: string[]) => {
    const actions = new Set<string>();
    allAvailablePermissions.forEach(permission => {
      const action = permission.split('_').pop();
      if (action) actions.add(action);
    });
    return Array.from(actions).sort();
  };

  // Get all available categories
  const getAvailableCategories = (allAvailablePermissions: string[]) => {
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

  const getPermissionDisplayName = (permission: string) => {
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
       'roles_assign_admin': 'Assign users to admin roles',
      
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

  const getPermissionCategories = (permissionStructure: PermissionStructure | null, editingPermissions: string[], allAvailablePermissions: string[], isEditing: boolean): PermissionCategoryWithCounts[] => {
    if (!permissionStructure) return [];
    
    // Get the permission structure from the backend
    const { permissionStructure: structure } = permissionStructure;
    
    // Create categories based on the actual backend structure
    const categories = [];
    
    // Fleet Management
    if (structure.fleet) {
      const fleetPermissions = editingPermissions.filter(p => 
        p.includes('fleet_') || 
        p.includes('trailers_') || 
        p.includes('locations_') || 
        p.includes('maintenance_') || 
        p.includes('notes_')
      );
      
      // Get all available fleet permissions for total count
      const allFleetPermissions = allAvailablePermissions.filter(p => 
        p.includes('fleet_') || 
        p.includes('trailers_') || 
        p.includes('locations_') || 
        p.includes('maintenance_') || 
        p.includes('notes_')
      );
      
      if (allFleetPermissions.length > 0) {
        categories.push({
          name: 'Fleet Management',
          description: 'Manage fleet operations, trailers, locations, maintenance, and notes',
          blocks: structure.fleet.blocks.filter(block => allAvailablePermissions.includes(block)),
          granular: Object.entries(structure.fleet.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => allAvailablePermissions.includes(p))
          })).filter(group => group.permissions.length > 0),
          enabledCount: fleetPermissions.length,
          totalCount: allFleetPermissions.length
        });
      }
    }
    
    // Organization Management
    if (structure.organization) {
      const orgPermissions = editingPermissions.filter(p => 
        p.includes('users_') || 
        p.includes('companies_') || 
        p.includes('providers_') || 
        p.includes('settings_') || 
        p.includes('roles_') || 
        p.includes('org_')
      );
      
      // Get all available org permissions for total count
      const allOrgPermissions = allAvailablePermissions.filter(p => 
        p.includes('users_') || 
        p.includes('companies_') || 
        p.includes('providers_') || 
        p.includes('settings_') || 
        p.includes('roles_') || 
        p.includes('org_')
      );
      
      if (allOrgPermissions.length > 0) {
        categories.push({
          name: 'Organization Management',
          description: 'Manage users, companies, providers, settings, and roles',
          blocks: structure.organization.blocks.filter(block => allAvailablePermissions.includes(block)),
          granular: Object.entries(structure.organization.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => allAvailablePermissions.includes(p))
          })).filter(group => group.permissions.length > 0),
          enabledCount: orgPermissions.length,
          totalCount: allOrgPermissions.length
        });
      }
    }
    
    // Analytics & Reports
    if (structure.analytics) {
      const analyticsPermissions = editingPermissions.filter(p => 
        p.includes('analytics_') || 
        p.includes('reports_')
      );
      
      // Get all available analytics permissions for total count
      const allAnalyticsPermissions = allAvailablePermissions.filter(p => 
        p.includes('analytics_') || 
        p.includes('reports_')
      );
      
      if (allAnalyticsPermissions.length > 0) {
        categories.push({
          name: 'Analytics & Reports',
          description: 'View and export analytics data and reports',
          blocks: structure.analytics.blocks.filter(block => allAvailablePermissions.includes(block)),
          granular: Object.entries(structure.analytics.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => allAvailablePermissions.includes(p))
          })).filter(group => group.permissions.length > 0),
          enabledCount: analyticsPermissions.length,
          totalCount: allAnalyticsPermissions.length
        });
      }
    }
    
    // Utilities
    if (structure.utilities) {
      const utilityPermissions = editingPermissions.filter(p => 
        p.includes('geocoding_')
      );
      
      // Get all available utility permissions for total count
      const allUtilityPermissions = allAvailablePermissions.filter(p => 
        p.includes('geocoding_')
      );
      
      if (allUtilityPermissions.length > 0) {
        categories.push({
          name: 'Utilities & Services',
          description: 'Additional utility services and features',
          blocks: structure.utilities.blocks.filter(block => allAvailablePermissions.includes(block)),
          granular: Object.entries(structure.utilities.granular).map(([key, group]) => ({
            name: group.name,
            permissions: group.permissions.filter(p => allAvailablePermissions.includes(p))
          })).filter(group => group.permissions.length > 0),
          enabledCount: utilityPermissions.length,
          totalCount: allUtilityPermissions.length
        });
      }
    }

    return categories;
  };

  return {
    getPermissionByCategoryAndAction,
    isPermissionSelected,
    getAvailableActions,
    getAvailableCategories,
    getBlockPermissionsForCategory,
    getPermissionDisplayName,
    getPermissionDescription,
    getPermissionCategories
  };
};
