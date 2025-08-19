import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trailer } from '../types';

interface TrailerDeleteDialogProps {
  trailer: Trailer | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const TrailerDeleteDialog: React.FC<TrailerDeleteDialogProps> = ({
  trailer,
  isOpen,
  isLoading,
  onClose,
  onConfirm
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Trailer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{trailer?.unitNumber}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  This action cannot be undone
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  This will permanently delete the trailer and all associated data including GPS history, maintenance records, and notes.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Trailer Details:
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div><strong>Unit Number:</strong> {trailer?.unitNumber}</div>
              <div><strong>Make/Model:</strong> {trailer?.make} {trailer?.model}</div>
              <div><strong>Year:</strong> {trailer?.year}</div>
              <div><strong>VIN:</strong> {trailer?.vin || 'Not provided'}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Trailer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrailerDeleteDialog;
