import Vec3 from 'vec3';

class ToolManager {
    constructor(bot) {
        this.bot = bot;
        this.toolMappings = {
            wooden: 1,
            stone: 2,
            iron: 3,
            diamond: 4,
            netherite: 5
        };
        
        // Tool efficiency mappings
        this.bestTools = {
            'stone': ['pickaxe'],
            'cobblestone': ['pickaxe'],
            'iron_ore': ['pickaxe'],
            'diamond_ore': ['pickaxe'],
            'dirt': ['shovel'],
            'grass_block': ['shovel'],
            'sand': ['shovel'],
            'gravel': ['shovel'],
            'oak_log': ['axe'],
            'birch_log': ['axe'],
            'spruce_log': ['axe'],
            'oak_planks': ['axe'],
            'wheat': ['hoe'],
            'carrots': ['hoe'],
            'potatoes': ['hoe']
        };

        // Crafting recipes for tools
        this.toolRecipes = {
            'wooden_pickaxe': {
                materials: { 'oak_planks': 3, 'stick': 2 },
                pattern: ['xxx', ' | ', ' | '],
                key: { 'x': 'oak_planks', '|': 'stick' }
            },
            'wooden_axe': {
                materials: { 'oak_planks': 3, 'stick': 2 },
                pattern: ['xx ', 'x| ', ' | '],
                key: { 'x': 'oak_planks', '|': 'stick' }
            },
            'wooden_shovel': {
                materials: { 'oak_planks': 1, 'stick': 2 },
                pattern: ['x', '|', '|'],
                key: { 'x': 'oak_planks', '|': 'stick' }
            },
            'wooden_hoe': {
                materials: { 'oak_planks': 2, 'stick': 2 },
                pattern: ['xx ', ' | ', ' | '],
                key: { 'x': 'oak_planks', '|': 'stick' }
            }
        };
    }

    async equipBestTool(block) {
        if (!block) return false;

        // Check if we need a tool for this block
        const requiredTools = this.bestTools[block.name] || [];
        if (requiredTools.length === 0) return true;

        // Find the best tool in inventory
        let bestTool = null;
        let bestScore = -1;

        for (const item of this.bot.inventory.items()) {
            if (!item.name.endsWith(requiredTools[0])) continue;

            const toolMaterial = item.name.split('_')[0];
            const score = this.toolMappings[toolMaterial] || 0;

            if (score > bestScore) {
                bestScore = score;
                bestTool = item;
            }
        }

        if (bestTool) {
            await this.bot.equip(bestTool, 'hand');
            return true;
        }

        // If no tool found, try to craft one
        return await this.craftBasicTool(requiredTools[0]);
    }

    async craftBasicTool(toolType) {
        const toolName = 'wooden_' + toolType;
        const recipe = this.toolRecipes[toolName];
        if (!recipe) return false;

        // Check if we have materials
        for (const [material, count] of Object.entries(recipe.materials)) {
            const available = this.bot.inventory.count(material);
            if (available < count) {
                // Try to gather materials
                await this.gatherToolMaterials(material, count - available);
                
                // Recheck after gathering
                if (this.bot.inventory.count(material) < count) {
                    this.bot.chat(`I need ${count - available} more ${material} to craft a ${toolName}`);
                    return false;
                }
            }
        }

        // Craft the tool
        try {
            const craftingTable = this.bot.findBlock({
                matching: this.bot.mcData.blocksByName['crafting_table'].id,
                maxDistance: 32
            });

            if (craftingTable) {
                await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                    craftingTable.position.x,
                    craftingTable.position.y,
                    craftingTable.position.z
                ));
            }

            await this.bot.craft(recipe, 1, craftingTable);
            this.bot.chat(`Crafted a ${toolName}!`);
            return true;
        } catch (error) {
            console.error('Error crafting tool:', error);
            return false;
        }
    }

    async gatherToolMaterials(material, count) {
        if (material === 'stick') {
            // Try to craft sticks from planks
            if (this.bot.inventory.count('oak_planks') >= 2) {
                try {
                    await this.bot.craft({ 
                        pattern: ['x', 'x'],
                        key: { 'x': 'oak_planks' }
                    }, Math.ceil(count / 4));
                    return true;
                } catch (error) {
                    console.error('Error crafting sticks:', error);
                }
            }
        } else if (material === 'oak_planks') {
            // Try to find and chop trees
            const log = this.bot.findBlock({
                matching: this.bot.mcData.blocksByName['oak_log'].id,
                maxDistance: 32
            });

            if (log) {
                try {
                    await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                        log.position.x,
                        log.position.y,
                        log.position.z
                    ));
                    await this.bot.dig(log);
                    
                    // Craft planks from logs
                    if (this.bot.inventory.count('oak_log') > 0) {
                        await this.bot.craft({
                            pattern: ['x'],
                            key: { 'x': 'oak_log' }
                        }, 1);
                    }
                    return true;
                } catch (error) {
                    console.error('Error gathering wood:', error);
                }
            }
        }
        return false;
    }

    async checkToolDurability() {
        const item = this.bot.heldItem;
        if (!item) return;

        // Check if item is a tool
        if (item.name.endsWith('pickaxe') || 
            item.name.endsWith('axe') || 
            item.name.endsWith('shovel') || 
            item.name.endsWith('hoe')) {
            
            // Calculate durability percentage
            const durabilityPercent = (item.durabilityMax - item.durability) / item.durabilityMax * 100;
            
            // If durability is less than 10%, try to craft a new tool
            if (durabilityPercent > 90) {
                this.bot.chat(`My ${item.name} is about to break. I should make a new one.`);
                const toolType = item.name.split('_')[1];
                await this.craftBasicTool(toolType);
            }
        }
    }
}

export default ToolManager;