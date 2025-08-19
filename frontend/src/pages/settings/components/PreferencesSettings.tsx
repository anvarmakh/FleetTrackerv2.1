import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserPreferences, TIMEZONES, LANGUAGES, REFRESH_INTERVALS } from '@/types';
import ToggleSetting from './ui/ToggleSetting';

interface PreferencesSettingsProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
}

const PreferencesSettings: React.FC<PreferencesSettingsProps> = ({ 
  preferences, 
  onPreferencesChange 
}) => {
  const { toast } = useToast();
  const [savingPreferences, setSavingPreferences] = useState(false);

  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      // TODO: Implement API call to save preferences
      toast({ title: "Preferences saved", description: "Your preferences have been updated successfully." });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSavingPreferences(false);
    }
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    onPreferencesChange({ ...preferences, ...updates });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Preferences</CardTitle>
          <Button size="sm" onClick={handleSavePreferences} disabled={savingPreferences} className="gap-2">
            <Save className="w-4 h-4" />
            {savingPreferences ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">General Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={preferences.timezone} 
                onValueChange={(value) => updatePreferences({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select 
                value={preferences.language} 
                onValueChange={(value) => updatePreferences({ language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Display Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Display Settings</h3>
          <div className="space-y-4">
            <ToggleSetting
              label="Show Trailer Count"
              description="Display trailer count in GPS providers list"
              value={preferences.display.showTrailerCount}
              onChange={(value) => updatePreferences({ 
                display: { ...preferences.display, showTrailerCount: value } 
              })}
            />

            <ToggleSetting
              label="Show Last Sync"
              description="Display last synchronization time"
              value={preferences.display.showLastSync}
              onChange={(value) => updatePreferences({ 
                display: { ...preferences.display, showLastSync: value } 
              })}
            />

            <ToggleSetting
              label="Auto Refresh"
              description="Automatically refresh data at regular intervals"
              value={preferences.display.autoRefresh}
              onChange={(value) => updatePreferences({ 
                display: { ...preferences.display, autoRefresh: value } 
              })}
            />

            {preferences.display.autoRefresh && (
              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Select 
                  value={preferences.display.refreshInterval.toString()} 
                  onValueChange={(value) => updatePreferences({ 
                    display: { ...preferences.display, refreshInterval: parseInt(value) } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_INTERVALS.map(interval => (
                      <SelectItem key={interval.value} value={interval.value}>{interval.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Notification Settings</h3>
          <div className="space-y-4">
            <ToggleSetting
              label="Email Notifications"
              description="Receive notifications via email"
              value={preferences.notifications.email}
              onChange={(value) => updatePreferences({ 
                notifications: { ...preferences.notifications, email: value } 
              })}
            />

            <ToggleSetting
              label="Push Notifications"
              description="Receive push notifications in browser"
              value={preferences.notifications.push}
              onChange={(value) => updatePreferences({ 
                notifications: { ...preferences.notifications, push: value } 
              })}
            />

            <ToggleSetting
              label="SMS Notifications"
              description="Receive notifications via SMS"
              value={preferences.notifications.sms}
              onChange={(value) => updatePreferences({ 
                notifications: { ...preferences.notifications, sms: value } 
              })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreferencesSettings;
