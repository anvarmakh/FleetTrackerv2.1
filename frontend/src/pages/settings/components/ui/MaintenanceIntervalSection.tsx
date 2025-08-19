import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MaintenancePreferences } from '@/types';

interface MaintenanceIntervalSectionProps {
  title: string;
  intervalField: keyof MaintenancePreferences;
  thresholdField: keyof MaintenancePreferences;
  preferences: MaintenancePreferences;
  onChange: (field: keyof MaintenancePreferences, value: number) => void;
}

const MaintenanceIntervalSection: React.FC<MaintenanceIntervalSectionProps> = ({ 
  title, 
  intervalField, 
  thresholdField, 
  preferences, 
  onChange 
}) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${intervalField}-interval`}>Interval (days)</Label>
        <Input
          id={`${intervalField}-interval`}
          type="number"
          value={preferences[intervalField] as number}
          onChange={(e) => onChange(intervalField, parseInt(e.target.value))}
          min="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${thresholdField}-threshold`}>Alert Threshold (days)</Label>
        <Input
          id={`${thresholdField}-threshold`}
          type="number"
          value={preferences[thresholdField] as number}
          onChange={(e) => onChange(thresholdField, parseInt(e.target.value))}
          min="0"
        />
      </div>
    </div>
  </div>
);

export default MaintenanceIntervalSection;
