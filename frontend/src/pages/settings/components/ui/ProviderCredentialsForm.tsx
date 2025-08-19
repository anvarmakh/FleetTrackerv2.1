import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { EditingProvider } from '@/types';

interface ProviderCredentialsFormProps {
  providerType: string;
  provider: EditingProvider;
  onChange: (field: string, value: string) => void;
}

const ProviderCredentialsForm: React.FC<ProviderCredentialsFormProps> = ({ 
  providerType, 
  provider, 
  onChange 
}) => {
  const renderSpireonFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="api-key">API Key *</Label>
        <Input
          id="api-key"
          type="password"
          value={provider.apiKey || ''}
          onChange={(e) => onChange('apiKey', e.target.value)}
          placeholder="Enter API Key"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={provider.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
          placeholder="Enter username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={provider.password || ''}
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="Enter password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nspire-id">Nspire ID *</Label>
        <Input
          id="nspire-id"
          value={provider.nspireId || ''}
          onChange={(e) => onChange('nspireId', e.target.value)}
          placeholder="Enter Nspire ID"
        />
      </div>
    </>
  );

  const renderSkyBitzFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={provider.username || ''}
          onChange={(e) => onChange('username', e.target.value)}
          placeholder="Enter username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={provider.password || ''}
          onChange={(e) => onChange('password', e.target.value)}
          placeholder="Enter password"
        />
      </div>
    </>
  );

  const renderSamsaraFields = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="api-token">API Token *</Label>
        <Input
          id="api-token"
          type="password"
          value={provider.apiToken || ''}
          onChange={(e) => onChange('apiToken', e.target.value)}
          placeholder="Enter API Token"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="api-url">API URL *</Label>
        <Input
          id="api-url"
          value={provider.apiUrl || ''}
          onChange={(e) => onChange('apiUrl', e.target.value)}
          placeholder="Enter API URL (e.g., https://api.samsara.com)"
        />
      </div>
    </>
  );

  switch (providerType) {
    case 'spireon':
      return renderSpireonFields();
    case 'skybitz':
      return renderSkyBitzFields();
    case 'samsara':
      return renderSamsaraFields();
    case 'other':
      return (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Custom provider type selected. Please contact support for credential configuration.
          </p>
        </div>
      );
    default:
      return null;
  }
};

export default ProviderCredentialsForm;
