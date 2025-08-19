import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, AlertTriangle, Trash2 } from 'lucide-react';

interface TripleConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  itemName?: string;
  itemType: 'tenant' | 'user';
  isLoading?: boolean;
}

const TripleConfirmationDialog: React.FC<TripleConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Cancel',
  itemName,
  itemType,
  isLoading = false
}) => {
  const [confirmationStep, setConfirmationStep] = useState(1);
  const [confirmations, setConfirmations] = useState({
    step1: false,
    step2: false,
    step3: false
  });

  const handleConfirmationChange = (step: keyof typeof confirmations) => {
    setConfirmations(prev => ({
      ...prev,
      [step]: !prev[step]
    }));
  };

  const handleConfirm = () => {
    // Check if current step is confirmed
    const currentStepKey = `step${confirmationStep}` as keyof typeof confirmations;
    if (!confirmations[currentStepKey]) {
      return; // Don't proceed if current step is not confirmed
    }
    
    if (confirmationStep < 3) {
      setConfirmationStep(confirmationStep + 1);
    } else {
      onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setConfirmationStep(1);
    setConfirmations({
      step1: false,
      step2: false,
      step3: false
    });
    onClose();
  };

  const getStepContent = () => {
    switch (confirmationStep) {
      case 1:
        return {
          title: `⚠️ First Confirmation Required`,
          description: `Are you absolutely sure you want to delete this ${itemType}? This action cannot be undone.`,
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
          checkboxLabel: 'I understand this action is irreversible'
        };
      case 2:
        return {
          title: `🛡️ Second Confirmation Required`,
          description: `This will permanently delete the ${itemType} "${itemName}" and all associated data. This action is irreversible.`,
          icon: <Shield className="w-8 h-8 text-orange-500" />,
          checkboxLabel: 'I have backed up any important data'
        };
      case 3:
        return {
          title: `🚨 Final Confirmation Required`,
          description: `This is your final warning. Deleting this ${itemType} will remove all data permanently. Are you certain you want to proceed?`,
          icon: <Trash2 className="w-8 h-8 text-red-500" />,
          checkboxLabel: 'I confirm I want to proceed with deletion'
        };
      default:
        return {
          title: '',
          description: '',
          icon: null,
          checkboxLabel: ''
        };
    }
  };

  const stepContent = getStepContent();
  const currentStepKey = `step${confirmationStep}` as keyof typeof confirmations;
  const isCurrentStepConfirmed = confirmations[currentStepKey];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {stepContent.icon}
            {stepContent.title}
          </DialogTitle>
          <DialogDescription className="text-left">
            {stepContent.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex justify-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  step < confirmationStep 
                    ? 'bg-green-500' // Completed steps
                    : step === confirmationStep 
                    ? 'bg-blue-500' // Current step
                    : 'bg-gray-300' // Future steps
                }`}
                title={step < confirmationStep ? 'Completed' : step === confirmationStep ? 'Current' : 'Pending'}
              />
            ))}
          </div>
          
          {/* Step indicator text */}
          <div className="text-center text-sm text-gray-600">
            Step {confirmationStep} of 3
          </div>

          {/* Current step confirmation checkbox */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrentStepConfirmed}
                onChange={() => handleConfirmationChange(currentStepKey)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">{stepContent.checkboxLabel}</span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isCurrentStepConfirmed || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {confirmationStep < 3 ? 'Next Step' : confirmText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TripleConfirmationDialog;
