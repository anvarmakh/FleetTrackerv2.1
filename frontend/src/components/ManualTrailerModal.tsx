import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Building2, X } from 'lucide-react';
import { trailerCustomCompaniesAPI } from '@/lib/api';

interface ManualTrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trailerData: Omit<TrailerData, 'id'>) => Promise<void>;
  companies?: Array<{ id: string; name: string }>;
}

interface TrailerFormData {
  unit_number: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  status: string;
  company_id: string;
}

interface CustomCompany {
  id: string;
  name: string;
  isCustom: true;
}

export default function ManualTrailerModal({ isOpen, onClose, onSave, companies = [] }: ManualTrailerModalProps) {
  // console.log('ManualTrailerModal received companies:', companies);
  const [formData, setFormData] = useState<TrailerFormData>({
    unit_number: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    status: 'available',
    company_id: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customCompanies, setCustomCompanies] = useState<CustomCompany[]>([]);
  const [showCustomCompanyForm, setShowCustomCompanyForm] = useState(false);
  const [newCustomCompany, setNewCustomCompany] = useState({ name: '' });
  const [isAddingCustomCompany, setIsAddingCustomCompany] = useState(false);

  // Load custom companies from API on component mount
  useEffect(() => {
    if (isOpen) {
      loadCustomCompanies();
    }
  }, [isOpen]);

  // Filter out custom companies that already exist in regular companies
  const filteredCustomCompanies = customCompanies.filter(customCompany => 
    !companies.some(regularCompany => regularCompany.id === customCompany.id)
  );

  const loadCustomCompanies = async () => {
    try {
      const response = await trailerCustomCompaniesAPI.getCustomCompanies();
      setCustomCompanies(response.data.data || []);
    } catch (error) {
      console.error('Error loading custom companies:', error);
    }
  };

  const handleInputChange = (field: keyof TrailerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleAddCustomCompany = async () => {
    if (!newCustomCompany.name.trim()) {
      return;
    }

    setIsAddingCustomCompany(true);
    try {
      const response = await trailerCustomCompaniesAPI.createCustomCompany({
        name: newCustomCompany.name.trim()
      });
      
      const newCompany = response.data.data;
      setCustomCompanies(prev => [...prev, newCompany]);
      setFormData(prev => ({ ...prev, company_id: newCompany.id }));
      setNewCustomCompany({ name: '' });
      setShowCustomCompanyForm(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create custom company';
      setError(errorMessage);
    } finally {
      setIsAddingCustomCompany(false);
    }
  };

  const handleDeleteCustomCompany = async (customCompanyId: string) => {
    // Find the company name for better error messages
    const companyToDelete = customCompanies.find(company => company.id === customCompanyId);
    const companyName = companyToDelete?.name || 'this company';
    
    // Show confirmation dialog
    if (!confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // console.log('🗑️ Deleting custom company:', customCompanyId);
      
      const response = await trailerCustomCompaniesAPI.deleteCustomCompany(customCompanyId);
      
      if (response.data.success) {
        // Remove the company from the local state
        setCustomCompanies(prev => prev.filter(company => company.id !== customCompanyId));
        
        // If the deleted company was selected, clear the selection
        if (formData.company_id === customCompanyId) {
          setFormData(prev => ({ ...prev, company_id: '' }));
        }
        
        // console.log('✅ Custom company deleted successfully');
        setError(null); // Clear any previous errors
      } else {
        throw new Error(response.data.error || 'Failed to delete custom company');
      }
    } catch (error: unknown) {
      console.error('❌ Error deleting custom company:', error);
      
      // Extract error message from different possible sources
      let errorMessage = 'Failed to delete custom company';
      if (error && typeof error === 'object') {
        if ('response' in error && error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if ('message' in error && error.message) {
          errorMessage = error.message;
        }
      }
      
      // Check if the error is about associated trailers
      if (errorMessage.includes('trailer(s) are associated')) {
        setError(`Cannot delete "${companyName}": ${errorMessage}. Please delete or reassign the trailers first.`);
      } else {
        setError(`Failed to delete "${companyName}": ${errorMessage}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.unit_number.trim()) {
      setError('Unit number is required');
      return;
    }

    if (!formData.company_id) {
      setError('Owner company is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert year to number if provided and convert snake_case to camelCase
      const trailerData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        companyId: formData.company_id // Convert snake_case to camelCase
      };
      delete trailerData.company_id; // Remove the snake_case version

      await onSave(trailerData);
      
      // Reset form and close modal
      setFormData({
        unit_number: '',
        make: '',
        model: '',
        year: '',
        vin: '',
        status: 'available',
        company_id: ''
      });
      onClose();
    } catch (err: unknown) {
      setError(err.response?.data?.error || 'Failed to create trailer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        unit_number: '',
        make: '',
        model: '',
        year: '',
        vin: '',
        status: 'available',
        company_id: ''
      });
      setError(null);
      setShowCustomCompanyForm(false);
      setNewCustomCompany({ name: '' });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Manual Trailer
          </DialogTitle>
          <DialogDescription>
            Add a new trailer manually. You can select an existing company or create a custom one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_number">Unit Number *</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => handleInputChange('unit_number', e.target.value)}
                placeholder="Enter unit number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="dispatched">Moving</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Owner Company *</Label>
            
            <Select
              value={formData.company_id}
              onValueChange={(value) => handleInputChange('company_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner company" />
              </SelectTrigger>
              <SelectContent>
                {companies.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Your Companies
                    </div>
                    {companies.map((company) => (
                      <SelectItem key={`regular-${company.id}`} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </div>
                )}
                
                {filteredCustomCompanies.length > 0 && (
                  <div>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Custom Companies
                    </div>
                    {filteredCustomCompanies.map((company) => (
                      <div key={`custom-${company.id}`} className="relative group">
                        <SelectItem value={company.id}>
                          <div className="flex items-center justify-between w-full pr-8">
                            <span>{company.name}</span>
                          </div>
                        </SelectItem>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // console.log('🗑️ Delete button clicked for company:', company.id);
                            handleDeleteCustomCompany(company.id);
                          }}
                          title="Delete custom company"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {companies.length === 0 && filteredCustomCompanies.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No companies available. Create a custom company below.
                  </div>
                )}

                {/* Add Custom Company Button */}
                <div className="border-t pt-2 mt-2">
                  {showCustomCompanyForm ? (
                    <div className="px-2 py-2 space-y-2">
                      <Input
                        value={newCustomCompany.name}
                        onChange={(e) => setNewCustomCompany({ name: e.target.value })}
                        placeholder="Enter company name"
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomCompany();
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomCompany}
                          disabled={!newCustomCompany.name.trim() || isAddingCustomCompany}
                          className="flex-1 text-xs"
                        >
                          {isAddingCustomCompany ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Add'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomCompanyForm(false);
                            setNewCustomCompany({ name: '' });
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomCompanyForm(true)}
                      className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Building2 className="h-3 w-3 mr-2" />
                      Add Custom Company
                    </Button>
                  )}
                </div>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This trailer will be assigned to the selected company
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={formData.make}
                onChange={(e) => handleInputChange('make', e.target.value)}
                placeholder="e.g., Utility, Great Dane"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="e.g., 3000R, 53' Van"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => handleInputChange('year', e.target.value)}
                placeholder="e.g., 2020"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => handleInputChange('vin', e.target.value)}
                placeholder="17-character VIN"
                maxLength={17}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Trailer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 