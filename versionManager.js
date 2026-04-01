// Version manager for handling multiple Minecraft versions
import mineflayer from 'mineflayer';

class VersionManager {
    constructor() {
        this.supportedVersions = [
            '1.8', '1.9', '1.10', '1.11', '1.12',
            '1.13', '1.14', '1.15', '1.16', '1.17',
            '1.18', '1.19', '1.20'
        ];
    }

    async detectServerVersion(host, port) {
        return new Promise((resolve, reject) => {
            const tempBot = mineflayer.createBot({
                host: host,
                port: port,
                username: 'VersionDetector',
                version: false
            });

            tempBot.once('spawn', () => {
                const version = tempBot.version;
                tempBot.end();
                resolve(version);
            });

            tempBot.once('error', (err) => {
                tempBot.end();
                reject(err);
            });

            setTimeout(() => {
                tempBot.end();
                reject(new Error('Version detection timed out'));
            }, 10000);
        });
    }

    async createBot(options = {}) {
        const defaultOptions = {
            host: 'localhost',
            port: 25565,
            username: 'MeiBot',
            auth: 'offline'
        };

        // Merge provided options with defaults
        const botOptions = { ...defaultOptions, ...options };

        try {
            // Try to detect server version
            console.log('Detecting server version...');
            const detectedVersion = await this.detectServerVersion(botOptions.host, botOptions.port);
            
            if (detectedVersion) {
                console.log(`Detected server version: ${detectedVersion}`);
                botOptions.version = detectedVersion;
            } else {
                console.log('Using auto version detection');
                botOptions.version = false;
            }

            // Create bot with detected or auto version
            const bot = mineflayer.createBot(botOptions);

            // Version confirmation on spawn
            bot.once('spawn', () => {
                console.log(`Connected successfully using Minecraft version: ${bot.version}`);
                if (this.supportedVersions.includes(bot.version.split('.').slice(0, 2).join('.'))) {
                    console.log('Running with full feature support');
                } else {
                    console.log('Warning: Running with basic feature support');
                }
            });

            return bot;

        } catch (err) {
            console.error('Error creating bot:', err);
            // Fallback to auto version detection
            console.log('Falling back to auto version detection...');
            botOptions.version = false;
            return mineflayer.createBot(botOptions);
        }
    }

    isVersionSupported(version) {
        return this.supportedVersions.includes(version.split('.').slice(0, 2).join('.'));
    }

    getFeatureSupport(version) {
        const majorVersion = version.split('.')[1];
        return {
            pathfinding: parseInt(majorVersion) >= 12,
            physics: parseInt(majorVersion) >= 8,
            inventory: parseInt(majorVersion) >= 8,
            combat: parseInt(majorVersion) >= 9,
            blocks: parseInt(majorVersion) >= 13,
            entities: parseInt(majorVersion) >= 11
        };
    }
}

export default VersionManager;