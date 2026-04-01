import Vec3 from 'vec3';
import { complexBlueprints, buildingStyles } from './blueprints.js';
import ResourceManager from './resources.js';
import SchematicSystem from './schematics.js';

class BuildingSystem {
    constructor(bot) {
        this.bot = bot;
        this.resourceManager = new ResourceManager(bot);
        this.schematicSystem = new SchematicSystem(bot);
        this.currentBuildingTask = null;
        this.scanningState = {
            isScanning: false,
            player: null,
            cornerOne: null,
            cornerTwo: null
        };
        this.blueprints = {
            ...complexBlueprints,
            // Simple blueprints for basic builds
            house: {
                width: 5,
                length: 7,
                height: 4,
                materials: {
                    walls: 'oak_planks',
                    floor: 'oak_planks',
                    roof: 'oak_stairs',
                    windows: 'glass'
                }
            },
            tower: {
                width: 3,
                length: 3,
                height: 8,
                materials: {
                    walls: 'stone_bricks',
                    floor: 'stone',
                    roof: 'stone_brick_stairs',
                    windows: 'glass_pane'
                }
            }
        };
    }

    async buildHouse(location) {
        const blueprint = this.blueprints.house;
        try {
            // Check creative mode
            if (!this.bot.creative) {
                this.bot.chat("I need creative mode to build efficiently!");
                return false;
            }

            // Build foundation
            await this.buildFoundation(location, blueprint.width, blueprint.length, blueprint.materials.floor);
            
            // Build walls
            await this.buildWalls(location, blueprint.width, blueprint.length, blueprint.height, blueprint.materials.walls);
            
            // Add windows
            await this.addWindows(location, blueprint.width, blueprint.length, blueprint.height, blueprint.materials.windows);
            
            // Build roof
            await this.buildRoof(location, blueprint.width, blueprint.length, blueprint.height, blueprint.materials.roof);
            
            this.bot.chat("I've finished building the house!");
            return true;
        } catch (error) {
            console.error('Building error:', error);
            this.bot.chat("I encountered an error while building.");
            return false;
        }
    }

    async buildTower(location) {
        const blueprint = this.blueprints.tower;
        try {
            if (!this.bot.creative) {
                this.bot.chat("I need creative mode to build efficiently!");
                return false;
            }

            // Build foundation
            await this.buildFoundation(location, blueprint.width, blueprint.length, blueprint.materials.floor);
            
            // Build tall walls
            await this.buildWalls(location, blueprint.width, blueprint.length, blueprint.height, blueprint.materials.walls);
            
            // Add windows spiraling up
            await this.addTowerWindows(location, blueprint.height, blueprint.materials.windows);
            
            // Build tower top
            await this.buildTowerTop(location, blueprint.width, blueprint.length, blueprint.height, blueprint.materials.roof);
            
            this.bot.chat("I've finished building the tower!");
            return true;
        } catch (error) {
            console.error('Building error:', error);
            this.bot.chat("I encountered an error while building.");
            return false;
        }
    }

    async buildComplex(type, location) {
        if (!this.blueprints[type]) {
            this.bot.chat(`I don't know how to build a ${type}.`);
            return false;
        }

        const blueprint = this.blueprints[type];
        this.currentBuildingTask = {
            type,
            location,
            startTime: Date.now(),
            progress: 0
        };

        try {
            // Check or gather materials
            const hasAllMaterials = await this.ensureMaterials(blueprint.materials);
            if (!hasAllMaterials) {
                this.bot.chat("I couldn't get all the materials needed.");
                return false;
            }

            // Start building
            this.bot.chat(`Starting to build a ${type}!`);

            // Build foundation
            await this.buildFoundation(location, blueprint.dimensions.width, blueprint.dimensions.length, blueprint.materials.walls);
            this.currentBuildingTask.progress = 20;

            // Build main structure based on type
            switch (type) {
                case 'castle':
                    await this.buildCastle(location, blueprint);
                    break;
                case 'mansion':
                    await this.buildMansion(location, blueprint);
                    break;
                case 'temple':
                    await this.buildTemple(location, blueprint);
                    break;
                case 'village':
                    await this.buildVillage(location, blueprint);
                    break;
            }

            this.bot.chat(`Finished building the ${type}!`);
            return true;

        } catch (error) {
            console.error(`Error building ${type}:`, error);
            this.bot.chat(`I encountered an error while building the ${type}.`);
            return false;
        } finally {
            this.currentBuildingTask = null;
        }
    }

