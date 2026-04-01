import Vec3 from 'vec3';

class ChestManager {
    constructor(bot) {
        this.bot = bot;
        this.knownChests = new Map(); // Position -> contents mapping
        this.baseChests = new Map(); // Special chests in base
    }

    async openChest(chestBlock) {
        try {
            // Move to chest if needed
            if (chestBlock.position.distanceTo(this.bot.entity.position) > 3) {
                await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                    chestBlock.position.x,
                    chestBlock.position.y,
                    chestBlock.position.z
                ));
            }

            const chest = await this.bot.openContainer(chestBlock);
            return chest;
        } catch (error) {
            console.error('Error opening chest:', error);
            return null;
        }
    }

    async findChest(maxDistance = 32) {
        return this.bot.findBlock({
            matching: this.bot.mcData.blocksByName['chest'].id,
            maxDistance: maxDistance
        });
    }

    async depositItems(items, chestBlock) {
        const chest = await this.openChest(chestBlock);
        if (!chest) return false;

        try {
            for (const [itemName, count] of Object.entries(items)) {
                const item = this.bot.inventory.items().find(i => i.name === itemName);
                if (!item) continue;

                await chest.deposit(item.type, null, count);
            }
            
            // Update known chest contents
            this.knownChests.set(chestBlock.position.toString(), chest.items());
            
            await chest.close();
            return true;
        } catch (error) {
            console.error('Error depositing items:', error);
            return false;
        }
    }

    async withdrawItems(items, chestBlock) {
        const chest = await this.openChest(chestBlock);
        if (!chest) return false;

        try {
            for (const [itemName, count] of Object.entries(items)) {
                const item = chest.items().find(i => i.name === itemName);
                if (!item) continue;

                await chest.withdraw(item.type, null, count);
            }
            
            // Update known chest contents
            this.knownChests.set(chestBlock.position.toString(), chest.items());
            
            await chest.close();
            return true;
        } catch (error) {
            console.error('Error withdrawing items:', error);
            return false;
        }
    }

    async organizeBaseChests() {
        // Categories for organization
        const categories = {
            tools: (item) => item.name.includes('pickaxe') || item.name.includes('axe') || 
                           item.name.includes('shovel') || item.name.includes('hoe'),
            weapons: (item) => item.name.includes('sword') || item.name.includes('bow') || 
                             item.name.includes('arrow'),
            blocks: (item) => item.name.includes('stone') || item.name.includes('dirt') || 
                            item.name.includes('wood'),
            resources: (item) => item.name.includes('iron') || item.name.includes('gold') || 
                               item.name.includes('diamond'),
            farming: (item) => item.name.includes('seed') || item.name.includes('wheat') || 
                             item.name.includes('carrot')
        };

        // Organize items by category
        for (const [position, items] of this.baseChests.entries()) {
            const chestBlock = this.bot.blockAt(Vec3.from(position.split(',')));
            if (!chestBlock) continue;

            const chest = await this.openChest(chestBlock);
            if (!chest) continue;

            // Sort items into categories
            const categorizedItems = {};
            for (const item of chest.items()) {
                for (const [category, test] of Object.entries(categories)) {
                    if (test(item)) {
                        categorizedItems[category] = categorizedItems[category] || [];
                        categorizedItems[category].push(item);
                        break;
                    }
                }
            }

            // Reorganize chest
            await chest.close();
        }
    }

    registerBaseChest(position, purpose) {
        this.baseChests.set(position.toString(), { purpose, lastChecked: Date.now() });
        this.bot.chat(`Registered a new ${purpose} chest at base.`);
    }

    async findItemInChests(itemName) {
        for (const [position, contents] of this.knownChests.entries()) {
            const hasItem = contents.some(item => item.name === itemName);
            if (hasItem) {
                return Vec3.from(position.split(','));
            }
        }
        return null;
    }
}

export default ChestManager;