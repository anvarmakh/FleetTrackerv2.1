module.exports = {
  // Database Configuration
  database: {
    path: './database/fleet_management.db'
  },

  // Default Tenant Configuration
  tenant: {
    defaultId: process.env.DEFAULT_TENANT_ID || 'default',
    defaultName: process.env.DEFAULT_TENANT_NAME || 'Default Organization',
    defaultDescription: process.env.DEFAULT_TENANT_DESCRIPTION || 'Default tenant for system operations'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  // Encryption (Required for production)
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'dev-encryption-key-change-in-production'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
  },

  // Admin Configuration
  admin: {
    secretKey: process.env.ADMIN_SECRET_KEY || 'dev-admin-key-change-in-production'
  },

  // Email Configuration (Optional)
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },

  // GPS Provider Configuration
  gps: {
    syncInterval: process.env.GPS_SYNC_INTERVAL || 300
  }
}; 