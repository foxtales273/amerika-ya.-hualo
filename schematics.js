import Vec3 from 'vec3';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SchematicSystem {
    constructor(bot) {
        this.bot = bot;
        this.schematics = new Map();
        this.scanningState = {
            isScanning: false,
            startPos: null,
            endPos: null
        };
    }

    async scanStructure(startPos, endPos, name) {
        this.scanningState.isScanning = true;
        this.scanningState.startPos = startPos;
        this.scanningState.endPos = endPos;

        try {
            const schematic = {
                name,
                date: new Date().toISOString(),
                dimensions: {
                    width: Math.abs(endPos.x - startPos.x) + 1,
                    length: Math.abs(endPos.z - startPos.z) + 1,
                    height: Math.abs(endPos.y - startPos.y) + 1
                },
                blocks: [],
                metadata: {
                    creator: "unknown",
                    tags: [],
                    originalDimensions: {
                        width: Math.abs(endPos.x - startPos.x) + 1,
                        length: Math.abs(endPos.z - startPos.z) + 1,
                        height: Math.abs(endPos.y - startPos.y) + 1
                    }
                }
            };

            // Normalize coordinates
            const minX = Math.min(startPos.x, endPos.x);
            const minY = Math.min(startPos.y, endPos.y);
            const minZ = Math.min(startPos.z, endPos.z);
            const maxX = Math.max(startPos.x, endPos.x);
            const maxY = Math.max(startPos.y, endPos.y);
            const maxZ = Math.max(startPos.z, endPos.z);

            this.bot.chat(`Scanning structure "${name}"... This might take a moment.`);

            // Scan all blocks in the area
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    for (let z = minZ; z <= maxZ; z++) {
                        const pos = new Vec3(x, y, z);
                        const block = this.bot.blockAt(pos);
                        
                        if (block && block.name !== 'air') {
                            schematic.blocks.push({
                                x: x - minX,
                                y: y - minY,
                                z: z - minZ,
                                name: block.name,
                                metadata: block.metadata
                            });
                        }
                    }
                }
            }

            // Save to memory and file
            this.schematics.set(name, schematic);
            await this.saveSchematic(name, schematic);

            this.bot.chat(`Finished scanning structure "${name}". Found ${schematic.blocks.length} blocks!`);
            return true;

        } catch (error) {
            console.error('Error scanning structure:', error);
            this.bot.chat("I had trouble scanning the structure.");
            return false;

        } finally {
            this.scanningState.isScanning = false;
            this.scanningState.startPos = null;
            this.scanningState.endPos = null;
        }
    }

    async saveSchematic(name, schematic) {
        try {
            // Ensure the schematics directory exists
            const schematicsDir = path.join(process.cwd(), 'schematics');
            await fs.mkdir(schematicsDir, { recursive: true });

            // Save the schematic file
            const filePath = path.join(schematicsDir, `${name}.json`);
            await fs.writeFile(filePath, JSON.stringify(schematic, null, 2));
            
            return true;
        } catch (error) {
            console.error('Error saving schematic:', error);
            return false;
        }
    }

    async loadSchematic(name) {
        try {
            // Try loading from memory first
            if (this.schematics.has(name)) {
                return this.schematics.get(name);
            }

            // Load from file
            const filePath = path.join(process.cwd(), 'schematics', `${name}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            const schematic = JSON.parse(data);
            
            // Cache in memory
            this.schematics.set(name, schematic);
            
            return schematic;
        } catch (error) {
            console.error('Error loading schematic:', error);
            return null;
        }
    }

    async listSchematics() {
        try {
            const schematicsDir = path.join(process.cwd(), 'schematics');
            await fs.mkdir(schematicsDir, { recursive: true });
            
            const files = await fs.readdir(schematicsDir);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            console.error('Error listing schematics:', error);
            return [];
        }
    }

    getRequiredMaterials(schematic) {
        const materials = {};
        for (const block of schematic.blocks) {
            materials[block.name] = (materials[block.name] || 0) + 1;
        }
        return materials;
    }

    scaleSchematic(schematic, targetWidth, targetLength, targetHeight) {
        const original = schematic.metadata.originalDimensions;
        const scaleX = targetWidth / original.width;
        const scaleY = targetHeight / original.height;
        const scaleZ = targetLength / original.length;

        const scaledBlocks = [];
        const blockMap = new Map(); // To prevent block duplicates

        for (const block of schematic.blocks) {
            // Calculate new positions
            const newX = Math.round(block.x * scaleX);
            const newY = Math.round(block.y * scaleY);
            const newZ = Math.round(block.z * scaleZ);

            // Create unique key for position
            const posKey = `${newX},${newY},${newZ}`;

            // Only add block if position is not occupied
            if (!blockMap.has(posKey)) {
                blockMap.set(posKey, {
                    x: newX,
                    y: newY,
                    z: newZ,
                    name: block.name,
                    metadata: block.metadata
                });
            }
        }

        // Convert map values back to array
        const scaledSchematic = {
            ...schematic,
            blocks: Array.from(blockMap.values()),
            dimensions: {
                width: targetWidth,
                length: targetLength,
                height: targetHeight
            }
        };

        return scaledSchematic;
    }

    calculateOptimalDimensions(schematic, availableWidth, availableLength, availableHeight) {
        const original = schematic.metadata.originalDimensions;
        
        // Calculate scaling ratios
        const widthRatio = availableWidth / original.width;
        const lengthRatio = availableLength / original.length;
        const heightRatio = availableHeight / original.height;

        // Find the smallest ratio to maintain proportions
        const baseRatio = Math.min(widthRatio, lengthRatio, heightRatio);

        // Calculate new dimensions while maintaining proportions
        return {
            width: Math.floor(original.width * baseRatio),
            length: Math.floor(original.length * baseRatio),
            height: Math.floor(original.height * baseRatio)
        };
    }
}

export default SchematicSystem;