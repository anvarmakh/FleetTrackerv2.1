import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { maintenanceAPI } from '@/lib/api';
import { MaintenancePreferences } from '@/types';
import ToggleSetting from './ui/ToggleSetting';
import MaintenanceIntervalSection from './ui/MaintenanceIntervalSection';

interface MaintenanceSettingsProps {
  maintenancePreferences: MaintenancePreferences;
  onMaintenancePreferencesChange: (preferences: MaintenancePreferences) => void;
}

const MaintenanceSettings: React.FC<MaintenanceSettingsProps> = ({ 
  maintenancePreferences, 
  onMaintenancePreferencesChange 
}) => {
  const { toast } = useToast();
  const [savingMaintenancePreferences, setSavingMaintenancePreferences] = useState(false);

  const handleSaveMaintenancePreferences = async () => {
    try {
      setSavingMaintenancePreferences(true);
      const response = await maintenanceAPI.updateMaintenancePreferences({
        annualInspectionInterval: maintenancePreferences.annual_inspection_interval,
        midtripInspectionInterval: maintenancePreferences.midtrip_inspection_interval,
        brakeInspectionInterval: maintenancePreferences.brake_inspection_interval,
        annualAlertThreshold: maintenancePreferences.annual_alert_threshold,
        midtripAlertThreshold: maintenancePreferences.midtrip_alert_threshold,
        brakeAlertThreshold: maintenancePreferences.brake_alert_threshold,
        enableMaintenanceAlerts: maintenancePreferences.enable_maintenance_alerts,
        enableEmailNotifications: maintenancePreferences.enable_email_notifications,
        enablePushNotifications: maintenancePreferences.enable_push_notifications
      });
      
      if (response.data.success) {
        toast({ title: "Maintenance preferences saved", description: "Your maintenance preferences have been updated successfully." });
      } else {
        throw new Error(response.data.error || 'Failed to save maintenance preferences');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save maintenance preferences';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingMaintenancePreferences(false);
    }
  };

  const handleMaintenancePreferenceChange = (field: keyof MaintenancePreferences, value: number | boolean) => {
    onMaintenancePreferencesChange({ ...maintenancePreferences, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Maintenance Preferences</CardTitle>
            <CardDescription>Configure maintenance intervals and alert settings</CardDescription>
          </div>
          <Button 
            size="sm"
            onClick={handleSaveMaintenancePreferences}
            disabled={savingMaintenancePreferences}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {savingMaintenancePreferences ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <MaintenanceIntervalSection
          title="Annual Inspection"
          intervalField="annual_inspection_interval"
          thresholdField="annual_alert_threshold"
          preferences={maintenancePreferences}
          onChange={handleMaintenancePreferenceChange}
        />

        <Separator />

        <MaintenanceIntervalSection
          title="Midtrip Inspection"
          intervalField="midtrip_inspection_interval"
          thresholdField="midtrip_alert_threshold"
          preferences={maintenancePreferences}
          onChange={handleMaintenancePreferenceChange}
        />

        <Separator />

        <MaintenanceIntervalSection
          title="Brake Inspection"
          intervalField="brake_inspection_interval"
          thresholdField="brake_alert_threshold"
          preferences={maintenancePreferences}
          onChange={handleMaintenancePreferenceChange}
        />

        <Separator />

        {/* Alert Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Alert Settings</h3>
          <div className="space-y-4">
            <ToggleSetting
              label="Enable Maintenance Alerts"
              description="Receive alerts for upcoming maintenance tasks"
              value={maintenancePreferences.enable_maintenance_alerts}
              onChange={(value) => handleMaintenancePreferenceChange('enable_maintenance_alerts', value)}
            />

            <ToggleSetting
              label="Email Notifications"
              description="Receive maintenance alerts via email"
              value={maintenancePreferences.enable_email_notifications}
              onChange={(value) => handleMaintenancePreferenceChange('enable_email_notifications', value)}
            />

            <ToggleSetting
              label="Push Notifications"
              description="Receive maintenance alerts via push notifications"
              value={maintenancePreferences.enable_push_notifications}
              onChange={(value) => handleMaintenancePreferenceChange('enable_push_notifications', value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceSettings;
