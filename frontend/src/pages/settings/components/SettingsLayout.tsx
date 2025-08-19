import React from 'react';
import Navigation from '@/components/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Wifi, Wrench } from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (value: string) => void;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  children,
  activeTab,
  onTabChange
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="company" className="gap-2">
                <Building className="w-4 h-4" />
                Company
              </TabsTrigger>
              <TabsTrigger value="providers" className="gap-2">
                <Wifi className="w-4 h-4" />
                GPS Providers
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="gap-2">
                <Wrench className="w-4 h-4" />
                Maintenance
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
