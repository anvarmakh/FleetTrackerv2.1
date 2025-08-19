### Admin Credentials:

**For Development:**
- **Email**: ``admin@system.local``
- **Password**: `dev-admin-key-change-in-production`
- **Tenant ID**: Any value (e.g., `admin`)

**For Production:**
Set the `ADMIN_SECRET_KEY` environment variable:
```bash
export ADMIN_SECRET_KEY="your-super-secret-admin-key-here"
```

backend/
├── database/
│   ├── database-manager.js          # Main orchestrator
│   ├── managers/                    # Individual manager classes
│   │   ├── user-manager.js         ✅ EXTRACTED
│   │   ├── trailer-manager.js      # Next to extract
│   │   ├── company-manager.js
│   │   ├── gps-provider-manager.js
│   │   ├── maintenance-manager.js
│   │   ├── custom-company-manager.js
│   │   ├── custom-location-manager.js
│   │   ├── trailer-notes-manager.js
│   │   ├── stats-manager.js
│   │   ├── permissions-manager.js
│   │   ├── maintenance-preferences-manager.js
│   │   ├── manager-factory.js      ✅ CREATED
│   │   └── compatibility-layer.js  ✅ CREATED
│   ├── utils/                      # Database-specific utilities
│   │   ├── db-helpers.js          ✅ CREATED
│   │   ├── db-constants.js        # Database-specific constants
│   │   └── db-validation.js       # Database-specific validation
│   └── migrations/                 # Database schema changes
│       ├── 001-initial-schema.js
│       ├── 002-add-password-reset.js
│       └── 003-add-maintenance-tables.js
├── services/                       # Business logic layer
│   ├── gps-provider-service.js    ✅ EXISTS
│   ├── gps-providers/
│   │   ├── samsara-service.js     ✅ EXISTS
│   │   └── skybitz-service.js     ✅ EXISTS
│   └── maintenance-service.js
├── utils/                         # Application-wide utilities
│   ├── constants.js               ✅ EXISTS
│   ├── validation.js              ✅ EXISTS
│   └── encryption.js
└── routes/                        # API endpoints
    ├── users.js
    ├── companies.js
    ├── trailers.js
    └── maintenance.js