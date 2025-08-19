# TrailerGPS Fleet Management Platform

A comprehensive GPS fleet management platform with multi-tenant support, real-time tracking, and automated data synchronization.

## 🏗️ Project Structure

```
TrailerGPS v1.3/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utilities and API client
│   │   ├── hooks/             # Custom React hooks
│   │   └── contexts/          # React contexts
│   ├── public/                # Static assets
│   ├── package.json           # Frontend dependencies
│   └── ... (config files)
├── backend/                    # Node.js + Express backend
│   ├── server.js              # Main server file
│   ├── database-manager.js    # Database operations
│   ├── database/              # Database files
│   │   └── fleet_management.db
│   └── package.json           # Backend dependencies
├── package.json               # Root workspace config
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TrailerGPS-v1.3
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

This will start both:
- **Backend**: `http://localhost:3000`
- **Frontend**: `http://localhost:5173`

## 📁 Available Scripts

### Root Level (Workspace)
```bash
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start only frontend
npm run dev:backend           # Start only backend
npm run build                 # Build frontend for production
npm run start                 # Start backend in production
npm run install:all           # Install dependencies for all workspaces
npm run clean                 # Clean all node_modules
npm run lint                  # Lint both frontend and backend
```

### Frontend Only
```bash
cd frontend
npm run dev                   # Start development server
npm run build                 # Build for production
npm run preview               # Preview production build
npm run lint                  # Lint TypeScript/React code
```

### Backend Only
```bash
cd backend
npm run start:dev             # Start development server
npm start                     # Start production server
npm test                      # Run tests
npm run lint                  # Lint JavaScript code
```

## 🔧 Configuration

### Environment Variables

#### Backend Configuration
Create `.env` files in the backend directory:

```env
# Backend .env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key-here!
```

#### Frontend Configuration
Create `.env` files in the frontend directory:

```env
# Frontend .env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# For production (example)
# VITE_API_BASE_URL=https://your-production-api.com

# For staging (example)
# VITE_API_BASE_URL=https://your-staging-api.com
```

**Note**: The frontend uses environment variables prefixed with `VITE_` to make them available in the browser. The API base URL is configurable for different environments (development, staging, production).

### Database

The application uses SQLite3 with automatic schema initialization. The database file is located at:
```
backend/database/fleet_management.db
```

## 🏛️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Shadcn UI components
- **State Management**: React Context + Custom hooks
- **Routing**: React Router DOM
- **Maps**: Mapbox GL JS
- **Forms**: React Hook Form + Zod validation

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Database**: SQLite3 with custom ORM
- **Authentication**: JWT tokens
- **GPS Integration**: Spireon, SkyBitz, Samsara APIs
- **Real-time**: Server-Sent Events (SSE)
- **Security**: Rate limiting, input validation, encryption

## 🔌 GPS Provider Integration

The platform supports multiple GPS providers:

- **Spireon**: Real-time GPS tracking
- **SkyBitz**: Fleet management solutions
- **Samsara**: IoT platform integration

Each provider is automatically discovered and configured through the admin interface.

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts with DOT tenancy
- `companies` - Fleet companies/organizations
- `persistent_trailers` - Trailer inventory
- `gps_providers` - GPS service configurations
- `custom_locations` - User-defined locations
- `trailer_notes` - Trailer-specific notes

### Features
- Multi-tenant architecture with DOT number isolation
- Automatic GPS data synchronization
- Real-time maintenance alerts
- Custom location management
- Comprehensive audit trails

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build frontend
npm run build

# Start backend
npm start
```

### Docker (Optional)
```bash
docker-compose up -d
```

## 📊 Features

### Dashboard
- Real-time fleet overview
- Interactive map with clustering
- Market summary statistics
- GPS data visualization

### Trailer Management
- Comprehensive trailer inventory
- GPS status monitoring
- Maintenance tracking
- Custom notes system

### Location Management
- Custom location creation
- Proximity-based statistics
- Icon and color customization
- Edit/delete functionality

### User Management
- Multi-role access control
- DOT number-based tenancy
- Company-specific data isolation
- Secure authentication

## 🔒 Security

- JWT-based authentication
- Role-based access control
- Data encryption for sensitive information
- Rate limiting and input validation
- SQL injection prevention
- CORS configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ for the trucking industry** 