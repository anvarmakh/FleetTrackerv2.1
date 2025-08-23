import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ToggleSettingProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({ 
  label, 
  description, 
  value, 
  onChange 
}) => (
  <div className="flex items-center justify-between">
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch 
      checked={value}
      onCheckedChange={onChange}
    />
  </div>
);

export default ToggleSetting;
