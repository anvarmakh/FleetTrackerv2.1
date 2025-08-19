# Settings Page Refactoring

This directory contains the refactored settings page components, breaking down the original monolithic `Settings.tsx` file into smaller, more manageable components.

## Structure

```
settings/
├── components/
│   ├── index.ts                    # Export all components
│   ├── SettingsLayout.tsx          # Main layout wrapper
│   ├── CompanySettings.tsx         # Company management
│   ├── ProviderSettings.tsx        # GPS provider management
│   ├── PreferencesSettings.tsx     # User preferences
│   ├── MaintenanceSettings.tsx     # Maintenance preferences
│   └── ui/                         # Reusable UI components
│       ├── ColorPicker.tsx         # Color selection component
│       ├── ToggleSetting.tsx       # Toggle switch component
│       ├── ProviderCredentialsForm.tsx # Provider credentials form
│       └── MaintenanceIntervalSection.tsx # Maintenance interval inputs
# Uses centralized types from @/types
├── utils/
│   └── settingsUtils.ts            # Utility functions
└── README.md                       # This file
```

## Components

### SettingsLayout
- Handles the overall page structure and navigation
- Manages tab switching between different settings sections
- Provides consistent layout across all settings tabs

### CompanySettings
- Manages company creation, editing, and deletion
- Handles company type selection and color customization
- Displays companies in a table format with actions

### ProviderSettings
- Manages GPS provider configuration
- Handles provider credentials for different provider types (Spireon, SkyBitz, Samsara)
- Provides connection testing and provider refresh functionality

### PreferencesSettings
- Manages user preferences (timezone, language, theme)
- Handles display settings (auto-refresh, show/hide elements)
- Manages notification preferences

### MaintenanceSettings
- Configures maintenance intervals and alert thresholds
- Manages maintenance notification settings
- Handles different inspection types (annual, midtrip, brake)

## UI Components

### ColorPicker
- Reusable color selection component with preset colors
- Used for company color customization

### ToggleSetting
- Reusable toggle switch component for boolean settings
- Provides consistent UI for on/off settings

### ProviderCredentialsForm
- Dynamic form for different provider credential types
- Handles validation and field requirements per provider

### MaintenanceIntervalSection
- Reusable component for maintenance interval configuration
- Handles both interval and threshold inputs

## Types

All TypeScript interfaces and constants are imported from the centralized `@/types`:
- `Company`, `Provider`, `EditingProvider`
- `MaintenancePreferences`, `UserPreferences`
- Constants for company types, provider types, timezones, etc.

## Utilities

Utility functions in `settingsUtils.ts`:
- `buildCredentials()` - Builds provider credentials object
- `validateProviderCredentials()` - Validates required fields
- `getProviderStatusBadge()` - Returns status badge configuration

## Benefits of Refactoring

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: UI components can be reused across the application
3. **Maintainability**: Easier to maintain and update individual components
4. **Testability**: Components can be tested in isolation
5. **Type Safety**: Centralized types ensure consistency
6. **Performance**: Smaller components can be optimized individually

## Usage

The main `Settings.tsx` file now imports and uses these components:

```tsx
import SettingsLayout from './settings/components/SettingsLayout';
import CompanySettings from './settings/components/CompanySettings';
// ... other imports

const Settings = () => {
  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <TabsContent value="company">
        <CompanySettings companies={companies} onRefresh={loadSettingsData} />
      </TabsContent>
      {/* ... other tabs */}
    </SettingsLayout>
  );
};
```

## Migration Notes

- All functionality from the original `Settings.tsx` has been preserved
- API calls and state management remain the same
- UI/UX improvements include better component organization and reusability
- Follows camelCase naming conventions as per workspace rules
