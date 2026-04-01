class EnchantmentManager {
    constructor(bot, inventoryManager) {
        this.bot = bot;
        this.inventoryManager = inventoryManager;
        this.enchantableItems = [
            'sword', 'axe', 'pickaxe', 'shovel', 'hoe',
            'helmet', 'chestplate', 'leggings', 'boots',
            'bow', 'fishing_rod', 'trident', 'crossbow'
        ];
    }

    async findEnchantingTable() {
        return this.bot.findBlock({
            matching: this.bot.registry.blocksByName.enchanting_table.id,
            maxDistance: 32
        });
    }

    async findLapisLazuli() {
        return this.bot.inventory.items().find(item => item.name === 'lapis_lazuli');
    }

    async enchantItem(item, levelRequired = 30) {
        const enchantingTable = await this.findEnchantingTable();
        if (!enchantingTable) {
            this.bot.chat("Can't find an enchanting table!");
            return false;
        }

        try {
            // Open enchanting table
            const enchantingBlock = await this.bot.openEnchantmentTable(enchantingTable);

            // Check for lapis lazuli
            const lapis = await this.findLapisLazuli();
            if (!lapis) {
                this.bot.chat("Need lapis lazuli for enchanting!");
                enchantingBlock.close();
                return false;
            }

            // Wait for enchantments to be available
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get available enchantments
            const slots = enchantingBlock.enchantments;
            if (!slots || slots.length === 0) {
                this.bot.chat("No enchantments available!");
                enchantingBlock.close();
                return false;
            }

            // Find best available enchantment
            const bestSlot = slots.reduce((best, current, index) => {
                return (current.level > best.level) ? { level: current.level, index } : best;
            }, { level: 0, index: 0 });

            // If we have a good enough enchantment, use it
            if (bestSlot.level >= levelRequired) {
                await enchantingBlock.enchant(bestSlot.index);
                this.bot.chat(`Enchanted ${item.name} with level ${bestSlot.level} enchantment!`);
                enchantingBlock.close();
                return true;
            } else {
                this.bot.chat(`No good enchantments available (highest: ${bestSlot.level})`);
                enchantingBlock.close();
                return false;
            }

        } catch (err) {
            console.log('Failed to enchant:', err);
            return false;
        }
    }

    isEnchantable(item) {
        if (!item) return false;
        return this.enchantableItems.some(type => item.name.includes(type));
    }

    async enchantBestItems() {
        const items = this.bot.inventory.items();
        let enchanted = false;

        for (const item of items) {
            if (this.isEnchantable(item) && !item.enchants) {
                this.bot.chat(`Attempting to enchant ${item.name}...`);
                const success = await this.enchantItem(item);
                if (success) enchanted = true;
            }
        }

        if (!enchanted) {
            this.bot.chat("No items to enchant or couldn't enchant any items!");
        }
    }

    getEnchantmentInfo(item) {
        if (!item || !item.enchants) return "No enchantments";
        
        return Object.entries(item.enchants)
            .map(([enchant, level]) => `${enchant} ${level}`)
            .join(", ");
    }
}

export default EnchantmentManager;