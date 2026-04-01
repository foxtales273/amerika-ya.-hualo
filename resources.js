import Vec3 from 'vec3';
import pathfinderPkg from 'mineflayer-pathfinder';

const { goals } = pathfinderPkg;

class ResourceManager {
    constructor(bot) {
        this.bot = bot;
        this.knownResourceLocations = new Map();
        this.gatheringState = {
            isGathering: false,
            currentResource: null,
            patience: 100, // Controls how long the bot will wait before changing strategy
            lastActionTime: Date.now()
        };
    }

    async checkInventory(requiredMaterials) {
        const inventory = {};
        for (const [material, amount] of Object.entries(requiredMaterials)) {
            const item = this.bot.mcData.itemsByName[material];
            if (!item) continue;
            
            const found = this.bot.inventory.items().filter(i => i.name === material);
            inventory[material] = found.reduce((acc, curr) => acc + curr.count, 0);
        }
        return inventory;
    }

    async findResources(material) {
        const blockType = this.bot.mcData.blocksByName[material];
        if (!blockType) return null;

        // Search in increasing radius
        for (let radius = 16; radius <= 128; radius *= 2) {
            const blocks = this.bot.findBlocks({
                matching: blockType.id,
                maxDistance: radius,
                count: 10
            });

            if (blocks.length > 0) {
                // Store locations for future reference
                blocks.forEach(pos => {
                    this.knownResourceLocations.set(pos.toString(), {
                        material,
                        position: pos,
                        lastSeen: Date.now()
                    });
                });
                return blocks[0];
            }
        }
        return null;
    }

    async gatherResource(material, amount) {
        try {
            this.gatheringState.isGathering = true;
            this.gatheringState.currentResource = material;
            this.bot.chat(`Looking for ${material}...`);

            const position = await this.findResources(material);
            if (!position) {
                this.bot.chat(`I couldn't find any ${material} nearby.`);
                return false;
            }

            // Move to resource
            await this.bot.pathfinder.goto(new goals.GoalNear(position.x, position.y, position.z, 2));

            // Collect the resource
            const block = this.bot.blockAt(position);
            if (!block) return false;

            await this.bot.dig(block);
            this.bot.chat(`Got some ${material}!`);

            // Update gathering state
            this.gatheringState.lastActionTime = Date.now();
            return true;

        } catch (error) {
            console.error('Error gathering resource:', error);
            return false;
        } finally {
            this.gatheringState.isGathering = false;
        }
    }

    async waitForResources(requiredMaterials, maxWaitTime = 300000) { // 5 minutes default
        const startTime = Date.now();
        this.gatheringState.patience = 100; // Reset patience

        while (Date.now() - startTime < maxWaitTime) {
            // Check if we have all materials
            const inventory = await this.checkInventory(requiredMaterials);
            const missingMaterials = Object.entries(requiredMaterials)
                .filter(([material, amount]) => (inventory[material] || 0) < amount);

            if (missingMaterials.length === 0) {
                return true;
            }

            // Decide whether to wait or gather
            this.gatheringState.patience -= 5;
            if (this.gatheringState.patience <= 0) {
                this.bot.chat("I think I'll try gathering materials myself instead of waiting.");
                
                // Try gathering each missing material
                for (const [material, amount] of missingMaterials) {
                    await this.gatherResource(material, amount);
                }
                
                // Reset patience after attempting to gather
                this.gatheringState.patience = 100;
            } else {
                this.bot.chat(`Still waiting for materials... (patience: ${this.gatheringState.patience})`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            }
        }

        return false;
    }

    shouldChangeStrategy() {
        // Change strategy if:
        // 1. Been waiting too long
        // 2. Random chance based on low patience
        // 3. No progress in gathering
        
        const timeSinceLastAction = Date.now() - this.gatheringState.lastActionTime;
        const randomChange = Math.random() < (1 - this.gatheringState.patience / 100);
        
        return timeSinceLastAction > 60000 || randomChange;
    }
}

export default ResourceManager;