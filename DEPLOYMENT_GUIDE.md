# 🚀 FleetTracker Deployment Guide

## **Quick Start (Recommended)**

### **1. Deploy to Railway**
1. Connect your GitHub repository to Railway
2. Railway will automatically detect and deploy your Node.js app
3. Set up environment variables (see below)

### **2. Database Persistence (Simple Solution)**
Railway uses ephemeral filesystems by default. For database persistence:

**Option A: Use Railway PostgreSQL (Recommended)**
- Add a PostgreSQL database in Railway
- Railway will automatically provide `DATABASE_URL`
- Update your app to use PostgreSQL instead of SQLite

**Option B: Use Railway Persistent Directory**
- Set environment variable: `RAILWAY_PERSISTENT_DIR=/app/data`
- This tells Railway to use a persistent directory for your database

### **3. Required Environment Variables**
Set these in Railway dashboard:

```env
# Required for production
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_SECRET_KEY=your-super-secret-admin-key-here

# For database persistence (Option B)
RAILWAY_PERSISTENT_DIR=/app/data

# For maps
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

## **🔧 Database Configuration**

### **Current Setup: SQLite**
- **Pros**: Simple, no external dependencies
- **Cons**: Not persistent on Railway by default
- **Solution**: Use `RAILWAY_PERSISTENT_DIR=/app/data`

### **Recommended: PostgreSQL**
- **Pros**: Persistent, scalable, production-ready
- **Cons**: Requires database setup
- **Solution**: Add PostgreSQL service in Railway

## **🚨 Security Checklist**

### **✅ Required for Production**
- [ ] Change `JWT_SECRET` from default
- [ ] Change `ADMIN_SECRET_KEY` from default
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS origins

### **✅ Recommended**
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set up email service for password reset
- [ ] Configure proper logging
- [ ] Set up monitoring

## **📊 Monitoring & Debugging**

### **Check Application Status**
- Railway dashboard shows deployment status
- Logs are available in Railway dashboard
- Health check endpoint: `https://your-app.railway.app/`

### **Database Status**
- Check logs for database connection messages
- Admin dashboard shows database status
- Use Railway's built-in database tools

## **🔄 Deployment Process**

1. **Push to GitHub** → Automatic deployment
2. **Railway builds** → Installs dependencies
3. **Database initializes** → Creates schema if needed
4. **Server starts** → Application is live

## **🔍 Troubleshooting**

### **Database Issues**
- **Problem**: Database shows as "clean" after deployment
- **Solution**: Set `RAILWAY_PERSISTENT_DIR=/app/data` environment variable

### **Admin Access Issues**
- **Problem**: Can't login as admin
- **Solution**: Check `ADMIN_SECRET_KEY` is set correctly

### **Map Issues**
- **Problem**: Maps don't load
- **Solution**: Set `VITE_MAPBOX_TOKEN` environment variable

## **📈 Scaling Considerations**

### **Current Limitations**
- SQLite: Single connection, not suitable for high traffic
- File-based storage: Not distributed

### **Recommended Upgrades**
- PostgreSQL: Multiple connections, ACID compliance
- Redis: Caching and session storage
- CDN: Static asset delivery

## **🔐 Security Best Practices**

1. **Environment Variables**: Never commit secrets to code
2. **HTTPS**: Railway provides SSL certificates
3. **CORS**: Configure allowed origins
4. **Rate Limiting**: Already implemented
5. **Input Validation**: Already implemented

## **📞 Support**

- **Railway Documentation**: https://docs.railway.app/
- **Application Logs**: Available in Railway dashboard
- **Database Access**: Use Railway's database tools

---

**This approach is clean, simple, and production-ready!** 🎉