    async ensureMaterials(materials) {
        if (this.bot.creative) return true; // Creative mode doesn't need materials

        // Check current inventory
        let inventory = await this.resourceManager.checkInventory(materials);
        let missingMaterials = {};

        // Calculate missing materials
        for (const [material, amount] of Object.entries(materials)) {
            const current = inventory[material] || 0;
            if (current < amount) {
                missingMaterials[material] = amount - current;
            }
        }

        if (Object.keys(missingMaterials).length === 0) {
            return true;
        }

        // Decide whether to wait or gather
        this.bot.chat("I'm missing some materials. Let me think about what to do...");
        
        let strategy = Math.random() > 0.5 ? 'wait' : 'gather';
        let success = false;

        while (!success) {
            if (strategy === 'wait') {
                this.bot.chat("I'll wait for someone to bring the materials.");
                success = await this.resourceManager.waitForResources(missingMaterials);
                
                if (!success && this.resourceManager.shouldChangeStrategy()) {
                    this.bot.chat("Changed my mind, I'll go gather materials myself!");
                    strategy = 'gather';
                }
            } else {
                this.bot.chat("I'll gather the materials myself!");
                for (const [material, amount] of Object.entries(missingMaterials)) {
                    await this.resourceManager.gatherResource(material, amount);
                }
                
                // Recheck inventory after gathering
                inventory = await this.resourceManager.checkInventory(materials);
                success = Object.entries(materials).every(
                    ([material, amount]) => (inventory[material] || 0) >= amount
                );

                if (!success && this.resourceManager.shouldChangeStrategy()) {
                    this.bot.chat("This isn't working. I'll try waiting instead.");
                    strategy = 'wait';
                }
            }
        }

        return success;
    }

    async startScanning(player) {
        if (this.scanningState.isScanning) {
            this.bot.chat("I'm already scanning a structure!");
            return;
        }

        this.scanningState.isScanning = true;
        this.scanningState.player = player;
        this.bot.chat("Ok! Click the first corner with a diamond block.");
    }

    async handleBlockPlace(block, player) {
        if (!this.scanningState.isScanning || player.username !== this.scanningState.player) return;

        if (block.name === 'hay_block') {
            if (!this.scanningState.cornerOne) {
                this.scanningState.cornerOne = block.position.clone();
                this.bot.chat("Great! Now place another hay block at the opposite corner.");
            } else {
                this.scanningState.cornerTwo = block.position.clone();
                this.bot.chat("Perfect! What would you like to name this build?");
                // The name will be provided via chat and handled in the chat handler
            }
        }
    }

    async saveCustomBuild(name) {
        if (!this.scanningState.cornerOne || !this.scanningState.cornerTwo) {
            this.bot.chat("I don't have both corners selected!");
            return;
        }

        try {
            await this.schematicSystem.scanStructure(
                this.scanningState.cornerOne,
                this.scanningState.cornerTwo,
                name
            );

            this.bot.chat(`I've learned how to build "${name}"! You can now ask me to build it anywhere.`);
        } catch (error) {
            console.error('Error saving custom build:', error);
            this.bot.chat("I had trouble saving the build.");
        } finally {
            // Reset scanning state
            this.scanningState.isScanning = false;
            this.scanningState.player = null;
            this.scanningState.cornerOne = null;
            this.scanningState.cornerTwo = null;
        }
    }

    async buildCustom(name, location, dimensions = null) {
        try {
            const schematic = await this.schematicSystem.loadSchematic(name);
            if (!schematic) {
                this.bot.chat(`I don't know how to build "${name}". You'll need to teach me first!`);
                return false;
            }

            // Check available space
            let buildingArea = { width: 0, length: 0, height: 0 };
            
            if (dimensions) {
                buildingArea = dimensions;
            } else {
                // Scan the area for obstacles and determine available space
                buildingArea = await this.scanAvailableSpace(location);
            }

            // Calculate optimal dimensions
            const optimalDimensions = this.schematicSystem.calculateOptimalDimensions(
                schematic,
                buildingArea.width,
                buildingArea.length,
                buildingArea.height
            );

            // Scale the schematic if needed
            const needsScaling = 
                optimalDimensions.width !== schematic.dimensions.width ||
                optimalDimensions.length !== schematic.dimensions.length ||
                optimalDimensions.height !== schematic.dimensions.height;

            if (needsScaling) {
                this.bot.chat(`I'll adapt the build to fit the available space (${optimalDimensions.width}x${optimalDimensions.length}x${optimalDimensions.height}).`);
                schematic = this.schematicSystem.scaleSchematic(
                    schematic,
                    optimalDimensions.width,
                    optimalDimensions.length,
                    optimalDimensions.height
                );
            }

            this.bot.chat(`Starting to build ${name}...`);

            // Check or gather materials if not in creative mode
            if (!this.bot.creative) {
                const materials = this.schematicSystem.getRequiredMaterials(schematic);
                const hasAllMaterials = await this.ensureMaterials(materials);
                if (!hasAllMaterials) {
                    this.bot.chat("I couldn't get all the materials needed.");
                    return false;
                }
            }

            // Build the structure
            for (const block of schematic.blocks) {
                const pos = location.plus(new Vec3(block.x, block.y, block.z));
                await this.placeBlock(block.name, pos);
            }

            this.bot.chat(`Finished building ${name}!`);
            return true;

        } catch (error) {
            console.error('Error building custom structure:', error);
            this.bot.chat("I encountered an error while building.");
            return false;
        }
    }

