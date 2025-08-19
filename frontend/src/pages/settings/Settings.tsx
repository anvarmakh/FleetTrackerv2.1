import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TabsContent } from '@/components/ui/tabs';
import { companyAPI, providerAPI, maintenanceAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import SettingsLayout from './components/SettingsLayout';
import CompanySettings from './components/CompanySettings';
import ProviderSettings from './components/ProviderSettings';
import PreferencesSettings from './components/PreferencesSettings';
import MaintenanceSettings from './components/MaintenanceSettings';
import { 
  Company, 
  Provider, 
  MaintenancePreferences, 
  UserPreferences 
} from '@/types';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company');

  // Preferences States
  const [preferences, setPreferences] = useState<UserPreferences>({
    timezone: 'America/New_York',
    language: 'en',
    theme: 'light',
    notifications: { email: true, push: true, sms: false },
    display: { showTrailerCount: true, showLastSync: true, autoRefresh: true, refreshInterval: 30 }
  });

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
      console.log('🔍 Loading settings data for user:', user);
      
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
        console.log('🔍 Providers response:', responseData);
        if (responseData && responseData.success) {
          console.log('🔍 Setting providers:', responseData.data);
          setProviders(responseData.data);
        } else if (Array.isArray(responseData)) {
          console.log('🔍 Setting providers (direct array):', responseData);
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
  if (loading) {
    return (
      <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabsContent value="company">
        <CompanySettings 
          companies={companies} 
          onRefresh={loadSettingsData} 
        />
      </TabsContent>

      <TabsContent value="providers">
        <ProviderSettings 
          providers={providers} 
          companies={companies} 
          onRefresh={loadSettingsData} 
        />
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesSettings 
          preferences={preferences} 
          onPreferencesChange={setPreferences} 
        />
      </TabsContent>

      <TabsContent value="maintenance">
        <MaintenanceSettings 
          maintenancePreferences={maintenancePreferences} 
          onMaintenancePreferencesChange={setMaintenancePreferences} 
        />
      </TabsContent>
    </SettingsLayout>
  );
};

export default Settings;