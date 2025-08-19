# FleetTracker v2.1 Backend Architecture Guide

## Overview
The FleetTracker backend is a Node.js/Express application with a modular, service-oriented architecture. After the recent database refactor, the codebase has been optimized for maintainability, testability, and performance.

## Directory Structure

```
backend/
├── database/                    # Database layer (refactored)
│   ├── db/                     # Database files storage
│   │   └── fleet_management.db # SQLite database file
│   ├── managers/               # Individual manager classes
│   ├── utils/                  # Database utilities
│   ├── backups/                # Database backup files
│   ├── database-initializer.js # Database schema & initialization
│   └── database-manager.js     # Central access hub
├── routes/                     # Express route handlers
├── middleware/                 # Express middleware
├── services/                   # Business logic services
├── utils/                      # General utilities
├── config/                     # Configuration files
└── server.js                   # Main application entry point
```

## Database Layer (`/database`)

### Core Components

#### `database-manager.js` - Central Access Hub
- **Purpose**: Single entry point for all database operations
- **Functionality**: 
  - Imports and initializes all manager instances
  - Provides centralized exports for database functions
  - Manages dependencies between managers
- **Exports**: Manager instances, database functions, utilities

#### `database-initializer.js` - Schema Management
- **Purpose**: Database schema creation and initialization
- **Functionality**:
  - Creates all database tables with proper constraints
  - Sets up SQLite pragmas (WAL mode, foreign keys, timeouts)
  - Handles multi-tenant support
  - Creates indexes for performance optimization
- **Key Features**:
  - Automatic directory creation for database files
  - Environment-based configuration
  - Comprehensive error handling

#### `/managers/` - Individual Manager Classes
Each manager handles a specific domain of the application:

1. **`user-manager.js`** - User management
   - User CRUD operations
   - Authentication and authorization
   - Multi-tenant user isolation

2. **`trailer-manager.js`** - Trailer/vehicle management
   - Trailer CRUD operations
   - GPS location tracking
   - Status management

3. **`company-manager.js`** - Company management
   - Company CRUD operations
   - DOT number management
   - Insurance information

4. **`gps-provider-manager.js`** - GPS provider integration
   - Provider configuration
   - Credential management
   - Integration status

5. **`maintenance-manager.js`** - Maintenance operations
   - Maintenance alerts
   - Inspection records
   - Tire management

6. **`trailer-notes-manager.js`** - Notes and comments
   - Trailer-specific notes
   - Note categorization
   - Timestamp management

7. **`custom-company-manager.js`** - Custom company data
   - Extended company information
   - Custom fields management

8. **`custom-location-manager.js`** - Custom locations
   - Location CRUD operations
   - Geocoding support
   - Address validation

9. **`stats-manager.js`** - Statistics and analytics
   - Fleet statistics
   - Performance metrics
   - Reporting data

10. **`permissions-manager.js`** - Access control
    - Role-based permissions
    - Static permission checks
    - Custom role management

11. **`maintenance-preferences-manager.js`** - Maintenance settings
    - User preferences
    - Notification settings
    - Maintenance schedules

#### `/utils/` - Database Utilities

##### `database-utilities.js` - Core Utilities
- **`extractCityStateFromString()`** - Address parsing (centralized)
- **`calculateDistance()`** - Geographic distance calculations
- **`formatAddress()`** - Address formatting
- **`isValidCoordinates()`** - Coordinate validation
- **`sanitizeSQLInput()`** - SQL injection prevention
- **`safeJSONParse/Stringify()`** - Safe JSON operations

##### `db-helpers.js` - Database Operations
- **`generateId()`** - UUID generation
- **`executeQuery/executeSingleQuery/executeQueryFirst()`** - Query execution
- **`beginTransaction/commitTransaction/rollbackTransaction()`** - Transaction management
- **`buildWhereClause/buildOrderByClause/buildLimitClause()`** - Query building
- **`tableExists/getTableSchema/createIndexIfNotExists()`** - Schema utilities

## Routes Layer (`/routes`)

### Route Files
- **`auth.js`** - Authentication endpoints
- **`users.js`** - User management endpoints
- **`trailers.js`** - Trailer management endpoints
- **`companies.js`** - Company management endpoints
- **`maintenance.js`** - Maintenance endpoints
- **`notes.js`** - Notes management endpoints
- **`providers.js`** - GPS provider endpoints
- **`stats.js`** - Statistics endpoints
- **`admin.js`** - Administrative endpoints
- **`refresh.js`** - Auto-refresh endpoints

