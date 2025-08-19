// ============================================================================
// REUSABLE FORM MODAL COMPONENT
// ============================================================================

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  loading = false,
  disabled = false,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = "",
}: FormModalProps) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeOnOverlayClick ? handleClose : undefined}>
      <DialogContent className={`${sizeClasses[size]} ${className}`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {description}
                </DialogDescription>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          {children}
        </div>

        {(onSubmit || showCloseButton) && (
          <DialogFooter className="flex items-center justify-end gap-2">
            {showCloseButton && (
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                {cancelText}
              </Button>
            )}
            {onSubmit && (
              <Button
                onClick={onSubmit}
                disabled={loading || disabled}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitText}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Specialized modal components for common patterns
export function CreateModal(props: Omit<FormModalProps, 'submitText'> & { entityName?: string }) {
  return (
    <FormModal
      {...props}
      submitText={props.submitText || `Create ${props.entityName || 'Item'}`}
    />
  );
}

export function EditModal(props: Omit<FormModalProps, 'submitText'> & { entityName?: string }) {
  return (
    <FormModal
      {...props}
      submitText={props.submitText || `Update ${props.entityName || 'Item'}`}
    />
  );
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  entityName = "item",
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  entityName?: string;
  loading?: boolean;
}) {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      onSubmit={onConfirm}
      submitText={`Delete ${entityName}`}
      cancelText="Cancel"
      loading={loading}
      size="sm"
    >
      <div className="text-center py-4">
        <p className="text-sm text-gray-600">
          This action will permanently delete the {entityName} and cannot be undone.
        </p>
      </div>
    </FormModal>
  );
}
