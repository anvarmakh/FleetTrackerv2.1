/**
 * Cleanup Tenant Data Script
 * Removes all data associated with a specific tenant
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/db/fleet_management.db');

async function cleanupTenantData(tenantId) {
    if (!tenantId) {
        console.error('❌ Tenant ID is required');
        console.log('Usage: node scripts/cleanup-tenant-data.js <tenant_id>');
        return;
    }

    const db = new sqlite3.Database(DB_PATH);
    
    console.log(`🔍 Starting tenant data cleanup for: ${tenantId}`);
    
    try {
        // Check if tenant exists
        const tenantExists = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM tenants WHERE id = ?', [tenantId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!tenantExists) {
            console.log(`⚠️ Tenant ${tenantId} not found in tenants table`);
        } else {
            console.log(`✅ Found tenant: ${tenantId}`);
        }
        
        // 1. Delete system notes for this tenant
        const notesResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM system_notes WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`📝 Deleted ${notesResult} system notes`);
        
        // 2. Delete maintenance alerts for this tenant's trailers
        const alertsResult = await new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM maintenance_alerts 
                WHERE trailer_id IN (SELECT id FROM persistent_trailers WHERE tenant_id = ?)
            `, [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`⚠️ Deleted ${alertsResult} maintenance alerts`);
        
        // 3. Delete tire records for this tenant's trailers
        const tireResult = await new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM tire_records 
                WHERE trailer_id IN (SELECT id FROM persistent_trailers WHERE tenant_id = ?)
            `, [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🛞 Deleted ${tireResult} tire records`);
        
        // 4. Delete trailer inspections for this tenant's trailers
        const inspectionsResult = await new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM trailer_inspections 
                WHERE trailer_id IN (SELECT id FROM persistent_trailers WHERE tenant_id = ?)
            `, [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🔍 Deleted ${inspectionsResult} trailer inspections`);
        
        // 5. Delete all trailers for this tenant
        const trailersResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM persistent_trailers WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🚛 Deleted ${trailersResult} trailers`);
        
        // 6. Delete custom locations for this tenant
        const locationsResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM trailer_custom_locations WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`📍 Deleted ${locationsResult} custom locations`);
        
        // 7. Delete custom companies for this tenant
        const customCompaniesResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM trailer_custom_companies WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🏢 Deleted ${customCompaniesResult} custom companies`);
        
        // 8. Delete GPS providers for this tenant
        const providersResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM gps_providers WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`📡 Deleted ${providersResult} GPS providers`);
        
        // 9. Delete companies for this tenant
        const companiesResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM companies WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🏢 Deleted ${companiesResult} companies`);
        
        // 10. Delete users for this tenant
        const usersResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE tenant_id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`👥 Deleted ${usersResult} users`);
        
        // 11. Finally, delete the tenant itself
        const tenantResult = await new Promise((resolve, reject) => {
            db.run('DELETE FROM tenants WHERE id = ?', [tenantId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
        console.log(`🗑️ Deleted ${tenantResult} tenant record`);
        
        console.log(`\n✅ Tenant cleanup complete for: ${tenantId}`);
        console.log(`📊 Summary:`);
        console.log(`  - System notes: ${notesResult}`);
        console.log(`  - Maintenance alerts: ${alertsResult}`);
        console.log(`  - Tire records: ${tireResult}`);
        console.log(`  - Trailer inspections: ${inspectionsResult}`);
        console.log(`  - Trailers: ${trailersResult}`);
        console.log(`  - Custom locations: ${locationsResult}`);
        console.log(`  - Custom companies: ${customCompaniesResult}`);
        console.log(`  - GPS providers: ${providersResult}`);
        console.log(`  - Companies: ${companiesResult}`);
        console.log(`  - Users: ${usersResult}`);
        console.log(`  - Tenant record: ${tenantResult}`);
        
    } catch (error) {
        console.error('❌ Error during tenant cleanup:', error);
    } finally {
        db.close();
    }
}

// Get tenant ID from command line arguments
const tenantId = process.argv[2];

// Run the cleanup
cleanupTenantData(tenantId).catch(console.error);