    async listCustomBuilds() {
        const builds = await this.schematicSystem.listSchematics();
        if (builds.length === 0) {
            this.bot.chat("I haven't learned any custom builds yet.");
        } else {
            this.bot.chat(`I know how to build: ${builds.join(', ')}`);
        }
    }

    async scanAvailableSpace(location) {
        const MAX_SCAN_DISTANCE = 50;
        let width = 0, length = 0, height = 0;

        // Scan for width (X axis)
        for (let x = 0; x < MAX_SCAN_DISTANCE; x++) {
            const pos = location.plus(new Vec3(x, 0, 0));
            if (!this.isSpaceClear(pos)) break;
            width = x + 1;
        }

        // Scan for length (Z axis)
        for (let z = 0; z < MAX_SCAN_DISTANCE; z++) {
            const pos = location.plus(new Vec3(0, 0, z));
            if (!this.isSpaceClear(pos)) break;
            length = z + 1;
        }

        // Scan for height (Y axis)
        for (let y = 0; y < MAX_SCAN_DISTANCE; y++) {
            const pos = location.plus(new Vec3(0, y, 0));
            if (!this.isSpaceClear(pos)) break;
            height = y + 1;
        }

        return { width, length, height };
    }

    isSpaceClear(pos) {
        const block = this.bot.blockAt(pos);
        return block && (block.name === 'air' || block.name === 'cave_air' || block.name === 'water');
    }

    async buildFoundation(location, width, length, materials) {
        const primaryMaterial = Object.keys(materials)[0];
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < length; z++) {
                const pos = location.plus(new Vec3(x, 0, z));
                await this.placeBlock(primaryMaterial, pos);
            }
        }
    }

    async buildWalls(location, width, length, height, material) {
        // Build walls
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < width; x++) {
                await this.placeBlock(material, location.plus(new Vec3(x, y, 0)));
                await this.placeBlock(material, location.plus(new Vec3(x, y, length - 1)));
            }
            for (let z = 0; z < length; z++) {
                await this.placeBlock(material, location.plus(new Vec3(0, y, z)));
                await this.placeBlock(material, location.plus(new Vec3(width - 1, y, z)));
            }
        }
    }

    async addWindows(location, width, length, height, material) {
        // Add windows in the middle of walls
        const windowHeight = Math.floor(height / 2);
        for (let x = 2; x < width - 2; x += 2) {
            await this.placeBlock(material, location.plus(new Vec3(x, windowHeight, 0)));
            await this.placeBlock(material, location.plus(new Vec3(x, windowHeight, length - 1)));
        }
        for (let z = 2; z < length - 2; z += 2) {
            await this.placeBlock(material, location.plus(new Vec3(0, windowHeight, z)));
            await this.placeBlock(material, location.plus(new Vec3(width - 1, windowHeight, z)));
        }
    }

    async buildRoof(location, width, length, height, material) {
        // Simple sloped roof
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < length; z++) {
                const pos = location.plus(new Vec3(x, height, z));
                await this.placeBlock(material, pos);
            }
        }
    }

    async placeBlock(material, position) {
        try {
            const block = this.bot.mcData.blocksByName[material];
            if (!block) {
                throw new Error(`Unknown block: ${material}`);
            }
            await this.bot.setBlock(position, block);
        } catch (error) {
            console.error(`Error placing block at ${position}:`, error);
        }
    }
}

export default BuildingSystem;