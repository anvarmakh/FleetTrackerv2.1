// ============================================================================
// FORM HANDLING HOOKS
// ============================================================================

import { useState, useCallback, FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
}

export function useForm<T extends Record<string, any>>(
  initialData: T,
  validationSchema?: (data: T) => Partial<Record<keyof T, string>>
) {
  const [state, setState] = useState<FormState<T>>({
    data: initialData,
    errors: {},
    touched: {},
    isValid: true,
  });

  const setField = useCallback((field: keyof T, value: any) => {
    setState(prev => {
      const newData = { ...prev.data, [field]: value };
      const newErrors = validationSchema ? validationSchema(newData) : {};
      const newTouched = { ...prev.touched, [field]: true };
      
      return {
        data: newData,
        errors: newErrors,
        touched: newTouched,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, [validationSchema]);

  const setFields = useCallback((fields: Partial<T>) => {
    setState(prev => {
      const newData = { ...prev.data, ...fields };
      const newErrors = validationSchema ? validationSchema(newData) : {};
      
      return {
        data: newData,
        errors: newErrors,
        touched: prev.touched,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, [validationSchema]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      errors: {},
      touched: {},
      isValid: true,
    });
  }, [initialData]);

  const validate = useCallback(() => {
    if (!validationSchema) return true;
    
    const errors = validationSchema(state.data);
    setState(prev => ({
      ...prev,
      errors,
      isValid: Object.keys(errors).length === 0,
    }));
    
    return Object.keys(errors).length === 0;
  }, [state.data, validationSchema]);

  const getFieldError = useCallback((field: keyof T) => {
    return state.errors[field] || '';
  }, [state.errors]);

  const isFieldTouched = useCallback((field: keyof T) => {
    return state.touched[field] || false;
  }, [state.touched]);

  const hasFieldError = useCallback((field: keyof T) => {
    return !!state.errors[field];
  }, [state.errors]);

  return {
    data: state.data,
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    setField,
    setFields,
    reset,
    validate,
    getFieldError,
    isFieldTouched,
    hasFieldError,
  };
}

export function useFormSubmit<T extends Record<string, any>>(
  form: ReturnType<typeof useForm<T>>,
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    resetOnSuccess?: boolean;
  }
) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    if (!form.isValid) {
      form.validate();
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await onSubmit(form.data);
      
      if (result.success) {
        toast({
          title: "Success",
          description: options?.successMessage || "Form submitted successfully",
        });
        
        if (options?.resetOnSuccess !== false) {
          form.reset();
        }
      } else {
        toast({
          title: "Error",
          description: options?.errorMessage || result.error || "Form submission failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: options?.errorMessage || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSubmit, toast, options]);

  return {
    handleSubmit,
    isSubmitting,
  };
}

// Specialized form hooks for common patterns
export function useModalForm<T extends Record<string, any>>(
  initialData: T,
  validationSchema?: (data: T) => Partial<Record<keyof T, string>>
) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm(initialData, validationSchema);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    form.reset();
  }, [form]);

  const openWithData = useCallback((data: Partial<T>) => {
    form.setFields(data);
    setIsOpen(true);
  }, [form]);

  return {
    isOpen,
    open,
    close,
    openWithData,
    ...form,
  };
}

export function useTableForm<T extends Record<string, any>>(
  initialData: T,
  validationSchema?: (data: T) => Partial<Record<keyof T, string>>
) {
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const form = useForm(initialData, validationSchema);

  const startEdit = useCallback((item: T) => {
    setEditingItem(item);
    form.setFields(item);
    setIsEditing(true);
  }, [form]);

  const cancelEdit = useCallback(() => {
    setEditingItem(null);
    setIsEditing(false);
    form.reset();
  }, [form]);

  const finishEdit = useCallback(() => {
    setEditingItem(null);
    setIsEditing(false);
    form.reset();
  }, [form]);

  return {
    editingItem,
    isEditing,
    startEdit,
    cancelEdit,
    finishEdit,
    ...form,
  };
}

// Validation helpers
export const validators = {
  required: (value: any) => value ? '' : 'This field is required',
  email: (value: string) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? '' : 'Invalid email address';
  },
  minLength: (min: number) => (value: string) => {
    if (!value) return '';
    return value.length >= min ? '' : `Must be at least ${min} characters`;
  },
  maxLength: (max: number) => (value: string) => {
    if (!value) return '';
    return value.length <= max ? '' : `Must be no more than ${max} characters`;
  },
  phone: (value: string) => {
    if (!value) return '';
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-()]/g, '')) ? '' : 'Invalid phone number';
  },
  vin: (value: string) => {
    if (!value) return '';
    return value.length === 17 ? '' : 'VIN must be 17 characters';
  },
  year: (value: number) => {
    if (!value) return '';
    const currentYear = new Date().getFullYear();
    return value >= 1900 && value <= currentYear + 1 ? '' : 'Invalid year';
  },
};
