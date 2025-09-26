const DatabaseService = require('./services/databaseService');

async function cleanupDuplicates() {
    const databaseService = new DatabaseService();
    
    try {
        console.log('🚀 Starting duplicate appointment cleanup...');
        
        // Connect to database
        await databaseService.connect();
        console.log('✅ Connected to database');
        
        // Run cleanup
        const result = await databaseService.cleanupDuplicateAppointments();
        
        if (result.success) {
            console.log(`✅ Cleanup completed successfully!`);
            console.log(`🧹 Removed ${result.cleanedCount} duplicate appointments`);
        } else {
            console.log('❌ Cleanup failed');
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await databaseService.disconnect();
        console.log('✅ Disconnected from database');
        process.exit(0);
    }
}

// Run the cleanup
cleanupDuplicates();