## Services Layer (`/services`)

### Core Services
- **`auto-refresh.js`** - Automated data refresh system
- **`maintenance.js`** - Maintenance business logic
- **`gps-providers/`** - GPS provider integrations
  - `base-provider.js` - Base provider class
  - `skybitz-service.js` - SkyBitz integration
  - `samsara-service.js` - Samsara integration

## Middleware Layer (`/middleware`)

### Middleware Components
- **`permissions.js`** - Permission checking middleware
- **`auth.js`** - Authentication middleware
- **`validation.js`** - Request validation middleware

## Utilities Layer (`/utils`)

### Utility Components
- **`constants.js`** - Application constants
- **`encryption.js`** - Encryption utilities
- **`registration-validator.js`** - Registration validation
- **`logger.js`** - Logging utilities

## Key Architectural Principles

### 1. **Modularity**
- Each manager handles a specific domain
- Clear separation of concerns
- Independent testing capabilities

### 2. **Dependency Injection**
- Managers receive database connection via constructor
- Dependencies explicitly declared and injected
- Easy to mock for testing

### 3. **Error Handling**
- Comprehensive try-catch blocks
- Standardized error responses
- Detailed error logging

### 4. **Performance Optimization**
- SQLite WAL mode for concurrency
- Proper indexing strategy
- Connection pooling considerations

### 5. **Security**
- SQL injection prevention
- Input sanitization
- Role-based access control

## Database Schema Highlights

### Multi-Tenant Support
- All tables include `tenant_id` for data isolation
- Default tenant configuration via environment variables
- Tenant-specific data access controls

### Foreign Key Constraints
- Proper referential integrity
- Cascade delete operations
- Data consistency enforcement

### Indexing Strategy
- Composite indexes for common queries
- Unique constraints for data integrity
- Performance-optimized query patterns

## Migration from Monolithic to Modular

### Before Refactor
- Single `database-manager.js` file (2000+ lines)
- Static method calls
- Tight coupling between components
- Difficult to test and maintain

### After Refactor
- 11 individual manager classes
- Instance-based architecture
- Clear dependency management
- Comprehensive test coverage
- Improved maintainability

## Testing Strategy

### Unit Testing
- Individual manager testing
- Mocked dependencies
- Isolated test environments

### Integration Testing
- Cross-manager functionality
- Database integration tests
- End-to-end workflows

### Performance Testing
- Query optimization
- Load testing
- Memory usage monitoring

## Best Practices

### Code Organization
1. **Single Responsibility**: Each manager handles one domain
2. **Dependency Injection**: Explicit dependency management
3. **Error Handling**: Comprehensive error management
4. **Documentation**: Clear JSDoc comments
5. **Testing**: Comprehensive test coverage

### Database Operations
1. **Parameterized Queries**: Prevent SQL injection
2. **Transaction Management**: Ensure data consistency
3. **Indexing**: Optimize query performance
4. **Connection Management**: Proper resource cleanup

### Security Considerations
1. **Input Validation**: Sanitize all inputs
2. **Access Control**: Role-based permissions
3. **Data Encryption**: Sensitive data protection
4. **Audit Logging**: Track important operations

## Performance Optimizations

### Database Level
- WAL mode for better concurrency
- Proper indexing strategy
- Query optimization
- Connection pooling

### Application Level
- Caching strategies
- Lazy loading
- Pagination
- Efficient data structures

## Monitoring and Maintenance

### Health Checks
- Database connectivity
- Manager initialization
- Service availability

### Backup Strategy
- Automated database backups
- Configuration backups
- Disaster recovery procedures

### Logging
- Structured logging
- Error tracking
- Performance monitoring

## Future Enhancements

### Planned Improvements
1. **Connection Pooling**: Enhanced database connection management
2. **Caching Layer**: Redis integration for performance
3. **Microservices**: Further modularization
4. **API Versioning**: Backward compatibility
5. **Real-time Updates**: WebSocket integration

### Scalability Considerations
1. **Horizontal Scaling**: Load balancing strategies
2. **Database Sharding**: Multi-database support
3. **Caching**: Distributed caching
4. **Monitoring**: Advanced metrics and alerting

---

*This guide reflects the current state after the comprehensive database refactor. The architecture prioritizes maintainability, testability, and performance while maintaining backward compatibility.*
