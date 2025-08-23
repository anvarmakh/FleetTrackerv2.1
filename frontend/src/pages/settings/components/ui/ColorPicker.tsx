import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PRESET_COLORS } from '@/types';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex items-center gap-3">
      <div 
        className="w-8 h-8 rounded border border-gray-300"
        style={{ backgroundColor: value }}
      />
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 h-10 p-1"
      />
      <div className="flex gap-1">
        {PRESET_COLORS.map((color) => (
          <Button
            key={color}
            type="button"
            variant="outline"
            size="sm"
            className="w-6 h-6 p-0 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  </div>
);

export default ColorPicker;
