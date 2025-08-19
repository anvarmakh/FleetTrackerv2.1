/**
 * Database Backup Script
 * Creates a backup of the database file for persistence across deployments
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = process.env.RAILWAY_VOLUME_PATH || '/app/database' || path.join(__dirname, '..', 'database', 'db');
const DB_PATH = path.join(DB_DIR, 'fleet_management.db');
const BACKUP_PATH = path.join(DB_DIR, 'fleet_management_backup.db');

console.log('🔍 Database backup script started');
console.log('📁 Database directory:', DB_DIR);
console.log('📄 Database file:', DB_PATH);
console.log('💾 Backup file:', BACKUP_PATH);

// Check if database exists
if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    console.log('✅ Database file exists, size:', stats.size, 'bytes');
    
    // Create backup
    try {
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
        const backupStats = fs.statSync(BACKUP_PATH);
        console.log('✅ Backup created successfully, size:', backupStats.size, 'bytes');
    } catch (error) {
        console.error('❌ Failed to create backup:', error.message);
    }
} else {
    console.log('⚠️ Database file does not exist');
    
    // Check if backup exists and restore it
    if (fs.existsSync(BACKUP_PATH)) {
        console.log('🔄 Restoring from backup...');
        try {
            fs.copyFileSync(BACKUP_PATH, DB_PATH);
            const restoredStats = fs.statSync(DB_PATH);
            console.log('✅ Database restored from backup, size:', restoredStats.size, 'bytes');
        } catch (error) {
            console.error('❌ Failed to restore from backup:', error.message);
        }
    } else {
        console.log('⚠️ No backup file found');
    }
}

console.log('🏁 Database backup script completed');
