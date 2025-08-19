import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { companyAPI } from '@/lib/api';
import { Company, COMPANY_TYPES } from '@/types';
import ColorPicker from './ui/ColorPicker';

interface CompanySettingsProps {
  companies: Company[];
  onRefresh: () => void;
}

const CompanySettings: React.FC<CompanySettingsProps> = ({ companies, onRefresh }) => {
  const { toast } = useToast();
  
  // Modal States
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [editCompanyOpen, setEditCompanyOpen] = useState(false);

  // Form States
  const [newCompany, setNewCompany] = useState({
    name: '', type: '', mc_number: '', color: '#3b82f6'
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Loading States
  const [addingCompany, setAddingCompany] = useState(false);
  const [updatingCompany, setUpdatingCompany] = useState(false);

  const handleAddCompany = async () => {
    if (!newCompany.name || !newCompany.type) {
      toast({ title: "Validation Error", description: "Company name and type are required", variant: "destructive" });
      return;
    }

    try {
      setAddingCompany(true);
      const response = await companyAPI.createCompany(newCompany);
      
      if (response.data.success) {
        toast({ title: "Company added", description: "Company has been added successfully." });
        setAddCompanyOpen(false);
        setNewCompany({ name: '', type: '', mc_number: '', color: '#3b82f6' });
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to add company');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add company';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setAddingCompany(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany || !editingCompany.name) {
      toast({ title: "Validation Error", description: "Company name is required", variant: "destructive" });
      return;
    }

    try {
      setUpdatingCompany(true);
      const response = await companyAPI.updateCompany(editingCompany.id, editingCompany);
      
      if (response.data.success) {
        toast({ title: "Company updated", description: "Company has been updated successfully." });
        setEditCompanyOpen(false);
        setEditingCompany(null);
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to update company');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update company';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingCompany(false);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;

    try {
      const response = await companyAPI.deleteCompany(companyId);
      if (response.data.success) {
        toast({ title: "Company deleted", description: "Company has been deleted successfully." });
        onRefresh();
      } else {
        throw new Error(response.data.error || 'Failed to delete company');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete company';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Company Management</CardTitle>
            <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Company</DialogTitle>
                  <DialogDescription>Create a new company for your organization</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company-type">Company Type</Label>
                    <Select 
                      value={newCompany.type} 
                      onValueChange={(value) => setNewCompany({ ...newCompany, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mc-number">MC Number (Optional)</Label>
                    <Input
                      id="mc-number"
                      value={newCompany.mc_number}
                      onChange={(e) => setNewCompany({ ...newCompany, mc_number: e.target.value })}
                      placeholder="Enter MC number"
                    />
                  </div>

                  <ColorPicker
                    value={newCompany.color}
                    onChange={(color) => setNewCompany({ ...newCompany, color })}
                    label="Company Color"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddCompanyOpen(false)} disabled={addingCompany}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCompany} disabled={addingCompany || !newCompany.name || !newCompany.type}>
                    {addingCompany ? 'Adding...' : 'Add Company'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-center">MC Number</TableHead>
                <TableHead className="text-center">Color</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{company.type || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{company.mc_number || '-'}</TableCell>
                  <TableCell className="text-center">
                    <div 
                      className="w-6 h-6 rounded border border-gray-300 mx-auto"
                      style={{ backgroundColor: company.color || '#3b82f6' }}
                      title={company.color || '#3b82f6'}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCompany(company)}
                        className="h-8 w-8 p-0"
                        title="Edit Company"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompany(company.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Company Modal */}
      <Dialog open={editCompanyOpen} onOpenChange={setEditCompanyOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update company information</DialogDescription>
          </DialogHeader>
          {editingCompany && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-company-name">Company Name</Label>
                <Input
                  id="edit-company-name"
                  value={editingCompany.name}
                  onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-company-type">Company Type</Label>
                <Select 
                  value={editingCompany.type || 'no-type'} 
                  onValueChange={(value) => setEditingCompany({ ...editingCompany, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-mc-number">MC Number (Optional)</Label>
                <Input
                  id="edit-mc-number"
                  value={editingCompany.mc_number || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, mc_number: e.target.value })}
                  placeholder="Enter MC number"
                />
              </div>

              <ColorPicker
                value={editingCompany.color || '#3b82f6'}
                onChange={(color) => setEditingCompany({ ...editingCompany, color })}
                label="Company Color"
              />
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditCompanyOpen(false)}
              disabled={updatingCompany}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateCompany}
              disabled={updatingCompany || !editingCompany?.name}
            >
              {updatingCompany ? 'Updating...' : 'Update Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompanySettings;
