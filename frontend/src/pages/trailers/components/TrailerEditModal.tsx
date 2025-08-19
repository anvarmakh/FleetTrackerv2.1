import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { maintenanceAPI, geocodingAPI, api } from '@/lib/api';
import { Trailer } from '../types';
import { useTrailerForm } from '../hooks/useTrailerForm';
import { stringToDate, dateToString, getCalculatedDate, isDateCalculated } from '../utils/trailerHelpers';
import TrailerBasicInfo from './TrailerBasicInfo';
import TrailerLocationInfo from './TrailerLocationInfo';
import TrailerMaintenanceInfo from './TrailerMaintenanceInfo';
import TrailerDeleteDialog from './TrailerDeleteDialog';

interface TrailerEditModalProps {
  trailer: Trailer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (trailerId: string, data: Partial<Trailer>) => Promise<void>;
  onDelete: (trailerId: string) => Promise<void>;
}

const TrailerEditModal: React.FC<TrailerEditModalProps> = ({
  trailer,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedDates, setCalculatedDates] = useState<{[key: string]: string}>({});
  const [showCalculatedDates, setShowCalculatedDates] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();

  const {
    formData,
    locationData,
    handleInputChange,
    handleLocationDataChange,
    getUpdateData
  } = useTrailerForm(trailer);



  const handleSave = async () => {
    if (!trailer || !formData.unitNumber) {
      toast({
        title: "Validation Error",
        description: "Unit number is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Get basic update data
      const updateData = getUpdateData();
      
      // Check if we have maintenance date changes that need intelligent calculation
      const hasMaintenanceChanges = 
        formData.lastAnnualInspection !== trailer.lastAnnualInspection ||
        formData.lastMidtripInspection !== trailer.lastMidtripInspection ||
        formData.lastBrakeInspection !== trailer.lastBrakeInspection ||
        formData.nextAnnualInspectionDue !== trailer.nextAnnualInspectionDue ||
        formData.nextMidtripInspectionDue !== trailer.nextMidtripInspectionDue ||
        formData.nextBrakeInspectionDue !== trailer.nextBrakeInspectionDue;

      if (hasMaintenanceChanges) {
        // Use intelligent date calculation for maintenance dates
        const maintenanceUpdateData = {
          last_annual_inspection: formData.lastAnnualInspection || null,
          last_midtrip_inspection: formData.lastMidtripInspection || null,
          last_brake_inspection: formData.lastBrakeInspection || null,
          next_annual_inspection_due: formData.nextAnnualInspectionDue || null,
          next_midtrip_inspection_due: formData.nextMidtripInspectionDue || null,
          next_brake_inspection_due: formData.nextBrakeInspectionDue || null
        };

        // Apply intelligent date calculation using the updated maintenance-dates endpoint
        const intelligentResponse = await api.put(`/api/maintenance/trailers/${trailer.id}/maintenance-dates`, { updateData: maintenanceUpdateData });
        
        if (intelligentResponse.data.success) {
          const result = intelligentResponse.data.data;
          
          // Show calculation log if available
          if (result.calculationLog && result.calculationLog.length > 0) {
            const logMessage = result.calculationLog.join(', ');
            toast({
              title: "Intelligent Date Calculation Applied",
              description: logMessage,
            });
          }
        }
      } else {
        // Use regular save for non-maintenance changes
        console.log('🔍 Saving trailer data:', updateData);
        await onSave(trailer.id, updateData);
      }
      
      toast({
        title: "Success",
        description: "Trailer updated successfully",
      });
      
      onClose();
    } catch (error: unknown) {
      console.error('Error saving trailer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save trailer';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!trailer) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!trailer) return;
    
    try {
      setIsLoading(true);
      await onDelete(trailer.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error('Error deleting trailer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!locationData.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an address to geocode",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeocoding(true);
      const response = await geocodingAPI.geocodeAddress(locationData.address);
      
      if (response.data.success && response.data.data) {
        const { lat, lng } = response.data.data;
        handleLocationDataChange({
          ...locationData,
          latitude: lat,
          longitude: lng
        });
        toast({
          title: "Address Geocoded",
          description: "Coordinates have been updated from the address",
        });
      } else {
        toast({
          title: "Geocoding Failed",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error geocoding address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
      toast({
        title: "Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocode = async () => {
    if (locationData.latitude === null || locationData.longitude === null) {
      toast({
        title: "Validation Error",
        description: "Please enter coordinates to reverse geocode",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeocoding(true);
      const response = await geocodingAPI.reverseGeocode(locationData.latitude, locationData.longitude);
      
      if (response.data.success && response.data.data) {
        const { address } = response.data.data;
        handleLocationDataChange({
          ...locationData,
          address: address
        });
        toast({
          title: "Coordinates Geocoded",
          description: "Address has been updated from coordinates",
        });
      } else {
        toast({
          title: "Reverse Geocoding Failed",
          description: "Could not find address for these coordinates",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      console.error('Error reverse geocoding coordinates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reverse geocode coordinates';
      toast({
        title: "Reverse Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCalculateDates = async () => {
    if (!trailer) return;

    try {
      // Prepare update data with current form values
      const updateData = {
        last_annual_inspection: formData.lastAnnualInspection || null,
        last_midtrip_inspection: formData.lastMidtripInspection || null,
        last_brake_inspection: formData.lastBrakeInspection || null,
        next_annual_inspection_due: formData.nextAnnualInspectionDue || null,
        next_midtrip_inspection_due: formData.nextMidtripInspectionDue || null,
        next_brake_inspection_due: formData.nextBrakeInspectionDue || null
      };

      const response = await maintenanceAPI.calculateDates(trailer.id, updateData);

      if (response.data.success) {
        const result = response.data.data;
        const newDates = result.calculatedDates;
        
        setCalculatedDates(newDates);
        setShowCalculatedDates(true);
        
        // Update form data with calculated dates
        Object.keys(newDates).forEach(field => {
          if (newDates[field]) {
            // Convert snake_case to camelCase for form fields
            const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            handleInputChange(camelCaseField, newDates[field]);
          }
        });

        // Show calculation log if available
        if (result.calculationLog && result.calculationLog.length > 0) {
          const logMessage = result.calculationLog.join(', ');
          toast({
            title: "Intelligent Date Calculation",
            description: logMessage,
          });
        } else {
          toast({
            title: "Intelligent Date Calculation",
            description: "Maintenance dates have been calculated based on your preferences",
          });
        }

        // Show warning if no preferences found
        if (result.message && result.message.includes('No maintenance preferences')) {
          toast({
            title: "No Preferences Found",
            description: "Please set maintenance intervals in settings to enable automatic calculations",
            variant: "destructive",
          });
        }
      }
    } catch (error: unknown) {
      console.error('Error calculating dates:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate maintenance dates",
        variant: "destructive",
      });
    }
  };

  const clearCalculatedDates = () => {
    setCalculatedDates({});
    setShowCalculatedDates(false);
  };

  if (!trailer) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wrench className="h-6 w-6 text-primary" />
              Edit Trailer - {trailer?.unitNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information and Location */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">Basic Information & Location</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information Column */}
                <TrailerBasicInfo 
                  formData={formData}
                  onInputChange={handleInputChange}
                />

                {/* Location Information Column */}
                <TrailerLocationInfo
                  formData={formData}
                  locationData={locationData}
                  isGeocoding={isGeocoding}
                  onInputChange={handleInputChange}
                  onLocationDataChange={handleLocationDataChange}
                  onGeocodeAddress={handleGeocodeAddress}
                  onReverseGeocode={handleReverseGeocode}
                  originalGpsAddress={trailer.lastAddress || trailer.address}
                />
              </div>
            </div>

            {/* Maintenance Information */}
            <TrailerMaintenanceInfo
              formData={formData}
              calculatedDates={calculatedDates}
              showCalculatedDates={showCalculatedDates}
              onInputChange={handleInputChange}
              onCalculateDates={handleCalculateDates}
              onClearCalculatedDates={clearCalculatedDates}
              stringToDate={stringToDate}
              dateToString={dateToString}
              getCalculatedDate={(field) => getCalculatedDate(calculatedDates, field)}
              isDateCalculated={(field) => isDateCalculated(showCalculatedDates, calculatedDates, field)}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading}
              className="hover:bg-red-700 transition-colors"
            >
              Delete Trailer
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isLoading || !formData.unitNumber}
                className="bg-primary hover:bg-primary/90 transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <TrailerDeleteDialog
        trailer={trailer}
        isOpen={deleteConfirmOpen}
        isLoading={isLoading}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default TrailerEditModal;
