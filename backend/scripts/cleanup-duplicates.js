/**
 * Cleanup Duplicate Trailers Script
 * Removes duplicate trailers based on external_id and keeps the most recent one
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../database/db/fleet_management.db');

async function cleanupDuplicates() {
    const db = new sqlite3.Database(DB_PATH);
    
    console.log('🔍 Starting duplicate trailer cleanup...');
    
    try {
        // Find duplicates based on unit_number
        const duplicates = await new Promise((resolve, reject) => {
            db.all(`
                SELECT unit_number, COUNT(*) as count, GROUP_CONCAT(id) as ids
                FROM persistent_trailers 
                WHERE unit_number IS NOT NULL 
                GROUP BY unit_number 
                HAVING COUNT(*) > 1
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log(`📊 Found ${duplicates.length} groups of duplicate trailers`);
        
        let totalDeleted = 0;
        
        for (const duplicate of duplicates) {
            const ids = duplicate.ids.split(',');
            console.log(`\n🔧 Processing duplicates for unit_number: ${duplicate.unit_number} (${duplicate.count} trailers)`);
            
            // Keep the most recent trailer (highest ID or most recent updated_at)
            const keepId = ids[ids.length - 1]; // Keep the last one for now
            
            // Delete the others
            const deleteIds = ids.slice(0, -1);
            
            for (const deleteId of deleteIds) {
                await new Promise((resolve, reject) => {
                    db.run('DELETE FROM persistent_trailers WHERE id = ?', [deleteId], function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`  🗑️ Deleted trailer: ${deleteId}`);
                            totalDeleted++;
                            resolve();
                        }
                    });
                });
            }
        }
        
        console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate trailers`);
        
        // Show final count
        const finalCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM persistent_trailers', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        console.log(`📊 Final trailer count: ${finalCount}`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        db.close();
    }
}

// Run the cleanup
cleanupDuplicates().catch(console.error);
