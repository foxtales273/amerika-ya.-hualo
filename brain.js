class BotBrain {
    constructor(bot, aiSystem, buildingSystem, inventoryManager, healthManager, combatManager) {
        this.bot = bot;
        this.aiSystem = aiSystem;
        this.buildingSystem = buildingSystem;
        this.inventoryManager = inventoryManager;
        this.healthManager = healthManager;
        this.combatManager = combatManager;
        
        // Bot's needs and states
        this.needs = {
            health: 100,
            hunger: 100,
            safety: 100,
            shelter: 100,
            gear: 100,
            resources: 100
        };

        // Bot's personality traits (randomized)
        this.personality = {
            bravery: Math.random() * 100,
            curiosity: Math.random() * 100,
            helpfulness: Math.random() * 100,
            resourcefulness: Math.random() * 100,
            creativity: Math.random() * 100
        };

        // Current goal and memory
        this.currentGoal = null;
        this.memory = {
            lastMeal: Date.now(),
            dangerousAreas: new Set(),
            safeSpots: new Set(),
            resourceLocations: new Map(),
            lastActions: []
        };

        // Initialize state monitoring
        this.initializeStateMonitoring();
    }

    initializeStateMonitoring() {
        // Monitor health and hunger
        setInterval(() => this.updateNeeds(), 1000);

        // Monitor surroundings
        setInterval(() => this.checkSurroundings(), 2000);

        // Decision making
        setInterval(() => this.makeDecision(), 5000);
    }

    updateNeeds() {
        // Update health need
        this.needs.health = (this.bot.health / 20) * 100;
        
        // Update hunger need
        this.needs.hunger = (this.bot.food / 20) * 100;

        // Update safety need based on nearby threats
        const nearbyThreats = this.bot.nearestEntity(entity => 
            entity.type === 'mob' || 
            (entity.type === 'player' && entity !== this.bot.entity)
        );
        this.needs.safety = nearbyThreats ? 
            Math.max(0, 100 - (1 / this.bot.entity.position.distanceTo(nearbyThreats.position) * 100)) : 
            100;

        // Update gear need based on equipment status
        const armor = this.bot.inventory.slots.slice(5, 9).filter(Boolean).length;
        this.needs.gear = (armor / 4) * 100;

        // Update resources need
        const inventoryFullness = this.bot.inventory.items().length / this.bot.inventory.slots.length;
        this.needs.resources = (inventoryFullness * 100);

        // Update shelter need based on time and weather
        const isNight = this.bot.time.timeOfDay >= 13000;
        const isRaining = this.bot.isRaining;
        this.needs.shelter = isNight || isRaining ? 50 : 100;
    }

    checkSurroundings() {
        // Look for valuable resources
        const blocks = this.bot.findBlocks({
            matching: block => {
                return block.name.includes('ore') || 
                       block.name.includes('chest') ||
                       block.name.includes('diamond') ||
                       block.name.includes('enchant');
            },
            maxDistance: 32,
            count: 5
        });

        blocks.forEach(pos => {
            this.memory.resourceLocations.set(pos.toString(), {
                type: this.bot.blockAt(pos).name,
                position: pos,
                found: Date.now()
            });
        });

        // Update dangerous areas based on recent damage
        if (this.bot.health < this.lastHealth) {
            this.memory.dangerousAreas.add(this.bot.entity.position.toString());
        }
        this.lastHealth = this.bot.health;

        // Mark safe spots when health regenerates
        if (this.bot.health > this.lastHealth) {
            this.memory.safeSpots.add(this.bot.entity.position.toString());
        }
    }

    async makeDecision() {
        // Don't make autonomous decisions if following a player
        if (this.bot.following) return;

        // Get the most urgent need
        const urgentNeed = Object.entries(this.needs)
            .sort(([, a], [, b]) => a - b)[0];

        // Act based on most urgent need
        switch (urgentNeed[0]) {
            case 'health':
                if (urgentNeed[1] < 70) {
                    await this.handleHealthNeed();
                }
                break;

            case 'hunger':
                if (urgentNeed[1] < 60) {
                    await this.handleHungerNeed();
                }
                break;

            case 'safety':
                if (urgentNeed[1] < 50) {
                    await this.handleSafetyNeed();
                }
                break;

            case 'shelter':
                if (urgentNeed[1] < 40) {
                    await this.handleShelterNeed();
                }
                break;

            case 'gear':
                if (urgentNeed[1] < 75) {
                    await this.handleGearNeed();
                }
                break;

            case 'resources':
                if (urgentNeed[1] < 30) {
                    await this.handleResourceNeed();
                }
                break;
        }

        // If all needs are satisfied, engage in proactive behavior
        if (Object.values(this.needs).every(need => need > 80)) {
            await this.proactiveBehavior();
        }
    }

    async handleHealthNeed() {
        if (this.needs.safety < 50) {
            // If in danger, retreat first
            await this.healthManager.tacticalRetreatAndHeal();
        } else {
            // Otherwise, try to heal
            await this.healthManager.checkStatus(true);
        }
    }

    async handleHungerNeed() {
        this.bot.chat("I'm getting hungry, looking for food...");
        await this.healthManager.searchForFood();
    }

    async handleSafetyNeed() {
        const threat = this.bot.nearestEntity(e => 
            e.type === 'mob' || 
            (e.type === 'player' && e !== this.bot.entity)
        );

        if (threat) {
            if (this.personality.bravery > 70 && this.needs.health > 80) {
                this.bot.chat("I'll take care of this threat!");
                await this.combatManager.attackEntity(threat);
            } else {
                this.bot.chat("Better to avoid this fight...");
                await this.healthManager.tacticalRetreatAndHeal();
            }
        }
    }

    async handleShelterNeed() {
        this.bot.chat("I should build a shelter here.");
        const buildPos = this.bot.entity.position.offset(2, 0, 2);
        await this.buildingSystem.buildHouse(buildPos);
    }

    async handleGearNeed() {
        this.bot.chat("I should improve my equipment.");
        await this.inventoryManager.equipBestGear();
        
        // Try to enchant gear if possible
        const enchantTable = this.bot.findBlock({
            matching: this.bot.registry.blocksByName.enchanting_table.id,
            maxDistance: 32
        });
        
        if (enchantTable) {
            this.bot.chat("Found an enchanting table, let's enhance my gear!");
            await this.enchantmentManager.enchantBestItems();
        }
    }

    async handleResourceNeed() {
        // Look for valuable resources from memory
        const recentResources = Array.from(this.memory.resourceLocations.values())
            .filter(res => Date.now() - res.found < 300000) // Resources found in last 5 minutes
            .sort((a, b) => b.found - a.found);

        if (recentResources.length > 0) {
            const target = recentResources[0];
            this.bot.chat(`I remember seeing ${target.type} nearby. Going to collect it!`);
            await this.bot.pathfinder.goto(target.position);
        } else {
            // If no known resources, explore
            const explorePos = this.bot.entity.position.offset(
                (Math.random() - 0.5) * 50,
                0,
                (Math.random() - 0.5) * 50
            );
            this.bot.chat("Going to explore for resources!");
            await this.bot.pathfinder.goto(explorePos);
        }
    }

    async proactiveBehavior() {
        // Choose a random activity based on personality
        const roll = Math.random() * 100;
        
        if (roll < this.personality.curiosity) {
            // Explore new areas
            const explorePos = this.bot.entity.position.offset(
                (Math.random() - 0.5) * 100,
                0,
                (Math.random() - 0.5) * 100
            );
            this.bot.chat("I wonder what's out there...");
            await this.bot.pathfinder.goto(explorePos);
        }
        else if (roll < this.personality.creativity) {
            // Build something interesting
            this.bot.chat("I feel like building something!");
            const buildPos = this.bot.entity.position.offset(5, 0, 5);
            const builds = ['house', 'tower', 'garden'];
            const randomBuild = builds[Math.floor(Math.random() * builds.length)];
            await this.buildingSystem.buildCustom(randomBuild, buildPos);
        }
        else if (roll < this.personality.resourcefulness) {
            // Organize and improve base
            this.bot.chat("Time to organize my resources.");
            await this.inventoryManager.organizeInventory();
        }
        else {
            // Patrol and protect area
            this.bot.chat("I'll patrol the area to keep it safe.");
            const patrolRadius = 20;
            const patrolPos = this.bot.entity.position.offset(
                Math.cos(Date.now() / 1000) * patrolRadius,
                0,
                Math.sin(Date.now() / 1000) * patrolRadius
            );
            await this.bot.pathfinder.goto(patrolPos);
        }
    }

    // Helper method to remember recent actions
    rememberAction(action) {
        this.memory.lastActions.unshift({
            action,
            time: Date.now()
        });
        // Keep only last 10 actions
        this.memory.lastActions = this.memory.lastActions.slice(0, 10);
    }

    // Get bot's current emotional state based on needs and personality
    getEmotionalState() {
        const averageNeeds = Object.values(this.needs).reduce((a, b) => a + b, 0) / 6;
        let emotion = 'content';

        if (averageNeeds < 30) emotion = 'distressed';
        else if (averageNeeds < 50) emotion = 'concerned';
        else if (averageNeeds < 70) emotion = 'focused';
        else if (averageNeeds > 90) emotion = 'happy';

        return emotion;
    }
}

export default BotBrain;