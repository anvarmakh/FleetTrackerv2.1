import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <Select 
      value={value ? "true" : "false"} 
      onValueChange={(val) => onChange(val === "true")}
    >
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">On</SelectItem>
        <SelectItem value="false">Off</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default ToggleSetting;
