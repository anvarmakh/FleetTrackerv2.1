# 🚂 Railway Deployment Guide for FleetTracker v2.1

This guide will help you deploy your FleetTracker application to Railway.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Environment Variables**: Prepare your production environment variables

## 🚀 Quick Deployment Steps

### 1. Connect to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your FleetTracker repository
5. Railway will automatically detect the Node.js project

### 2. Configure Environment Variables

In your Railway project dashboard, go to the "Variables" tab and add these environment variables:

#### Required Variables (Production)
```bash
NODE_ENV=production
ENCRYPTION_KEY=your-secure-32-character-encryption-key
JWT_SECRET=your-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-secure-jwt-refresh-secret
ADMIN_SECRET_KEY=your-secure-admin-secret-key
```

#### Optional Variables
```bash
DEFAULT_TENANT_ID=default
DEFAULT_TENANT_NAME=Your Organization Name
DEFAULT_TENANT_DESCRIPTION=Your organization description
GPS_SYNC_INTERVAL=300
VITE_MAPBOX_TOKEN=your-mapbox-token
```

### 3. Deploy

1. Railway will automatically build and deploy your application
2. The build process will:
   - Install all dependencies
   - Build the frontend (React/Vite)
   - Start the backend server
3. Your app will be available at the provided Railway URL

## 🔧 Configuration Files

The following files have been created for Railway deployment:

### `railway.json`
- Railway-specific configuration
- Health check endpoint: `/api/health`
- Restart policy configuration

### `nixpacks.toml`
- Build configuration for Railway
- Specifies Node.js and npm installation
- Defines build and start commands

### `Procfile`
- Process management for Railway
- Specifies the web process command

### `env.example`
- Template for environment variables
- Copy to `.env` for local development

## 🏥 Health Check

The application includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "system": "GPS Fleet Management with DOT Tenancy (Refactored)",
  "version": "2.4.0",
  "features": {
    "multiTenant": true,
    "dotTenancy": true,
    "autoDiscovery": true,
    "encryption": true,
    "authentication": true,
    "persistentTrailers": true,
    "gpsProviders": ["spireon", "skybitz", "samsara"],
    "modularArchitecture": true
  }
}
```

## 🔒 Security Considerations

### Production Security
1. **Change Default Secrets**: Update all default secrets in production
2. **Use Strong Keys**: Generate secure random keys for:
   - `ENCRYPTION_KEY` (32 characters)
   - `JWT_SECRET` (64+ characters)
   - `JWT_REFRESH_SECRET` (64+ characters)
   - `ADMIN_SECRET_KEY` (64+ characters)

### Environment Variables
- Never commit `.env` files to version control
- Use Railway's environment variable management
- Rotate secrets regularly

## 📊 Monitoring

### Railway Dashboard
- Monitor application logs in real-time
- Track resource usage (CPU, memory)
- View deployment history

### Application Logs
- Backend logs are available in Railway dashboard
- Frontend build logs are shown during deployment
- Error logs are automatically captured

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch:

1. Push changes to GitHub
2. Railway detects the changes
3. Automatic build and deployment
4. Health check verification
5. Traffic routing to new deployment

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Review build logs in Railway dashboard

#### Runtime Errors
- Check environment variables are set correctly
- Verify database connection (if using external DB)
- Review application logs

#### Health Check Failures
- Ensure the `/api/health` endpoint is accessible
- Check that the server is starting correctly
- Verify port configuration

### Debug Commands

```bash
# View build logs
railway logs

# Check environment variables
railway variables

# Restart deployment
railway service restart
```

## 📈 Scaling

### Automatic Scaling
- Railway automatically scales based on traffic
- No manual configuration required
- Pay only for what you use

### Manual Scaling
- Adjust resources in Railway dashboard
- Scale up for high traffic periods
- Scale down during low usage

## 🔗 Custom Domains

1. Go to your Railway project settings
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS (automatic with Railway)

## 📞 Support

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Application Issues**: Check the project's GitHub issues

## 🎉 Success!

Once deployed, your FleetTracker application will be:
- ✅ Automatically built and deployed
- ✅ Monitored and scaled
- ✅ Secured with HTTPS
- ✅ Available globally
- ✅ Continuously updated

Your application URL will be provided by Railway and can be shared with users.
