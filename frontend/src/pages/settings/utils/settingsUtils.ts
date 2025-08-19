import { EditingProvider, MaintenancePreferences } from '@/types';

export const buildCredentials = (providerType: string, provider: EditingProvider) => {
  const filterEmptyValues = (obj: Record<string, any>) => {
    const filtered = Object.fromEntries(
      Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
    console.log('🔍 buildCredentials - Original object:', obj);
    console.log('🔍 buildCredentials - Filtered object:', filtered);
    return filtered;
  };

  switch (providerType) {
    case 'spireon':
      return filterEmptyValues({
        apiKey: provider.apiKey,
        username: provider.username,
        password: provider.password,
        nspireId: provider.nspireId
      });
    case 'skybitz':
      return filterEmptyValues({
        username: provider.username,
        password: provider.password
      });
    case 'samsara':
      return filterEmptyValues({
        apiToken: provider.apiToken,
        apiUrl: provider.apiUrl
      });
    default:
      return {};
  }
};

export const validateProviderCredentials = (providerType: string, provider: EditingProvider) => {
  const requiredFields: string[] = [];
  switch (providerType) {
    case 'spireon':
      if (!provider.apiKey || !provider.username || !provider.password || !provider.nspireId) {
        requiredFields.push('API Key', 'Username', 'Password', 'Nspire ID');
      }
      break;
    case 'skybitz':
      if (!provider.username || !provider.password) {
        requiredFields.push('Username', 'Password');
      }
      break;
    case 'samsara':
      if (!provider.apiToken || !provider.apiUrl) {
        requiredFields.push('API Token', 'API URL');
      }
      break;
  }
  return requiredFields;
};

export const getProviderStatusBadge = (status: string) => {
  const statusConfig = {
    active: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Active' },
    inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
    error: { variant: 'destructive', className: 'bg-red-100 text-red-800', label: 'Error' },
    connected: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Connected' },
    disconnected: { variant: 'secondary', className: 'bg-gray-100 text-gray-800', label: 'Disconnected' },
    testing: { variant: 'outline', className: 'bg-blue-100 text-blue-800', label: 'Testing' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || { 
    variant: 'outline', 
    className: '', 
    label: status 
  };
  
  return { 
    variant: config.variant as "default" | "secondary" | "destructive" | "outline", 
    className: config.className, 
    label: config.label 
  };
};
