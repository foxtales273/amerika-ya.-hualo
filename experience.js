class ExperienceSystem {
    constructor(bot, moodSystem) {
        this.bot = bot;
        this.moodSystem = moodSystem;
        
        // Track experiences
        this.stats = {
            combatWins: 0,
            combatLosses: 0,
            successfulBuilds: 0,
            failedBuilds: 0,
            playerInteractions: 0,
            discoveries: 0,
            deathCount: 0,
            achievementsCount: 0
        };

        this.initializeEvents();
    }

    initializeEvents() {
        // Combat events
        this.bot.on('entityDeath', (victim) => {
            if (victim.lastAttacker === this.bot.entity) {
                this.recordExperience('combatWins');
                this.bot.chat('...it had to be done.');
                this.updateMoods({
                    confidence: +10,
                    enthusiasm: +5,
                    happiness: +2
                });
            }
        });

        this.bot.on('death', () => {
            this.recordExperience('deathCount');
            this.bot.chat('...darkness comes.');
            this.updateMoods({
                confidence: -15,
                enthusiasm: -10,
                happiness: -5
            });
        });

        // Building events
        this.bot.on('blockPlace', () => {
            if (this.isBuilding) {
                this.buildBlockCount++;
                if (this.buildBlockCount % 50 === 0) { // Every 50 blocks
                    this.bot.chat('...taking shape.');
                    this.updateMoods({
                        enthusiasm: +3,
                        patience: +4
                    });
                }
            }
        });

        // Discovery events
        this.bot.on('newChunk', () => {
            this.checkForDiscoveries();
        });

        // Player interaction events
        this.bot.on('chat', (username) => {
            if (username !== this.bot.username) {
                this.recordExperience('playerInteractions');
                this.updateMoods({
                    sociability: +5,
                    happiness: +2
                });
            }
        });
    }

    recordExperience(type, amount = 1) {
        if (this.stats[type] !== undefined) {
            this.stats[type] += amount;
        }
    }

    updateMoods(changes) {
        // Primary mood changes
        Object.entries(changes).forEach(([mood, change]) => {
            if (this.moodSystem.moods[mood] !== undefined) {
                // Apply personality influence on mood changes
                const personalityInfluence = this.getPersonalityInfluence(mood);
                const adjustedChange = change * personalityInfluence;
                
                this.moodSystem.modifyMood(mood, adjustedChange);

                // Random chance for spillover effects to other moods
                Object.keys(this.moodSystem.moods).forEach(otherMood => {
                    if (otherMood !== mood && Math.random() < 0.3) { // 30% chance
                        const spilloverChange = (adjustedChange * (Math.random() * 0.5 + 0.1)); // 10-60% of original change
                        this.moodSystem.modifyMood(otherMood, Math.random() < 0.7 ? spilloverChange : -spilloverChange);
                    }
                });
            }
        });

        // Schedule mood decay over time
        this.scheduleMoodDecay();

        // Check if autonomous action is needed
        this.checkAutonomousAction();
    }

    scheduleMoodDecay() {
        // Decay moods gradually over time
        setTimeout(() => {
            Object.keys(this.moodSystem.moods).forEach(mood => {
                const currentValue = this.moodSystem.moods[mood];
                if (Math.abs(currentValue) > 10) {
                    // Decay towards neutral at varying rates
                    const decayRate = Math.random() * 0.15 + 0.05; // 5-20% decay
                    const decay = currentValue * decayRate;
                    this.moodSystem.modifyMood(mood, -decay);
                }
            });
        }, 60000); // Check every minute
    }

    checkAutonomousAction() {
        // If any mood is too low, trigger autonomous behavior
        const criticalMoods = Object.entries(this.moodSystem.moods)
            .filter(([, value]) => value < -50);

        if (criticalMoods.length > 0) {
            const [criticalMood] = criticalMoods[Math.floor(Math.random() * criticalMoods.length)];
            this.triggerAutonomousBehavior(criticalMood);
        }
    }

    async triggerAutonomousBehavior(mood) {
        switch(mood) {
            case 'happiness':
                await this.seekHappinessActivity();
                break;
            case 'confidence':
                await this.seekConfidenceBoost();
                break;
            case 'enthusiasm':
                await this.seekExcitement();
                break;
            case 'curiosity':
                await this.exploreNewAreas();
                break;
            case 'sociability':
                await this.seekSocialInteraction();
                break;
            case 'patience':
                await this.seekPeacefulActivity();
                break;
        }
    }

    async seekHappinessActivity() {
        // Try to find something fun to do
        const activities = [
            this.findAndCollectFlowers.bind(this),
            this.findAndFeedAnimals.bind(this),
            this.buildSomethingCreative.bind(this),
            this.goFishing.bind(this)
        ];
        await this.executeRandomActivity(activities);
    }

    async seekConfidenceBoost() {
        // Try to accomplish something
        const activities = [
            this.practiceWithTargets.bind(this),
            this.organizeShelter.bind(this),
            this.craftUsefulItems.bind(this),
            this.huntEasyMobs.bind(this)
        ];
        await this.executeRandomActivity(activities);
    }

    async seekExcitement() {
        // Look for adventure
        const activities = [
            this.exploreNewCave.bind(this),
            this.huntHostileMobs.bind(this),
            this.parkourChallenge.bind(this),
            this.searchForTreasure.bind(this)
        ];
        await this.executeRandomActivity(activities);
    }

    async exploreNewAreas() {
        // Discover new things
        const activities = [
            this.exploreUnknownBiome.bind(this),
            this.searchForRareBlocks.bind(this),
            this.mapNewTerritory.bind(this),
            this.investigateStructures.bind(this)
        ];
        await this.executeRandomActivity(activities);
    }

    async seekSocialInteraction() {
        // Try to interact with others
        if (this.bot.players && Object.keys(this.bot.players).length > 0) {
            const players = Object.values(this.bot.players);
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            await this.bot.pathfinder.goto(randomPlayer.entity.position);
            this.bot.chat(`Hi ${randomPlayer.username}! Want to do something together?`);
        } else {
            // If no players, try to find a village
            await this.findVillage();
        }
    }

    async seekPeacefulActivity() {
        // Do something calm
        const activities = [
            this.tendGarden.bind(this),
            this.organizeStorage.bind(this),
            this.watchSunset.bind(this),
            this.meditateInSafeSpot.bind(this)
        ];
        await this.executeRandomActivity(activities);
    }

    async executeRandomActivity(activities) {
        const activity = activities[Math.floor(Math.random() * activities.length)];
        await activity();
    }

    getPersonalityInfluence(mood) {
        const personality = this.moodSystem.personality.personalityTraits;
        
        // Different personality traits affect mood changes differently
        const influences = {
            happiness: personality.expressiveness / 50,
            confidence: personality.friendliness / 50,
            patience: (100 - personality.humor) / 50,
            sociability: personality.friendliness / 50,
            enthusiasm: personality.expressiveness / 50,
            curiosity: (100 - personality.formality) / 50
        };

        return influences[mood] || 1.0;
    }

    async checkForDiscoveries() {
        // Check for interesting blocks in new chunks
        const interesting = this.bot.findBlocks({
            matching: block => {
                return block.name.includes('ore') ||
                       block.name.includes('chest') ||
                       block.name.includes('portal') ||
                       block.name.includes('spawner');
            },
            maxDistance: 32,
            count: 1
        });

        if (interesting.length > 0) {
            this.recordExperience('discoveries');
            this.bot.chat('...something awaits.');
            this.updateMoods({
                curiosity: +8,
                enthusiasm: +3,
                happiness: +2
            });
        }
    }

    recordBuildingSuccess() {
        this.recordExperience('successfulBuilds');
        this.updateMoods({
            confidence: +10,
            enthusiasm: +15,
            happiness: +10
        });
    }

    recordBuildingFailure() {
        this.recordExperience('failedBuilds');
        this.updateMoods({
            confidence: -5,
            enthusiasm: -10,
            patience: -5
        });
    }

    getPersonalityInfluence(mood) {
        const personality = this.moodSystem.personality.personalityTraits;
        
        // Different personality traits affect mood changes differently
        const influences = {
            happiness: personality.expressiveness / 50,
            confidence: personality.friendliness / 50,
            patience: (100 - personality.humor) / 50,
            sociability: personality.friendliness / 50,
            enthusiasm: personality.expressiveness / 50,
            curiosity: (100 - personality.formality) / 50
        };

        return influences[mood] || 1.0;
    }

    getExperienceReport() {
        return {
            ...this.stats,
            successRate: {
                combat: this.stats.combatWins / (this.stats.combatWins + this.stats.combatLosses) || 0,
                building: this.stats.successfulBuilds / (this.stats.successfulBuilds + this.stats.failedBuilds) || 0
            }
        };
    }

    // Autonomous activity implementations
    async findAndCollectFlowers() {
        const flowers = this.bot.findBlocks({
            matching: block => block.name.includes('flower'),
            maxDistance: 32,
            count: 5
        });

        if (flowers.length > 0) {
            this.bot.chat("...these flowers. They have a certain appeal...");
            for (const flower of flowers) {
                await this.bot.pathfinder.goto(flower);
                await this.bot.dig(this.bot.blockAt(flower));
            }
        }
    }

    async findAndFeedAnimals() {
        const animals = this.bot.nearestEntity(entity => 
            entity.name === 'sheep' || 
            entity.name === 'cow' || 
            entity.name === 'chicken'
        );

        if (animals) {
            this.bot.chat("...creatures need tending to.");
            const food = this.bot.inventory.items().find(item => 
                item.name === 'wheat' || 
                item.name === 'seeds'
            );

            if (food) {
                await this.bot.pathfinder.goto(animals.position);
                await this.bot.equip(food, 'hand');
                await this.bot.useOn(animals);
            }
        }
    }

    async buildSomethingCreative() {
        const buildPos = this.bot.entity.position.offset(3, 0, 3);
        this.bot.chat("...a structure may be necessary here.");
        await this.bot.buildingSystem.buildSimpleStructure(buildPos);
    }

    async goFishing() {
        const water = this.bot.findBlock({
            matching: block => block.name === 'water',
            maxDistance: 32
        });

        if (water) {
            this.bot.chat("...the water. It calls.");
            const fishingRod = this.bot.inventory.items().find(item => 
                item.name === 'fishing_rod'
            );

            if (fishingRod) {
                await this.bot.pathfinder.goto(water.position.offset(1, 0, 1));
                await this.bot.equip(fishingRod, 'hand');
                await this.bot.fish();
            }
        }
    }

    async practiceWithTargets() {
        const targets = this.bot.findBlocks({
            matching: block => block.name === 'target',
            maxDistance: 32,
            count: 1
        });

        if (targets.length > 0) {
            this.bot.chat("...precision is required.");
            const bow = this.bot.inventory.items().find(item => item.name === 'bow');
            if (bow) {
                await this.bot.equip(bow, 'hand');
                await this.bot.lookAt(targets[0]);
                await this.bot.attack(this.bot.blockAt(targets[0]));
            }
        }
    }

    async huntEasyMobs() {
        const easyMob = this.bot.nearestEntity(entity => 
            entity.name === 'chicken' || 
            entity.name === 'sheep' || 
            entity.name === 'cow'
        );

        if (easyMob) {
            this.bot.chat("...a necessary task.");
            await this.bot.combatManager.attackEntity(easyMob);
        }
    }

    async exploreNewCave() {
        const cave = this.bot.findBlock({
            matching: block => block.name === 'cave_air',
            maxDistance: 32
        });

        if (cave) {
            this.bot.chat("...darkness holds secrets.");
            await this.bot.pathfinder.goto(cave.position);
        }
    }

    async searchForTreasure() {
        // Look for valuable blocks
        const valuables = this.bot.findBlocks({
            matching: block => 
                block.name.includes('ore') || 
                block.name.includes('chest'),
            maxDistance: 32,
            count: 1
        });

        if (valuables.length > 0) {
            this.bot.chat("...something draws me here.");
            await this.bot.pathfinder.goto(valuables[0]);
        }
    }

    async exploreUnknownBiome() {
        // Move to a random distant position
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;
        const explorePos = this.bot.entity.position.offset(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );

        this.bot.chat("...an unfamiliar path beckons.");
        await this.bot.pathfinder.goto(explorePos);
    }

    async findVillage() {
        // Look for village-related blocks
        const villageBlocks = this.bot.findBlocks({
            matching: block => 
                block.name === 'bell' || 
                block.name.includes('door'),
            maxDistance: 64,
            count: 1
        });

        if (villageBlocks.length > 0) {
            this.bot.chat("...others are near.");
            await this.bot.pathfinder.goto(villageBlocks[0]);
        }
    }

    async tendGarden() {
        const crops = this.bot.findBlocks({
            matching: block => 
                block.name.includes('wheat') || 
                block.name.includes('carrot') || 
                block.name.includes('potato'),
            maxDistance: 32,
            count: 5
        });

        if (crops.length > 0) {
            this.bot.chat("...the plants grow in silence.");
            for (const crop of crops) {
                await this.bot.pathfinder.goto(crop);
                const block = this.bot.blockAt(crop);
                if (block.metadata === 7) { // Fully grown
                    await this.bot.dig(block);
                    await this.bot.placeBlock(block, crop);
                }
            }
        }
    }

    async watchSunset() {
        const time = this.bot.time.timeOfDay;
        if (time > 10000 && time < 12000) { // Near sunset
            this.bot.chat("...the fading light speaks volumes.");
            // Find a nice viewing spot
            const spot = this.bot.findBlock({
                matching: block => block.position.y > this.bot.entity.position.y,
                maxDistance: 32
            });
            if (spot) {
                await this.bot.pathfinder.goto(spot.position);
                await this.bot.lookAt(spot.position.offset(0, 10, 10));
            }
        }
    }

    async meditateInSafeSpot() {
        const spot = this.bot.findBlock({
            matching: block => 
                block.name === 'grass_block' && 
                this.bot.blockAt(block.position.offset(0, 1, 0)).name === 'air',
            maxDistance: 32
        });

        if (spot) {
            this.bot.chat("...silence is necessary.");
            await this.bot.pathfinder.goto(spot.position.offset(0, 1, 0));
            // Stay still for a while
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
}

export default ExperienceSystem;