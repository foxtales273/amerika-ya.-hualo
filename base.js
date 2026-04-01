import Vec3 from 'vec3';

class BaseManager {
    constructor(bot) {
        this.bot = bot;
        this.baseLocation = null;
        this.baseRadius = 32;
        this.landmarks = new Map(); // name -> position
        this.activities = new Map();
        this.currentActivity = null;
        this.initialized = false;
        
        this.setupActivities();
    }

    setupActivities() {
        this.activities.set('fishing', {
            name: 'fishing',
            canDo: () => this.hasItem('fishing_rod'),
            start: () => this.startFishing(),
            stop: () => this.stopFishing()
        });

        this.activities.set('farming', {
            name: 'farming',
            canDo: () => this.hasLandmark('farm'),
            start: () => this.tendFarm(),
            stop: () => this.stopFarming()
        });

        this.activities.set('mining', {
            name: 'mining',
            canDo: () => this.hasLandmark('stone_generator'),
            start: () => this.startMining(),
            stop: () => this.stopMining()
        });

        this.activities.set('building', {
            name: 'building',
            canDo: () => true, // Can always try to build something
            start: () => this.randomBuild(),
            stop: () => this.stopBuilding()
        });

        this.activities.set('animal_care', {
            name: 'animal_care',
            canDo: () => this.hasLandmark('animal_pen'),
            start: () => this.careForAnimals(),
            stop: () => this.stopAnimalCare()
        });

        this.activities.set('exploring', {
            name: 'exploring',
            canDo: () => true,
            start: () => this.exploreBase(),
            stop: () => this.stopExploring()
        });
    }

    setBase(position) {
        this.baseLocation = position.clone();
        this.bot.chat("I've set this location as my base!");
        this.initialized = true;
    }

    addLandmark(name, position) {
        this.landmarks.set(name, position.clone());
        this.bot.chat(`Added ${name} to my landmarks!`);
    }

    hasLandmark(name) {
        return this.landmarks.has(name);
    }

    async chooseRandomActivity() {
        if (!this.initialized) return;

        // Filter available activities
        const availableActivities = Array.from(this.activities.values())
            .filter(activity => activity.canDo());

        if (availableActivities.length === 0) return;

        // Stop current activity if any
        if (this.currentActivity) {
            await this.currentActivity.stop();
        }

        // Choose random activity
        const activity = availableActivities[Math.floor(Math.random() * availableActivities.length)];
        this.currentActivity = activity;
        this.bot.chat(`I think I'll do some ${activity.name}!`);
        await activity.start();
    }

    async startFishing() {
        const waterBlock = this.findWaterBlock();
        if (!waterBlock) {
            this.bot.chat("I can't find any water to fish in!");
            return;
        }

        try {
            await this.bot.equip(this.bot.mcData.itemsByName.fishing_rod.id, 'hand');
            await this.bot.look(waterBlock.position.x, waterBlock.position.y, waterBlock.position.z);
            await this.bot.fish();
        } catch (error) {
            console.error('Fishing error:', error);
        }
    }

    async tendFarm() {
        const farmPos = this.landmarks.get('farm');
        if (!farmPos) return;

        try {
            // Find crops that need tending
            const crops = this.bot.findBlocks({
                matching: block => {
                    return block.name.includes('wheat') || 
                           block.name.includes('carrots') || 
                           block.name.includes('potatoes');
                },
                count: 50,
                point: farmPos
            });

            for (const crop of crops) {
                const block = this.bot.blockAt(crop);
                if (block.metadata === 7) { // Fully grown
                    await this.bot.dig(block);
                    await this.bot.placeBlock(block.position, block.type);
                }
            }
        } catch (error) {
            console.error('Farming error:', error);
        }
    }

    async startMining() {
        const generatorPos = this.landmarks.get('stone_generator');
        if (!generatorPos) return;

        try {
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                generatorPos.x, generatorPos.y, generatorPos.z
            ));
            
            // Mine stone as it generates
            while (this.currentActivity && this.currentActivity.name === 'mining') {
                const stone = this.bot.findBlock({
                    matching: this.bot.mcData.blocksByName.stone.id,
                    maxDistance: 4
                });
                
                if (stone) {
                    await this.bot.dig(stone);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            console.error('Mining error:', error);
        }
    }

    async careForAnimals() {
        const penPos = this.landmarks.get('animal_pen');
        if (!penPos) return;

        try {
            // Find animals
            const animals = this.bot.entities;
            for (const animal of Object.values(animals)) {
                if (animal.type === 'mob' && 
                    (animal.name === 'cow' || animal.name === 'sheep' || animal.name === 'chicken')) {
                    
                    if (animal.position.distanceTo(penPos) <= this.baseRadius) {
                        // Feed animals if we have appropriate food
                        if (this.hasItem('wheat') || this.hasItem('seeds')) {
                            await this.bot.lookAt(animal.position);
                            // Feed logic here
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Animal care error:', error);
        }
    }

    async exploreBase() {
        if (!this.baseLocation) return;

        try {
            // Generate random point within base radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.baseRadius;
            const x = this.baseLocation.x + Math.cos(angle) * distance;
            const z = this.baseLocation.z + Math.sin(angle) * distance;
            
            const goal = new this.bot.pathfinder.goals.GoalXZ(x, z);
            await this.bot.pathfinder.goto(goal);
        } catch (error) {
            console.error('Exploration error:', error);
        }
    }

    hasItem(itemName) {
        return this.bot.inventory.items().some(item => item.name === itemName);
    }

    isInBase(position) {
        if (!this.baseLocation) return false;
        return position.distanceTo(this.baseLocation) <= this.baseRadius;
    }

    async returnToBase() {
        if (!this.baseLocation) return;

        try {
            await this.bot.pathfinder.goto(new this.bot.pathfinder.goals.GoalBlock(
                this.baseLocation.x,
                this.baseLocation.y,
                this.baseLocation.z
            ));
        } catch (error) {
            console.error('Return to base error:', error);
        }
    }

    // Activity stop methods
    stopFishing() {
        // Cleanup fishing activity
    }

    stopFarming() {
        // Cleanup farming activity
    }

    stopMining() {
        // Cleanup mining activity
    }

    stopBuilding() {
        // Cleanup building activity
    }

    stopAnimalCare() {
        // Cleanup animal care activity
    }

    stopExploring() {
        // Cleanup exploring activity
    }
}

export default BaseManager;
