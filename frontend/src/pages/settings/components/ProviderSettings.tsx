import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit, Trash2, Wifi, RefreshCw } from 'lucide-react';
import { formatDateOnlyInTimezone } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { providerAPI } from '@/lib/api';
import { Company, Provider, EditingProvider, PROVIDER_TYPES } from '@/types';
import { buildCredentials, validateProviderCredentials, getProviderStatusBadge } from '../utils/settingsUtils';
import ProviderCredentialsForm from './ui/ProviderCredentialsForm';

interface ProviderSettingsProps {
  providers: Provider[];
  companies: Company[];
  onRefresh: () => void;
}

const ProviderSettings: React.FC<ProviderSettingsProps> = ({ providers, companies, onRefresh }) => {
  const { toast } = useToast();
  
  // console.log('🔍 ProviderSettings received providers:', providers);
  // console.log('🔍 ProviderSettings received companies:', companies);
  
  // Modal States
  const [addProviderOpen, setAddProviderOpen] = useState(false);
  const [editProviderOpen, setEditProviderOpen] = useState(false);
  const [deleteProviderOpen, setDeleteProviderOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<Provider | null>(null);
  const [deleteRelatedTrailers, setDeleteRelatedTrailers] = useState(false);

  // Form States
  const [newProvider, setNewProvider] = useState({
    name: '', type: '', company_id: '', description: '',
    apiKey: '', username: '', password: '', nspireId: '', apiToken: '', apiUrl: ''
  });
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);

  // Loading States
  const [addingProvider, setAddingProvider] = useState(false);
  const [updatingProvider, setUpdatingProvider] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState(false);
  const [syncingProviders, setSyncingProviders] = useState<Set<string>>(new Set());

  const handleProviderChange = (field: string, value: string) => {
    setNewProvider(prev => ({ ...prev, [field]: value }));
  };

  const handleEditingProviderChange = (field: string, value: string) => {
    setEditingProvider(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleAddProvider = async () => {
    if (!newProvider.name || !newProvider.type || !newProvider.company_id) {
      toast({ title: "Validation Error", description: "Provider name, type, and owner company are required", variant: "destructive" });
      return;
    }

    const requiredFields = validateProviderCredentials(newProvider.type, newProvider);
    if (requiredFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Required fields for ${newProvider.type}: ${requiredFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingProvider(true);
      const credentials = buildCredentials(newProvider.type, newProvider);
      
      // console.log('Creating provider with data:', {
      //   companyId: newProvider.company_id,
      //   name: newProvider.name,
      //   type: newProvider.type,
      //   description: newProvider.description,
      //   credentials
      // });
      
      const response = await providerAPI.createProvider(newProvider.company_id, {
        name: newProvider.name,
        type: newProvider.type,
        description: newProvider.description,
        credentials
      });
      
      if (response.data.success) {
        toast({ title: "Provider added", description: "GPS provider has been added successfully." });
        setAddProviderOpen(false);
        setNewProvider({ name: '', type: '', company_id: '', description: '', apiKey: '', username: '', password: '', nspireId: '', apiToken: '', apiUrl: '' });
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to add provider');
      }
    } catch (error: unknown) {
      console.error('Provider creation error:', error);
      
      // Handle axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Axios error response:', axiosError.response?.data);
        const errorMessage = axiosError.response?.data?.error || axiosError.message || 'Failed to add provider';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to add provider';
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setAddingProvider(false);
    }
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider || !editingProvider.name || !editingProvider.type) {
      toast({ title: "Validation Error", description: "Provider name and type are required", variant: "destructive" });
      return;
    }

    try {
      setUpdatingProvider(true);
      const credentials = buildCredentials(editingProvider.type, editingProvider);
      const response = await providerAPI.updateProvider(editingProvider.id, {
        name: editingProvider.name,
        type: editingProvider.type,
        description: editingProvider.description,
        credentials
      });
      
      if (response.data.success) {
        toast({ title: "Provider updated", description: "GPS provider has been updated successfully." });
        setEditProviderOpen(false);
        setEditingProvider(null);
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to update provider');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update provider';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingProvider(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    try {
      const response = await providerAPI.testProvider(providerId);
      if (response.data.success) {
        toast({ title: "Connection successful", description: "Provider connection test passed" });
      } else {
        throw new Error(response.data.error || 'Connection test failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      toast({
        title: "Connection failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSyncProvider = async (providerId: string) => {
    // Prevent double-clicks
    if (syncingProviders.has(providerId)) {
      return;
    }

    try {
      // Add provider to syncing set
      setSyncingProviders(prev => new Set(prev).add(providerId));
      
      const response = await providerAPI.syncProvider(providerId);
      if (response.data.success) {
        const msg = response.data.message;
        if (response.data.createdCount === 0 && response.data.updatedCount === 0) {
          toast({ 
            title: "Sync completed", 
            description: `${msg} No new trailers found. Check if your GPS provider has active assets or review backend logs for filtering details.`
          });
        } else {
          toast({ 
            title: "Sync successful", 
            description: msg 
          });
        }
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Sync failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync provider';
      toast({
        title: "Sync failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      // Remove provider from syncing set
      setSyncingProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  const handleDeleteProvider = (provider: Provider) => {
    setProviderToDelete(provider);
    setDeleteRelatedTrailers(false);
    setDeleteProviderOpen(true);
  };

  const confirmDeleteProvider = async () => {
    if (!providerToDelete) return;

    try {
      setDeletingProvider(true);
      const response = await providerAPI.deleteProvider(providerToDelete.id, deleteRelatedTrailers);
      if (response.data.success) {
        const message = deleteRelatedTrailers 
          ? `GPS provider and ${response.data.deletedTrailersCount || 0} related trailers have been deleted successfully.`
          : "GPS provider has been deleted successfully. Related trailers remain but may lose GPS data.";
        
        toast({ 
          title: "Provider deleted", 
          description: message 
        });
        setDeleteProviderOpen(false);
        setProviderToDelete(null);
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to delete provider');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete provider';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingProvider(false);
    }
  };

  const handleEditProvider = (provider: Provider) => {
    setEditingProvider({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      description: provider.description || '',
      company_id: provider.company_id || '',
      apiKey: '', username: '', password: '', nspireId: '', apiToken: '', apiUrl: ''
    });
    setEditProviderOpen(true);
  };

  const handleRefreshProviders = async () => {
    try {
      const response = await providerAPI.getProviders();
      const providersList = response.data.data || response.data || [];
      onRefresh();
      toast({
        title: "Providers refreshed",
        description: `Found ${providersList.length} provider(s)`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh providers';
      toast({
        title: "Refresh failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>GPS Providers</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshProviders}
              >
                Refresh
              </Button>
              <Dialog open={addProviderOpen} onOpenChange={setAddProviderOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add GPS Provider</DialogTitle>
                    <DialogDescription>Configure a new GPS tracking provider for your fleet</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider-name">Provider Name</Label>
                      <Input
                        id="provider-name"
                        value={newProvider.name}
                        onChange={(e) => handleProviderChange('name', e.target.value)}
                        placeholder="e.g., Fleet Complete, Geotab"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="provider-type">Provider Type</Label>
                      <Select 
                        value={newProvider.type} 
                        onValueChange={(value) => handleProviderChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDER_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider-company">Owner Company</Label>
                      <Select 
                        value={newProvider.company_id} 
                        onValueChange={(value) => handleProviderChange('company_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company to assign trailers to" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies && companies.length > 0 ? companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          )) : (
                            <SelectItem value="no-companies" disabled>No companies available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider-description">Description (Optional)</Label>
                      <Textarea
                        id="provider-description"
                        value={newProvider.description}
                        onChange={(e) => handleProviderChange('description', e.target.value)}
                        placeholder="Enter provider description"
                        rows={2}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Provider Credentials</h4>
                      <ProviderCredentialsForm
                        providerType={newProvider.type}
                        provider={newProvider}
                        onChange={handleProviderChange}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddProviderOpen(false)} disabled={addingProvider}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProvider} disabled={addingProvider || !newProvider.name || !newProvider.type || !newProvider.company_id}>
                      {addingProvider ? 'Adding...' : 'Add Provider'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Company</TableHead>
                <TableHead className="text-center">Unit Count</TableHead>
                <TableHead className="text-center">Last Sync</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => {
                const statusConfig = getProviderStatusBadge(provider.status);
                return (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{provider.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={statusConfig.variant} className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{provider.company_name || '-'}</TableCell>
                    <TableCell className="text-center">{provider.trailer_count || 0}</TableCell>
                    <TableCell className="text-center">
                      {provider.last_sync 
                        ? (() => {
                            const userTimezone = localStorage.getItem('userTimezone') || 'America/Chicago';
                            return formatDateOnlyInTimezone(provider.last_sync, userTimezone, true); // Show timezone indicator for date display
                          })()
                        : 'Never'
                      }
                    </TableCell>
                                         <TableCell className="text-center">
                       <div className="flex items-center justify-center gap-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleTestConnection(provider.id)}
                           className="h-8 w-8 p-0"
                           title="Test Connection"
                         >
                           <Wifi className="w-3 h-3" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleSyncProvider(provider.id)}
                           disabled={syncingProviders.has(provider.id)}
                           className="h-8 w-8 p-0"
                           title="Sync Trailers"
                         >
                           <RefreshCw className={`w-3 h-3 ${syncingProviders.has(provider.id) ? 'animate-spin' : ''}`} />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEditProvider(provider)}
                           className="h-8 w-8 p-0"
                           title="Edit Provider"
                         >
                           <Edit className="w-3 h-3" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDeleteProvider(provider)}
                           className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                           title="Delete Provider"
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Provider Modal */}
      <Dialog open={editProviderOpen} onOpenChange={setEditProviderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit GPS Provider</DialogTitle>
            <DialogDescription>Update provider configuration</DialogDescription>
          </DialogHeader>
          {editingProvider && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-provider-name">Provider Name</Label>
                <Input
                  id="edit-provider-name"
                  value={editingProvider.name}
                  onChange={(e) => handleEditingProviderChange('name', e.target.value)}
                  placeholder="Enter provider name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-provider-type">Provider Type</Label>
                <Select 
                  value={editingProvider.type} 
                  onValueChange={(value) => handleEditingProviderChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider-description">Description</Label>
                <Textarea
                  id="edit-provider-description"
                  value={editingProvider.description || ''}
                  onChange={(e) => handleEditingProviderChange('description', e.target.value)}
                  placeholder="Enter provider description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider-company">Owner Company</Label>
                <Select 
                  value={editingProvider.company_id || 'no-company'} 
                  onValueChange={(value) => handleEditingProviderChange('company_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.length > 0 ? companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-company" disabled>No companies available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Provider Credentials</h4>
                <ProviderCredentialsForm
                  providerType={editingProvider.type}
                  provider={editingProvider}
                  onChange={handleEditingProviderChange}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditProviderOpen(false)}
              disabled={updatingProvider}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateProvider}
              disabled={updatingProvider || !editingProvider?.name || !editingProvider?.type}
            >
              {updatingProvider ? 'Updating...' : 'Update Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Provider Confirmation Dialog */}
      <Dialog open={deleteProviderOpen} onOpenChange={setDeleteProviderOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete GPS Provider</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{providerToDelete?.name}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    This action cannot be undone
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    This provider may have related trailers. Choose what you want to delete:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="delete-provider-only"
                  name="delete-option"
                  checked={!deleteRelatedTrailers}
                  onChange={() => setDeleteRelatedTrailers(false)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="delete-provider-only" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Delete provider only
                </label>
              </div>
              <p className="ml-7 text-sm text-gray-600 dark:text-gray-400">
                Related trailers will remain but may lose GPS data and functionality.
              </p>

              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="delete-provider-and-trailers"
                  name="delete-option"
                  checked={deleteRelatedTrailers}
                  onChange={() => setDeleteRelatedTrailers(true)}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="delete-provider-and-trailers" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Delete provider and all related trailers
                </label>
              </div>
              <p className="ml-7 text-sm text-gray-600 dark:text-gray-400">
                This will permanently delete the provider and all trailers associated with it.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteProviderOpen(false)}
              disabled={deletingProvider}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteProvider}
              disabled={deletingProvider}
            >
              {deletingProvider ? 'Deleting...' : 'Delete Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProviderSettings;
