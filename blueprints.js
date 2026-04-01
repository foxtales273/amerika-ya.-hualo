const complexBlueprints = {
    castle: {
        dimensions: { width: 20, length: 25, height: 15 },
        materials: {
            walls: { stone_bricks: 500, cobblestone: 200 },
            towers: { stone_bricks: 300, stone: 100 },
            roof: { stone_brick_stairs: 200 },
            windows: { glass_pane: 50 },
            decorations: { lantern: 20, oak_fence: 40 }
        },
        features: ['mainHall', 'towers', 'courtyard', 'walls', 'gate'],
        complexity: 5
    },
    mansion: {
        dimensions: { width: 25, length: 30, height: 12 },
        materials: {
            walls: { oak_planks: 400, stripped_oak_log: 100 },
            roof: { dark_oak_stairs: 200, dark_oak_planks: 100 },
            windows: { glass: 80 },
            decorations: { flower_pot: 10, lantern: 15, oak_stairs: 50 }
        },
        features: ['rooms', 'balcony', 'garden', 'library', 'diningRoom'],
        complexity: 4
    },
    temple: {
        dimensions: { width: 15, length: 25, height: 18 },
        materials: {
            walls: { sandstone: 300, chiseled_sandstone: 100 },
            pillars: { sandstone_stairs: 150 },
            roof: { smooth_sandstone: 200 },
            decorations: { gold_block: 20, glowstone: 30 }
        },
        features: ['altar', 'columns', 'dome', 'statues', 'garden'],
        complexity: 4
    },
    village: {
        dimensions: { width: 50, length: 50, height: 10 },
        materials: {
            houses: { oak_planks: 600, cobblestone: 400 },
            roads: { stone_bricks: 200, gravel: 100 },
            decorations: { lantern: 30, oak_fence: 100, flower_pot: 20 }
        },
        features: ['houses', 'roads', 'well', 'farm', 'marketplace'],
        complexity: 5
    }
};

const buildingStyles = {
    medieval: {
        primary: ['stone_bricks', 'oak_planks', 'spruce_planks'],
        accent: ['dark_oak_log', 'cobblestone'],
        roof: ['dark_oak_stairs', 'stone_brick_stairs'],
        decorative: ['lantern', 'oak_fence', 'stone_brick_wall']
    },
    modern: {
        primary: ['concrete', 'smooth_stone', 'quartz_block'],
        accent: ['glass', 'glass_pane'],
        roof: ['smooth_stone_slab', 'quartz_stairs'],
        decorative: ['sea_lantern', 'iron_bars', 'quartz_pillar']
    },
    fantasy: {
        primary: ['purpur_block', 'prismarine', 'end_stone_bricks'],
        accent: ['purpur_pillar', 'dark_prismarine'],
        roof: ['purpur_stairs', 'prismarine_stairs'],
        decorative: ['end_rod', 'purple_stained_glass', 'chain']
    },
    natural: {
        primary: ['stripped_oak_log', 'stripped_spruce_log', 'stone'],
        accent: ['oak_planks', 'spruce_planks'],
        roof: ['oak_stairs', 'spruce_stairs'],
        decorative: ['leaves', 'flowering_azalea', 'moss_block']
    }
};

export { complexBlueprints, buildingStyles };