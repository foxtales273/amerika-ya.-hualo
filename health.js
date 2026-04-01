class HealthManager {
    constructor(bot, inventoryManager) {
        this.bot = bot;
        this.inventoryManager = inventoryManager;
        
        // Food items ranked by saturation and food points
        this.foodPriority = [
            'golden_carrot',
            'cooked_beef',
            'cooked_porkchop',
            'cooked_mutton',
            'cooked_chicken',
            'baked_potato',
            'bread',
            'cooked_cod',
            'cooked_salmon',
            'apple',
            'carrot',
            'potato',
            'melon_slice',
            'sweet_berries',
            'raw_beef',
            'raw_porkchop',
            'raw_chicken',
            'raw_mutton',
            'raw_cod',
            'raw_salmon'
        ];

        // Initialize health monitoring
        this.initializeHealthMonitoring();
    }

    initializeHealthMonitoring() {
        // Check health and hunger periodically
        setInterval(() => this.checkStatus(), 1000);

        // Monitor for damage
        this.bot.on('hurt', () => {
            this.checkStatus(true); // Immediate check when hurt
        });
    }

    async checkStatus(wasHurt = false) {
        // Check if we need to eat
        if (this.shouldEat() || (wasHurt && this.bot.food < 20)) {
            await this.eat();
        }

        // If health is critically low, build shelter and heal
        if (this.bot.health < 6) {
            await this.tacticalRetreatAndHeal();
            return;
        }

        // If health is low and we have food, stay still to regenerate
        if (this.bot.health < 10 && this.bot.food > 18) {
            // Stop current activity if we need to regenerate
            if (this.bot.pathfinder.isMoving()) {
                this.bot.pathfinder.setGoal(null);
                this.bot.chat("Stopping to regenerate health...");
            }
        }
    }

    shouldEat() {
        // Eat if hunger is below 14 (prevents health loss and allows sprinting)
        // or if health is low and we're not at full food points
        return this.bot.food < 14 || (this.bot.health < 15 && this.bot.food < 20);
    }

    async eat() {
        // Find best food in inventory
        const foodItem = this.findBestFood();
        if (!foodItem) {
            if (this.bot.food < 6) {
                this.bot.chat("I'm getting very hungry! Need food!");
            }
            return false;
        }

        try {
            // Equip food
            await this.bot.equip(foodItem, 'hand');
            
            // Start eating
            await this.bot.consume();
            return true;
        } catch (err) {
            console.log('Failed to eat:', err);
            return false;
        }
    }

    findBestFood() {
        // Look through food priority list
        for (const foodName of this.foodPriority) {
            const food = this.bot.inventory.items().find(item => item.name === foodName);
            if (food) return food;
        }
        return null;
    }

    getFoodLevel() {
        return {
            food: this.bot.food,
            saturation: this.bot.foodSaturation,
            health: this.bot.health
        };
    }

    async searchForFood() {
        // If we're very hungry, actively look for food
        if (this.bot.food < 6) {
            // First check for nearby animals that can be killed for food
            const nearbyAnimal = this.bot.nearestEntity(entity => {
                return entity.type === 'mob' && 
                    ['cow', 'pig', 'chicken', 'sheep'].includes(entity.name);
            });

            if (nearbyAnimal && this.bot.entity.position.distanceTo(nearbyAnimal.position) < 32) {
                this.bot.chat("Found a " + nearbyAnimal.name + " nearby, getting food!");
                await this.huntAnimal(nearbyAnimal);
                return;
            }

            // Check for berry bushes or other food sources
            const foodSource = this.bot.findBlock({
                matching: block => {
                    return block.name === 'sweet_berry_bush' || 
                           block.name === 'wheat' || 
                           block.name === 'carrots' ||
                           block.name === 'potatoes';
                },
                maxDistance: 32
            });

            if (foodSource) {
                this.bot.chat("Found some " + foodSource.name + ", getting food!");
                await this.harvestFood(foodSource);
            }
        }
    }

    async huntAnimal(animal) {
        try {
            // Move to animal
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalNear(
                animal.position.x,
                animal.position.y,
                animal.position.z,
                2
            ));

            // Attack until dead
            while (animal.isValid && animal.health > 0) {
                await this.bot.attack(animal);
                await this.bot.waitForTicks(10);
            }

            // Collect dropped items
            await new Promise(resolve => setTimeout(resolve, 1000));
            const items = this.bot.nearestEntity(entity => entity.type === 'object');
            if (items) {
                await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                    items.position.x,
                    items.position.y,
                    items.position.z
                ));
            }
        } catch (err) {
            console.log('Failed to hunt animal:', err);
        }
    }

    async harvestFood(foodBlock) {
        try {
            // Move to food source
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                foodBlock.position.x,
                foodBlock.position.y,
                foodBlock.position.z
            ));

            // Harvest
            await this.bot.dig(foodBlock);

            // For crops that need replanting (wheat, carrots, potatoes)
            if (['wheat', 'carrots', 'potatoes'].includes(foodBlock.name)) {
                const seeds = this.bot.inventory.items().find(item => {
                    return item.name === foodBlock.name + '_seeds' || item.name === foodBlock.name;
                });

                if (seeds) {
                    await this.bot.placeBlock(foodBlock, new this.bot.vec3(0, 1, 0));
                }
            }
        } catch (err) {
            console.log('Failed to harvest food:', err);
        }
    }

    async cookFood() {
        // Find a furnace
        const furnace = this.bot.findBlock({
            matching: this.bot.registry.blocksByName.furnace.id
        });

        if (!furnace) return;

        try {
            const furnaceBlock = await this.bot.openFurnace(furnace);

            // Find raw food in inventory
            const rawFood = this.bot.inventory.items().find(item => 
                item.name.startsWith('raw_') && 
                this.foodPriority.includes(item.name)
            );

            if (rawFood) {
                // Find fuel (coal, wood, etc.)
                const fuel = this.bot.inventory.items().find(item => 
                    item.name === 'coal' || 
                    item.name === 'charcoal' ||
                    item.name.endsWith('_planks')
                );

                if (fuel) {
                    await furnaceBlock.putFuel(fuel, 1);
                    await furnaceBlock.putInput(rawFood, 1);
                    
                    // Wait for cooking
                    await new Promise(resolve => setTimeout(resolve, 12000));
                    
                    // Collect cooked food
                    const output = furnaceBlock.outputItem();
                    if (output) {
                        await furnaceBlock.takeOutput();
                    }
                }
            }

            await furnaceBlock.close();
        } catch (err) {
            console.log('Failed to cook food:', err);
        }
    }

    async tacticalRetreatAndHeal() {
        this.bot.chat("Health critical! Retreating to build shelter...");
        
        // Find the nearest hostile entity to determine retreat direction
        const hostile = this.bot.nearestEntity(entity => 
            entity.type === 'mob' || 
            (entity.type === 'player' && entity !== this.bot.entity)
        );

        if (!hostile) return;

        try {
            // Calculate retreat position (opposite direction from hostile)
            const retreatVector = this.bot.entity.position.minus(hostile.position).normalize();
            const retreatPosition = this.bot.entity.position.plus(retreatVector.scaled(10));
            
            // Run to retreat position
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalNear(
                retreatPosition.x,
                retreatPosition.y,
                retreatPosition.z,
                2
            ));

            // Build emergency shelter
            await this.buildEmergencyShelter();

            // Heal up
            while (this.bot.health < 15) {
                if (this.shouldEat()) {
                    await this.eat();
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.bot.chat("Healed up! Ready to fight again!");

        } catch (err) {
            console.log('Failed tactical retreat:', err);
        }
    }

    async buildEmergencyShelter() {
        const buildMaterials = [
            'cobblestone',
            'dirt',
            'stone',
            'netherrack',
            'oak_planks'
        ];

        // Find building materials in inventory
        let buildBlock = null;
        for (const material of buildMaterials) {
            const blocks = this.bot.inventory.items().find(item => item.name === material);
            if (blocks) {
                buildBlock = blocks;
                break;
            }
        }

        if (!buildBlock) {
            this.bot.chat("No building materials! Taking cover...");
            return;
        }

        try {
            // Equip building blocks
            await this.bot.equip(buildBlock, 'hand');

            const pos = this.bot.entity.position;
            
            // Build 3x3x3 shelter around the bot
            for (let y = 0; y < 3; y++) {
                for (let x = -1; x <= 1; x++) {
                    for (let z = -1; z <= 1; z++) {
                        // Skip the ground level center block where the bot is standing
                        if (y === 0 && x === 0 && z === 0) continue;
                        
                        // Skip the center block at head level for visibility
                        if (y === 2 && x === 0 && z === 0) continue;

                        const blockPos = pos.offset(x, y, z);
                        await this.bot.placeBlock(buildBlock, blockPos);
                    }
                }
            }

            this.bot.chat("Shelter built! Healing...");

        } catch (err) {
            console.log('Failed to build shelter:', err);
        }
    }
}

export default HealthManager;