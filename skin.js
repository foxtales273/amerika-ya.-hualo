import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SkinManager {
    constructor(bot) {
        this.bot = bot;
        this.skinsFolder = path.join(__dirname, 'skins');
        this.currentSkin = null;

        // Create skins folder if it doesn't exist
        if (!fs.existsSync(this.skinsFolder)) {
            fs.mkdirSync(this.skinsFolder);
        }
    }

    async loadSkin(skinName) {
        const skinPath = path.join(this.skinsFolder, `${skinName}.png`);
        
        if (!fs.existsSync(skinPath)) {
            throw new Error(`Skin ${skinName} not found`);
        }

        const skinBuffer = fs.readFileSync(skinPath);
        await this.bot.customSkin.setSkin(skinBuffer);
        this.currentSkin = skinName;
    }

    async randomSkin() {
        const skins = fs.readdirSync(this.skinsFolder)
            .filter(file => file.endsWith('.png'))
            .map(file => file.replace('.png', ''));

        if (skins.length === 0) {
            throw new Error('No skins available');
        }

        const randomSkin = skins[Math.floor(Math.random() * skins.length)];
        await this.loadSkin(randomSkin);
    }

    getCurrentSkin() {
        return this.currentSkin;
    }
}

export default SkinManager;