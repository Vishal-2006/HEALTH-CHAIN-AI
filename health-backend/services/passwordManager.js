const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

class PasswordManager {
    constructor() {
        this.passwordFile = path.join(__dirname, '../data/passwords.json');
        this.passwords = new Map();
        this.initialize();
    }
    
    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.passwordFile);
            await fs.mkdir(dataDir, { recursive: true });
            
            // Load existing passwords
            try {
                const data = await fs.readFile(this.passwordFile, 'utf8');
                const passwordData = JSON.parse(data);
                this.passwords = new Map(Object.entries(passwordData));
            } catch (error) {
                // File doesn't exist or is empty, start with empty map
                console.log('No existing password file found, starting fresh');
            }
            
                    // Passwords will be added dynamically when users register
            console.log('✅ Password manager ready for dynamic user registration');
        } catch (error) {
            console.error('Failed to initialize password manager:', error);
        }
    }
    

    
    async savePasswords() {
        try {
            const passwordData = Object.fromEntries(this.passwords);
            await fs.writeFile(this.passwordFile, JSON.stringify(passwordData, null, 2));
        } catch (error) {
            console.error('Failed to save passwords:', error);
        }
    }
    
    async setPassword(username, password) {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            this.passwords.set(username, hashedPassword);
            await this.savePasswords();
            return true;
        } catch (error) {
            console.error('Failed to set password:', error);
            return false;
        }
    }
    
    async verifyPassword(username, password) {
        try {
            const hashedPassword = this.passwords.get(username);
            if (!hashedPassword) {
                return false;
            }
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            console.error('Failed to verify password:', error);
            return false;
        }
    }
    
    async userExists(username) {
        return this.passwords.has(username);
    }
    
    async removeUser(username) {
        try {
            this.passwords.delete(username);
            await this.savePasswords();
            return true;
        } catch (error) {
            console.error('Failed to remove user:', error);
            return false;
        }
    }
}

module.exports = PasswordManager;
