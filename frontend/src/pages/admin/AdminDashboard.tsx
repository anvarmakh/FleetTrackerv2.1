// ============================================================================
// ADMIN DASHBOARD - REFACTORED VERSION
// ============================================================================

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { AdminOverview } from './components/AdminOverview';
import { TenantManagement } from './components/TenantManagement';
import { UserManagement } from './components/UserManagement';
import { SystemHealth } from './components/SystemHealth';
import { AdminActions } from './components/AdminActions';
import TripleConfirmationDialog from '@/components/TripleConfirmationDialog';
import SimpleConfirmationDialog from '@/components/SimpleConfirmationDialog';

const AdminDashboard = () => {
  const {
    // State
    overview,
    tenants,
    users,
    orphanedUsers,
    logs,
    health,
    loading,
    newTenantData,
    newUserData,
    expandedTenants,
    deleteDialog,
    activateDeactivateDialog,

    // Actions
    handleSignOut,
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
  } = useAdminDashboard();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System overview and management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <AdminOverview overview={overview} tenants={tenants} />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenants & Users</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <TenantManagement
            tenants={tenants}
            expandedTenants={expandedTenants}
            onToggleTenantExpansion={toggleTenantExpansion}
            onViewTenantDetails={handleViewTenantDetails}
            onDeleteTenant={handleDeleteTenant}
            onDeactivateTenant={handleDeactivateTenant}
            onActivateTenant={handleActivateTenant}
            onDeleteUser={handleDeleteUser}
            onDeactivateUser={handleDeactivateUser}
            onActivateUser={handleActivateUser}
          />
          <UserManagement
            orphanedUsers={orphanedUsers}
            onCleanupOrphanedUsers={handleCleanupOrphanedUsers}
            onDeleteUser={handleDeleteUser}
            onDeactivateUser={handleDeactivateUser}
            onActivateUser={handleActivateUser}
          />
        </TabsContent>

        <TabsContent value="management" className="space-y-4">
          <AdminActions
            newTenantData={newTenantData}
            newUserData={newUserData}
            tenants={tenants}
            onNewTenantDataChange={setNewTenantData}
            onNewUserDataChange={setNewUserData}
            onCreateTenant={handleCreateTenant}
            onCreateUser={handleCreateUser}
    
            onUserManagement={handleUserManagement}
            onTenantSettings={handleTenantSettings}
          />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">System Logs</h2>
            {logs && logs.length > 0 ? (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.level === 'error' ? 'bg-red-100 text-red-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="mt-2">{log.message}</p>
                    {log.tenant && (
                      <p className="text-sm text-gray-500 mt-1">Tenant: {log.tenant}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No system logs available</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          {health && <SystemHealth health={health} />}
        </TabsContent>
      </Tabs>

      {/* Triple Confirmation Dialog for Delete */}
      <TripleConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteDialog.type === 'tenant' ? 'Tenant' : 'User'}`}
        description={`Are you sure you want to delete this ${deleteDialog.type}? This action cannot be undone.`}
        confirmText="Delete"
        itemName={deleteDialog.item?.tenantName || deleteDialog.item?.email}
        itemType={deleteDialog.type || 'user'}
        isLoading={deleteDialog.isLoading}
      />

      {/* Simple Confirmation Dialog for Activate/Deactivate */}
      <SimpleConfirmationDialog
        isOpen={activateDeactivateDialog.isOpen}
        onClose={handleCloseActivateDeactivateDialog}
        onConfirm={handleConfirmActivateDeactivate}
        title={`${activateDeactivateDialog.action === 'activate' ? 'Activate' : 'Deactivate'} ${activateDeactivateDialog.type === 'tenant' ? 'Tenant' : 'User'}`}
        description={`Are you sure you want to ${activateDeactivateDialog.action} ${activateDeactivateDialog.item?.tenantName || activateDeactivateDialog.item?.email}? ${activateDeactivateDialog.action === 'activate' ? 'This will restore access.' : 'This will disable access but preserve data.'}`}
        confirmText={activateDeactivateDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
        isLoading={activateDeactivateDialog.isLoading}
        type={activateDeactivateDialog.action}
      />
    </div>
  );
};

export default AdminDashboard;
