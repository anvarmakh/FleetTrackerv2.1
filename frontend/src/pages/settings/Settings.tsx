import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TabsContent } from '@/components/ui/tabs';
import { companyAPI, providerAPI, maintenanceAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import SettingsLayout from './components/SettingsLayout';
import CompanySettings from './components/CompanySettings';
import ProviderSettings from './components/ProviderSettings';

import MaintenanceSettings from './components/MaintenanceSettings';
import PreferencesSettings from './components/PreferencesSettings';
import { 
  Company, 
  Provider, 
  MaintenancePreferences
} from '@/types';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for user permissions
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Load user permissions
  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        setPermissionsLoading(true);
        // This would typically come from your auth context or API
        // For now, we'll use the role-based permissions
        const rolePermissions: Record<string, string[]> = {
          'superadmin': ['companies_view', 'providers_view', 'maintenance_settings_view', 'company_preferences_view'],
          'owner': ['companies_view', 'providers_view', 'maintenance_settings_view', 'company_preferences_view'],
          'admin': ['companies_view', 'providers_view', 'maintenance_settings_view', 'company_preferences_view'],
          'manager': ['companies_view', 'providers_view'],
          'user': [],
        };
        
        const permissions = rolePermissions[user?.organizationRole || 'user'] || [];
        setUserPermissions(permissions);
      } catch (error) {
        console.error('Error loading user permissions:', error);
      } finally {
        setPermissionsLoading(false);
      }
    };

    loadUserPermissions();
  }, [user?.organizationRole]);

  // Check user permissions for UI feedback
  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission);
  };

  const canViewCompanies = hasPermission('companies_view');
  const canViewProviders = hasPermission('providers_view');
  const canViewMaintenanceSettings = hasPermission('maintenance_settings_view');
  const canViewCompanyPreferences = hasPermission('company_preferences_view');

  // Check if user has access to any settings tab
  const hasAnySettingsAccess = canViewCompanies || canViewProviders || canViewMaintenanceSettings || canViewCompanyPreferences;

  if (!hasAnySettingsAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access any settings. Contact your administrator for access.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');



  const [maintenancePreferences, setMaintenancePreferences] = useState<MaintenancePreferences>({
    annual_inspection_interval: 365,
    midtrip_inspection_interval: 7,
    brake_inspection_interval: 90,
    annual_alert_threshold: 30,
    midtrip_alert_threshold: 14,
    brake_alert_threshold: 14,
    enable_maintenance_alerts: true,
    enable_email_notifications: true,
    enable_push_notifications: true
  });

  // Data Loading
  const loadSettingsData = useCallback(async () => {
    try {
      setLoading(true);
  
      
      const [companiesResponse, activeCompanyResponse, providersResponse, maintenancePrefsResponse] = await Promise.allSettled([
        companyAPI.getCompanies(),
        companyAPI.getActive(),
        providerAPI.getProviders(),
        maintenanceAPI.getMaintenancePreferences()
      ]);

      // Handle companies
      if (companiesResponse.status === 'fulfilled') {
        const response = companiesResponse.value;
        const responseData = response.data as any;
        if (responseData && responseData.success) {
          setCompanies(responseData.companies || responseData.data || []);
        } else if (Array.isArray(responseData)) {
          setCompanies(responseData);
        }
      }

      // Handle active company
      if (activeCompanyResponse.status === 'fulfilled') {
        const response = activeCompanyResponse.value;
        const responseData = response.data as any;
        if (responseData && responseData.success) {
          setActiveCompany(responseData.data);
        }
      }

      // Handle providers
      if (providersResponse.status === 'fulfilled') {
        const response = providersResponse.value;
        const responseData = response.data as any;
        if (responseData && responseData.success) {
          setProviders(responseData.data);
        } else if (Array.isArray(responseData)) {
          setProviders(responseData);
        }
      }

      // Handle maintenance preferences
      if (maintenancePrefsResponse.status === 'fulfilled') {
        const response = maintenancePrefsResponse.value;
        const responseData = response.data as any;
        if (responseData && responseData.success) {
          setMaintenancePreferences(responseData.data);
        }
      }

    } catch (error: unknown) {
      console.error('Error loading settings data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Effects
  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  // Event Handlers
  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Loading State
  if (loading || permissionsLoading) {
    return (
      <SettingsLayout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        canViewCompanies={canViewCompanies}
        canViewProviders={canViewProviders}
        canViewMaintenanceSettings={canViewMaintenanceSettings}
        canViewCompanyPreferences={canViewCompanyPreferences}
        isDataReady={!loading && !permissionsLoading}
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      canViewCompanies={canViewCompanies}
      canViewProviders={canViewProviders}
      canViewMaintenanceSettings={canViewMaintenanceSettings}
      canViewCompanyPreferences={canViewCompanyPreferences}
      isDataReady={!loading && !permissionsLoading}
    >
      <TabsContent value="company">
        {canViewCompanies ? (
          <CompanySettings 
            companies={companies} 
            onRefresh={loadSettingsData} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You don't have permission to view company settings.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="providers">
        {canViewProviders ? (
          <ProviderSettings 
            providers={providers} 
            companies={companies} 
            onRefresh={loadSettingsData} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You don't have permission to view GPS providers.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="maintenance">
        {canViewMaintenanceSettings ? (
          <MaintenanceSettings 
            maintenancePreferences={maintenancePreferences} 
            onMaintenancePreferencesChange={setMaintenancePreferences} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You don't have permission to view maintenance settings.</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="preferences">
        {canViewCompanyPreferences ? (
          <PreferencesSettings 
            // Add preferences data and handlers here
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">You don't have permission to view company preferences.</p>
          </div>
        )}
      </TabsContent>
    </SettingsLayout>
  );
};

export default Settings;