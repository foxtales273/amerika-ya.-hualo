class InventoryManager {
    constructor(bot, chestManager) {
        this.bot = bot;
        this.chestManager = chestManager;
        this.shulkerContents = new Map(); // Track contents of shulker boxes in inventory
        this.enderChestContents = new Map(); // Track contents of last opened ender chest
        
        // List of all shulker box types
        this.shulkerTypes = [
            'shulker_box',
            'white_shulker_box',
            'orange_shulker_box',
            'magenta_shulker_box',
            'light_blue_shulker_box',
            'yellow_shulker_box',
            'lime_shulker_box',
            'pink_shulker_box',
            'gray_shulker_box',
            'light_gray_shulker_box',
            'cyan_shulker_box',
            'purple_shulker_box',
            'blue_shulker_box',
            'brown_shulker_box',
            'green_shulker_box',
            'red_shulker_box',
            'black_shulker_box'
        ];

        this.valuableItems = new Set([
            'diamond', 'emerald', 'iron_ingot', 'gold_ingot',
            'netherite', 'ancient_debris', 'enchanted_book',
            'diamond_sword', 'diamond_pickaxe', 'diamond_axe',
            'elytra', 'shulker_box'
        ]);

        this.toolItems = new Set([
            'wooden_sword', 'stone_sword', 'iron_sword', 'diamond_sword',
            'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe',
            'wooden_axe', 'stone_axe', 'iron_axe', 'diamond_axe',
            'wooden_shovel', 'stone_shovel', 'iron_shovel', 'diamond_shovel'
        ]);

        // Check inventory periodically
        setInterval(() => this.checkInventory(), 30000); // Every 30 seconds
    }

    isValuable(item) {
        return this.valuableItems.has(item.name) || 
               item.enchants?.length > 0 ||
               this.toolItems.has(item.name);
    }

    async checkInventory() {
        const inventory = this.bot.inventory.items();
        
        // Check if inventory is near full (>80%)
        if (inventory.length > this.bot.inventory.slots.length * 0.8) {
            await this.organizeInventory();
        }
    }

    async openShulkerBox(shulkerItem) {
        if (!this.isShulkerBox(shulkerItem)) return null;

        try {
            // Place shulker box
            const placementPos = this.bot.entity.position.offset(0, 1, 0);
            await this.bot.placeBlock(shulkerItem, placementPos);

            // Open the placed shulker box
            const shulkerBlock = this.bot.blockAt(placementPos);
            const container = await this.bot.openContainer(shulkerBlock);

            // Store contents in memory
            this.shulkerContents.set(shulkerItem.id, container.items());

            // Break and collect the shulker box
            await container.close();
            await this.bot.dig(shulkerBlock);

            return this.shulkerContents.get(shulkerItem.id);
        } catch (err) {
            console.log('Failed to access shulker box:', err);
            return null;
        }
    }

    async accessEnderChest() {
        const enderChest = this.bot.findBlock({
            matching: this.bot.registry.blocksByName.ender_chest.id,
            maxDistance: 32
        });

        if (!enderChest) {
            this.bot.chat("Can't find an ender chest!");
            return null;
        }

        try {
            const container = await this.bot.openContainer(enderChest);
            this.enderChestContents = container.items();
            return container;
        } catch (err) {
            console.log('Failed to access ender chest:', err);
            return null;
        }
    }

    isShulkerBox(item) {
        return item && this.shulkerTypes.includes(item.name);
    }

    getShulkerContents(shulkerId) {
        return this.shulkerContents.get(shulkerId) || [];
    }

    getEnderChestContents() {
        return this.enderChestContents || [];
    }

    async storeInShulker(items, shulkerItem) {
        if (!this.isShulkerBox(shulkerItem)) return false;

        try {
            const container = await this.openShulkerBox(shulkerItem);
            if (!container) return false;

            for (const item of items) {
                await container.deposit(item.type, null, item.count);
            }

            return true;
        } catch (err) {
            console.log('Failed to store items in shulker:', err);
            return false;
        }
    }

    async storeInEnderChest(items) {
        const container = await this.accessEnderChest();
        if (!container) return false;

        try {
            for (const item of items) {
                await container.deposit(item.type, null, item.count);
            }
            await container.close();
            return true;
        } catch (err) {
            console.log('Failed to store items in ender chest:', err);
            return false;
        }
    }

    async organizeInventory() {
        const inventory = this.bot.inventory.items();
        const itemsToStore = [];
        const itemsToDrop = [];

        // Find shulker boxes in inventory
        const shulkerBoxes = inventory.filter(item => this.isShulkerBox(item));

        // Categorize items
        for (const item of inventory) {
            if (this.isValuable(item)) {
                itemsToStore.push(item);
            } else {
                // Keep some basic blocks and items
                if (item.count > 32) {
                    // Keep only 32 of non-valuable items
                    const toDropCount = item.count - 32;
                    itemsToDrop.push({...item, count: toDropCount});
                }
            }
        }

        // Try to store valuable items
        if (itemsToStore.length > 0) {
            const nearestChest = await this.chestManager.findChest(10);
            if (nearestChest) {
                await this.chestManager.depositItems(itemsToStore, nearestChest);
                this.bot.chat("I've stored some valuable items in a chest.");
            }
        }

        // Drop excess items
        for (const item of itemsToDrop) {
            await this.bot.toss(item.type, null, item.count);
        }
    }

    // Function to evaluate item value based on context and usage history
    evaluateItemValue(item) {
        // Base value for valuable items
        if (this.isValuable(item)) return 100;

        // Value common building blocks moderately
        const buildingBlocks = ['stone', 'dirt', 'wood', 'cobblestone'];
        if (buildingBlocks.includes(item.name)) return 50;

        // Lower value for very common items
        return 25;
    }
}

export default InventoryManager;