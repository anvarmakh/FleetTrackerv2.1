// ============================================================================
// ADMIN DASHBOARD HOOK
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AdminOverview, 
  Tenant, 
  User, 
  SystemLog, 
  SystemHealth 
} from '@/types';

export function useAdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orphanedUsers, setOrphanedUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [newTenantData, setNewTenantData] = useState({ 
    tenantName: '',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerPassword: '',
    confirmPassword: '',
    companyName: '',
    companyColor: '#6b7280'
  });
  const [newUserData, setNewUserData] = useState({ 
    email: '', 
    tenantId: '', 
    organizationRole: 'user',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    type: 'tenant' | 'user' | null;
    item: Tenant | User | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    item: null,
    isLoading: false
  });

  const [activateDeactivateDialog, setActivateDeactivateDialog] = useState<{
    isOpen: boolean;
    action: 'activate' | 'deactivate';
    type: 'tenant' | 'user' | null;
    item: Tenant | User | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    action: 'deactivate',
    type: null,
    item: null,
    isLoading: false
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const hasLoadedRef = useRef(false);

  const handleSignOut = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if admin token exists and is valid
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        logout();
        navigate('/login');
        return;
      }
      
      // Load overview
      const overviewResponse = await adminAPI.getOverview();
      if (overviewResponse.data.success) {
        setOverview(overviewResponse.data.data.overview);
      }

      // Load tenants
      const tenantsResponse = await adminAPI.getTenants();
      if (tenantsResponse.data.success) {
        setTenants(tenantsResponse.data.data);
      }

      // Load orphaned users
      const orphanedUsersResponse = await adminAPI.getOrphanedUsers();
      if (orphanedUsersResponse.data.success) {
        setOrphanedUsers(orphanedUsersResponse.data.data);
      }

      // Load system logs
      const logsResponse = await adminAPI.getLogs();
      if (logsResponse.data.success) {
        setLogs(logsResponse.data.data);
      }

      // Load system health
      const healthResponse = await adminAPI.getHealth();
      if (healthResponse.data.success) {
        setHealth(healthResponse.data.data);
      }

    } catch (error: unknown) {
      console.error('Failed to load admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    // Only load data once when component mounts
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDashboardData();
    }
  }, []); // Empty dependency array - only run once

  const handleCreateTenant = async () => {
    try {
      if (!newTenantData.tenantName || 
          !newTenantData.ownerEmail || !newTenantData.ownerFirstName || 
          !newTenantData.ownerLastName || !newTenantData.ownerPassword ||
          !newTenantData.companyName) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields including company name",
          variant: "destructive",
        });
        return;
      }

      if (newTenantData.ownerPassword !== newTenantData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      // Map the form data to match the API expectations
      const apiData = {
        tenantName: newTenantData.tenantName,
        email: newTenantData.ownerEmail,
        firstName: newTenantData.ownerFirstName,
        lastName: newTenantData.ownerLastName,
        password: newTenantData.ownerPassword,
        companyName: newTenantData.companyName,
        companyColor: newTenantData.companyColor
      };

      const response = await adminAPI.createTenant(apiData);
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Tenant, company, and admin user created successfully",
        });
        setNewTenantData({ 
          tenantName: '',
          ownerEmail: '',
          ownerFirstName: '',
          ownerLastName: '',
          ownerPassword: '',
          confirmPassword: '',
          companyName: '',
          companyColor: '#6b7280'
        });
        loadDashboardData(); // Refresh data
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tenant';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      if (!newUserData.email || !newUserData.tenantId || !newUserData.organizationRole || 
          !newUserData.firstName || !newUserData.lastName || !newUserData.password) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      if (newUserData.password !== newUserData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }

      // Map the form data to match the API expectations
      const apiData = {
        email: newUserData.email,
        tenantId: newUserData.tenantId,
        organizationRole: newUserData.organizationRole,
        firstName: newUserData.firstName,
        lastName: newUserData.lastName,
        password: newUserData.password
      };

      const response = await adminAPI.createUser(apiData);
      if (response.data.success) {
        const temporaryPassword = response.data.data.temporaryPassword;
        toast({
          title: "User Created Successfully",
          description: `User created with temporary password: ${temporaryPassword}. Please provide this to the user.`,
        });
        setNewUserData({ 
          email: '', 
          tenantId: '', 
          organizationRole: 'user',
          firstName: '',
          lastName: '',
          password: '',
          confirmPassword: ''
        });
        loadDashboardData(); // Refresh the user list
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };



  const handleUserManagement = () => {
    // Navigate to tenants tab since users are now shown there
    const tabsElement = document.querySelector('[data-value="tenants"]') as HTMLElement;
    if (tabsElement) {
      tabsElement.click();
    }
  };

  const handleCleanupOrphanedUsers = async () => {
    try {
      const response = await adminAPI.cleanupOrphanedUsers();
      if (response.data.success) {
        toast({
          title: "Cleanup Successful",
          description: response.data.message,
        });
        loadDashboardData(); // Refresh the data
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cleanup orphaned users';
      toast({
        title: "Cleanup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleTenantSettings = () => {
    // Navigate to tenants tab
    const tabsElement = document.querySelector('[data-value="tenants"]') as HTMLElement;
    if (tabsElement) {
      tabsElement.click();
    }
  };

  const toggleTenantExpansion = async (tenant_id: string) => {
    const newExpanded = new Set(expandedTenants);
    if (newExpanded.has(tenant_id)) {
      newExpanded.delete(tenant_id);
    } else {
      newExpanded.add(tenant_id);
    }
    setExpandedTenants(newExpanded);
  };

  const handleViewTenantDetails = (tenant: Tenant) => {
    // For now, just show a toast with tenant details
    // In the future, this could open a detailed modal or navigate to a tenant details page
    toast({
      title: `Tenant Details: ${tenant.tenantId}`,
      description: `Users: ${tenant.userCount} | Companies: ${tenant.companyCount} | Trailers: ${tenant.trailerCount} | Providers: ${tenant.providerCount}`,
    });
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setDeleteDialog({
      isOpen: true,
      type: 'tenant',
      item: tenant,
      isLoading: false
    });
  };

  const handleDeleteUser = (user: User) => {
    setDeleteDialog({
      isOpen: true,
      type: 'user',
      item: user,
      isLoading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.item) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));

    try {
      if (deleteDialog.type === 'tenant') {
        const response = await adminAPI.deleteTenant(deleteDialog.item.tenantId);
        if (response.data.success) {
          toast({
            title: 'Tenant Deleted',
            description: `Tenant ${deleteDialog.item.tenantName} and all associated data have been deleted successfully.`,
          });
          loadDashboardData(); // Refresh the data
        }
      } else if (deleteDialog.type === 'user') {
        const response = await adminAPI.deleteUser(deleteDialog.item.id);
        if (response.data.success) {
          toast({
            title: 'User Deleted',
            description: `User ${deleteDialog.item.email} has been deleted successfully.`,
          });
          loadDashboardData(); // Refresh the data
        }
      }
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      type: null,
      item: null,
      isLoading: false
    });
  };

  const handleDeactivateTenant = (tenant: Tenant) => {
    setActivateDeactivateDialog({
      isOpen: true,
      action: 'deactivate',
      type: 'tenant',
      item: tenant,
      isLoading: false
    });
  };

  const handleDeactivateUser = (user: User) => {
    setActivateDeactivateDialog({
      isOpen: true,
      action: 'deactivate',
      type: 'user',
      item: user,
      isLoading: false
    });
  };

  const handleConfirmActivateDeactivate = async () => {
    if (!activateDeactivateDialog.item || !activateDeactivateDialog.type) return;

    setActivateDeactivateDialog(prev => ({ ...prev, isLoading: true }));

    try {
      let response;
      if (activateDeactivateDialog.action === 'deactivate') {
        if (activateDeactivateDialog.type === 'tenant') {
          response = await adminAPI.deactivateTenant(activateDeactivateDialog.item.tenantId);
        } else if (activateDeactivateDialog.type === 'user') {
          response = await adminAPI.deactivateUser(activateDeactivateDialog.item.id);
        }
      } else if (activateDeactivateDialog.action === 'activate') {
        if (activateDeactivateDialog.type === 'tenant') {
          response = await adminAPI.activateTenant(activateDeactivateDialog.item.tenantId);
        } else if (activateDeactivateDialog.type === 'user') {
          response = await adminAPI.activateUser(activateDeactivateDialog.item.id);
        }
      }

      if (response?.data.success) {
        const actionText = activateDeactivateDialog.action === 'activate' ? 'Activation' : 'Deactivation';
        const itemName = activateDeactivateDialog.type === 'tenant' ? activateDeactivateDialog.item.tenantName : activateDeactivateDialog.item.email;
        toast({
          title: `${actionText} Successful`,
          description: `${activateDeactivateDialog.type === 'tenant' ? 'Tenant' : 'User'} ${itemName} has been ${activateDeactivateDialog.action}d successfully.`,
        });
        loadDashboardData(); // Refresh the data
      }
    } catch (error) {
      const actionText = activateDeactivateDialog.action === 'activate' ? 'Activation' : 'Deactivation';
      toast({
        title: `${actionText} Failed`,
        description: `Failed to ${activateDeactivateDialog.action} ${activateDeactivateDialog.type}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setActivateDeactivateDialog(prev => ({ ...prev, isLoading: false, isOpen: false }));
    }
  };

  const handleCloseActivateDeactivateDialog = () => {
    setActivateDeactivateDialog({
      isOpen: false,
      action: 'deactivate',
      type: null,
      item: null,
      isLoading: false
    });
  };

  const handleActivateTenant = (tenant: Tenant) => {
    setActivateDeactivateDialog({
      isOpen: true,
      action: 'activate',
      type: 'tenant',
      item: tenant,
      isLoading: false
    });
  };

  const handleActivateUser = (user: User) => {
    setActivateDeactivateDialog({
      isOpen: true,
      action: 'activate',
      type: 'user',
      item: user,
      isLoading: false
    });
  };

  return {
    // State
    overview,
    tenants,
    users,
    orphanedUsers,
    logs,
    health,
    loading,
    selectedTenant,
    newTenantData,
    newUserData,
    expandedTenants,
    deleteDialog,
    activateDeactivateDialog,

    // Actions
    handleSignOut,
    loadDashboardData,
    handleCreateTenant,
    handleCreateUser,

    handleUserManagement,
    handleCleanupOrphanedUsers,
    handleTenantSettings,
    toggleTenantExpansion,
    handleViewTenantDetails,
    handleDeleteTenant,
    handleDeleteUser,
    handleConfirmDelete,
    handleCloseDeleteDialog,
    handleDeactivateTenant,
    handleDeactivateUser,
    handleConfirmActivateDeactivate,
    handleCloseActivateDeactivateDialog,
    handleActivateTenant,
    handleActivateUser,

    // Setters
    setNewTenantData,
    setNewUserData,
  };
}
