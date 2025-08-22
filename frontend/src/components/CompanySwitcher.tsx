import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { companyAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  id: string;
  name: string;
  type?: string;
  color?: string;
  isActive?: boolean;
}

interface CompanySwitcherProps {
  userPermissions?: string[];
  className?: string;
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({ userPermissions = [], className = '' }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // Check if user has cross-company access permission
  const hasCrossCompanyAccess = userPermissions.includes('companies_switch');

  useEffect(() => {
    if (hasCrossCompanyAccess) {
      loadCompanies();
    }
  }, [hasCrossCompanyAccess]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      
      // Load all companies user has access to
      const companiesResponse = await companyAPI.getCompanies();
      const companiesData = companiesResponse.data as any;
      
      // Handle different response structures
      let allCompanies = [];
      if (companiesData?.success && companiesData?.companies) {
        allCompanies = companiesData.companies;
      } else if (Array.isArray(companiesData)) {
        allCompanies = companiesData;
      } else if (companiesData?.data && Array.isArray(companiesData.data)) {
        allCompanies = companiesData.data;
      }
      
      // Load active company
      const activeResponse = await companyAPI.getActive();
      const activeData = activeResponse.data as any;
      let currentActive = null;
      
             if (activeData?.success && activeData?.data) {
         currentActive = activeData.data;
       } else if (activeData?.data) {
         currentActive = activeData.data;
       }
       
       setCompanies(allCompanies);
      setActiveCompany(currentActive || allCompanies[0] || null);
      
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySwitch = async (company: Company) => {
    if (company.id === activeCompany?.id) return;
    
    try {
      setSwitching(true);
      
      await companyAPI.setActive(company.id);
      
      setActiveCompany(company);
      toast({
        title: "Company Switched",
        description: `Now viewing ${company.name}`,
      });
      
      // Reload the page to refresh data with new company context
      window.location.reload();
      
    } catch (error) {
      console.error('Error switching company:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch company';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
    }
  };

  // Don't render if user doesn't have cross-company access
  if (!hasCrossCompanyAccess) {
    return null;
  }

  // Don't render if no companies available
  if (!loading && companies.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
          disabled={loading || switching}
        >
          <Building2 className="h-4 w-4" />
          {loading ? (
            'Loading...'
          ) : activeCompany ? (
            <>
              <span className="truncate max-w-32">{activeCompany.name}</span>
              {companies.length > 1 && <ChevronDown className="h-3 w-3" />}
            </>
          ) : (
            'No Company'
          )}
        </Button>
      </DropdownMenuTrigger>
      
      {companies.length > 1 && (
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
            Switch Company
          </div>
          <DropdownMenuSeparator />
          
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => handleCompanySwitch(company)}
              className="flex items-center justify-between cursor-pointer"
              disabled={switching}
            >
              <div className="flex items-center gap-2">
                {company.color && (
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: company.color }}
                  />
                )}
                <span className="truncate">{company.name}</span>
                {company.type && (
                  <Badge variant="secondary" className="text-xs">
                    {company.type}
                  </Badge>
                )}
              </div>
              {company.id === activeCompany?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};

export default CompanySwitcher;
