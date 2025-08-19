import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Calculator, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Trailer } from '../types';

interface TrailerMaintenanceInfoProps {
  formData: Partial<Trailer>;
  calculatedDates: {[key: string]: string};
  showCalculatedDates: boolean;
  onInputChange: (field: string, value: any) => void;
  onCalculateDates: () => void;
  onClearCalculatedDates: () => void;
  stringToDate: (dateString: string) => Date | undefined;
  dateToString: (date: Date | undefined) => string;
  getCalculatedDate: (field: string) => string;
  isDateCalculated: (field: string) => boolean;
}

const TrailerMaintenanceInfo: React.FC<TrailerMaintenanceInfoProps> = ({
  formData,
  calculatedDates,
  showCalculatedDates,
  onInputChange,
  onCalculateDates,
  onClearCalculatedDates,
  stringToDate,
  dateToString,
  getCalculatedDate,
  isDateCalculated
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Maintenance Information</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCalculateDates}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculate Dates
          </Button>
          {showCalculatedDates && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearCalculatedDates}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Calculated
            </Button>
          )}
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
        {/* Annual Inspection */}
        <div className="grid grid-cols-3 gap-3 items-center p-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Annual Inspection</div>
          <div>
                         <DatePicker
               value={stringToDate(formData.lastAnnualInspection || '')}
               onValueChange={(date) => onInputChange('lastAnnualInspection', dateToString(date))}
               placeholder="Last inspection"
             />
            {isDateCalculated('nextAnnualInspectionDue') && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Calculated: {getCalculatedDate('nextAnnualInspectionDue')}
              </div>
            )}
          </div>
          <div>
                         <DatePicker
               value={stringToDate(formData.nextAnnualInspectionDue || '')}
               onValueChange={(date) => onInputChange('nextAnnualInspectionDue', dateToString(date))}
               placeholder="Next due"
             />
          </div>
        </div>
        
        {/* Midtrip Inspection */}
        <div className="grid grid-cols-3 gap-3 items-center p-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Midtrip Inspection</div>
          <div>
                         <DatePicker
               value={stringToDate(formData.lastMidtripInspection || '')}
               onValueChange={(date) => onInputChange('lastMidtripInspection', dateToString(date))}
               placeholder="Last inspection"
             />
            {isDateCalculated('nextMidtripInspectionDue') && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Calculated: {getCalculatedDate('nextMidtripInspectionDue')}
              </div>
            )}
          </div>
          <div>
                         <DatePicker
               value={stringToDate(formData.nextMidtripInspectionDue || '')}
               onValueChange={(date) => onInputChange('nextMidtripInspectionDue', dateToString(date))}
               placeholder="Next due"
             />
          </div>
        </div>
        
        {/* Brake Inspection */}
        <div className="grid grid-cols-3 gap-3 items-center p-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Brake Inspection</div>
          <div>
                         <DatePicker
               value={stringToDate(formData.lastBrakeInspection || '')}
               onValueChange={(date) => onInputChange('lastBrakeInspection', dateToString(date))}
               placeholder="Last inspection"
             />
            {isDateCalculated('nextBrakeInspectionDue') && (
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Calculated: {getCalculatedDate('nextBrakeInspectionDue')}
              </div>
            )}
          </div>
          <div>
                         <DatePicker
               value={stringToDate(formData.nextBrakeInspectionDue || '')}
               onValueChange={(date) => onInputChange('nextBrakeInspectionDue', dateToString(date))}
               placeholder="Next due"
             />
          </div>
        </div>
        
        {/* Tire Service & Status */}
        <div className="grid grid-cols-3 gap-3 items-center p-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Tire Service</div>
          <div>
                         <DatePicker
               value={stringToDate(formData.lastTireService || '')}
               onValueChange={(date) => onInputChange('lastTireService', dateToString(date))}
               placeholder="Last service"
             />
          </div>
          <div>
            <Select
              value={formData.tireStatus || 'unknown'}
              onValueChange={(value) => onInputChange('tireStatus', value)}
            >
              <SelectTrigger className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Select tire status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Good
                  </div>
                </SelectItem>
                <SelectItem value="fair">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-orange-500" />
                    Fair
                  </div>
                </SelectItem>
                <SelectItem value="poor">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    Poor
                  </div>
                </SelectItem>
                <SelectItem value="unknown">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 text-gray-400 dark:text-gray-500">?</span>
                    Unknown
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrailerMaintenanceInfo;
