import React from 'react';
import Navigation from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Wifi, Wrench, Settings, Database, Palette } from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (value: string) => void;
  canViewCompanies?: boolean;
  canViewProviders?: boolean;
  canViewMaintenanceSettings?: boolean;
  canViewCompanyPreferences?: boolean;
  isDataReady?: boolean;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  canViewCompanies = true,
  canViewProviders = true,
  canViewMaintenanceSettings = true,
  canViewCompanyPreferences = true,
  isDataReady = true
}) => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          </div>

          <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="company" disabled={!isDataReady || !canViewCompanies} className="gap-2">
                <Building className="w-4 h-4" />
                Company {!isDataReady || !canViewCompanies ? '(No Access)' : ''}
              </TabsTrigger>
              <TabsTrigger value="providers" disabled={!isDataReady || !canViewProviders} className="gap-2">
                <Database className="w-4 h-4" />
                GPS Providers {!isDataReady || !canViewProviders ? '(No Access)' : ''}
              </TabsTrigger>
              <TabsTrigger value="maintenance" disabled={!isDataReady || !canViewMaintenanceSettings} className="gap-2">
                <Wrench className="w-4 h-4" />
                Maintenance {!isDataReady || !canViewMaintenanceSettings ? '(No Access)' : ''}
              </TabsTrigger>
              <TabsTrigger value="preferences" disabled={!isDataReady || !canViewCompanyPreferences} className="gap-2">
                <Palette className="w-4 h-4" />
                Preferences {!isDataReady || !canViewCompanyPreferences ? '(No Access)' : ''}
              </TabsTrigger>
            </TabsList>

            {children}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
