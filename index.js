// ============================================
// MINECRAFT AI PLAYER - MAIN FILE
// ============================================

import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import { plugin as pvp } from 'mineflayer-pvp';
import VersionManager from './versionManager.js';
import dotenv from 'dotenv';
dotenv.config();

const { pathfinder, Movements, goals } = pathfinderPkg;
const { GoalNear } = goals;

// Import custom modules
import BotBrain from './brain.js';
import BuildingSystem from './building.js';
import BuildingAI from './buildingAI.js';
import ChestManager from './chests.js';
import BaseManager from './base.js';
import InventoryManager from './inventory.js';
import SkinManager from './skin.js';
import EnchantmentManager from './enchantment.js';
import AutonomousBehavior from './autonomous.js';
import AISystem from './ai.js';
import HealthManager from './health.js';
import ToolManager from './tools.js';
import CombatManager from './combat.js';

// ============================================
// CONFIGURATION
// ============================================

const SUPPORTED_VERSIONS = [
  '1.8', '1.9', '1.10', '1.11', '1.12',
  '1.13', '1.14', '1.15', '1.16', '1.17',
  '1.18', '1.19', '1.20'
];

// Bot configuration with environment variables
const botConfig = {
  host: process.env.MC_HOST || 'YSD_S2.aternos.me',
  port: process.env.MC_PORT || 45419,
  username: process.env.MC_USERNAME || 'V',
  version: process.env.MC_VERSION || false,
  auth: process.env.MC_AUTH || 'offline',
  skinParts: {
    showCape: true,
    showJacket: true,
    showLeftSleeve: true,
    showRightSleeve: true,
    showLeftPants: true,
    showRightPants: true,
    showHat: true
  }
};

// ============================================
// VERSION DETECTION
// ============================================

async function detectServerVersion(host, port) {
  try {
    const tempBot = mineflayer.createBot({
      host: host,
      port: port,
      username: 'VersionDetector',
      version: false
    });

    return new Promise((resolve) => {
      let completed = false;

      tempBot.once('spawn', () => {
        if (completed) return;
        completed = true;
        const version = tempBot.version;
        tempBot.end();
        resolve(version);
      });

      tempBot.once('error', (err) => {
        if (completed) return;
        completed = true;
        console.log('Version detection error:', err.message);
        tempBot.end();
        resolve(false); // Gracefully fail over to auto-detection
      });

      setTimeout(() => {
        if (completed) return;
        completed = true;
        console.log('Version detection timed out, using auto-detection');
        tempBot.end();
        resolve(false); // Gracefully fail over to auto-detection
      }, 20000); // Increased to 20 seconds
    });
  } catch (err) {
    console.log('Version detection failed:', err.message);
    return false;
  }
}

// ============================================
// BOT CREATION
// ============================================

async function createVersionedBot() {
  try {
    // Try to detect server version
    const detectedVersion = await detectServerVersion(botConfig.host, botConfig.port);
    if (detectedVersion) {
      console.log(`Detected server version: ${detectedVersion}`);
      botConfig.version = detectedVersion;
    } else {
      console.log('Using auto version detection');
      botConfig.version = false;
    }

    // Create bot with detected or auto version
    const bot = mineflayer.createBot(botConfig);

    return bot;
  } catch (err) {
    console.error('Error creating bot:', err.message);
    throw err;
  }
}

// ============================================
// BOT STATE
// ============================================

let bot;
let botState = {
  following: null,
  fighting: false,
  initialized: false
};

// ============================================
// BOT INITIALIZATION
// ============================================

createVersionedBot()
  .then(b => {
    bot = b;
    console.log('Bot instance created, waiting for spawn...');

    // Load plugins
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(pvp);

    // Setup error handlers now that bot exists
    setupErrorHandlers();

    // ============================================
    // SPAWN EVENT
    // ============================================

    bot.once('spawn', async () => {
  console.log('✓ Bot has spawned!');
  console.log(`✓ Connected with version: ${bot.version}`);

  botState.initialized = true;

  // Initialize pathfinder movements
  const movements = new Movements(bot);
  bot.pathfinder.setMovements(movements);

  // Initialize all systems
  const toolManager = new ToolManager(bot);
  const chestManager = new ChestManager(bot);
  const inventoryManager = new InventoryManager(bot, chestManager);
  const enchantmentManager = new EnchantmentManager(bot, inventoryManager);
  const healthManager = new HealthManager(bot, inventoryManager);
  const buildingAI = new BuildingAI(bot);
  const buildingSystem = new BuildingSystem(bot, buildingAI);
  const baseManager = new BaseManager(bot);
  const skinManager = new SkinManager(bot);
  const aiSystem = new AISystem(bot);
  const combatManager = new CombatManager(bot, inventoryManager);
  
  // Initialize bot's brain
  const botBrain = new BotBrain(bot, aiSystem, buildingSystem, inventoryManager, healthManager, combatManager);

  // Initialize autonomous systems
  const autonomousBehavior = new AutonomousBehavior(bot, aiSystem, buildingSystem, toolManager, chestManager, baseManager);
  autonomousBehavior.initialize();

  // Set up periodic activity changes when at base
  setInterval(() => {
    if (baseManager.initialized && !botState.following && !botState.fighting) {
      baseManager.chooseRandomActivity();
    }
  }, 300000); // Change activity every 5 minutes

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // Block placement
  bot.on('blockPlace', async (oldBlock, newBlock, player) => {
    await buildingSystem.handleBlockPlace(newBlock, player);
    if (newBlock.name === 'gold_block') {
      baseManager.setBase(newBlock.position);
    }
  });

  // Monitor tool durability
  bot.on('physicsTick', async () => {
    await toolManager.checkToolDurability();
  });

  // Return to base at night
  bot.on('time', () => {
    const isNight = bot.time.timeOfDay > 12000;
    if (isNight && !botState.following && !botState.fighting && baseManager.initialized) {
      baseManager.returnToBase();
    }
  });

  // ============================================
  // AVAILABLE COMMANDS
  // ============================================

  const commands = {
    'help': 'Show this help message',
    'protect me': 'Bot will protect you from mobs',
    'learn build': 'Start scanning a build pattern',
    'list builds': 'Show list of saved builds',
    'name build <name>': 'Save scanned build with a name',
    'build <type>': 'Build structure (house/tower/castle)',
    'stop': 'Stop all activities',
    'come': 'Bot comes to your position',
    'mark <name>': 'Mark current location',
    'store items': 'Store items in nearby chest',
    'status': 'Show bot health/hunger',
    'find food': 'Search for food',
    'cook food': 'Cook available food',
    'get <item>': 'Get item from chests',
    'base chest': 'Register chest as storage',
    'organize chests': 'Organize base chests',
    'skin <name>': 'Change bot skin',
    'random skin': 'Apply random skin',
    'equip combat': 'Equip combat gear',
    'use bow': 'Equip bow',
    'use shield': 'Equip shield'
  };

  // ============================================
  // CHAT HANDLER
  // ============================================

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    // Handle help command
    if (message === '!help' || message === 'help') {
      bot.chat('Available commands:');
      for (const [cmd, desc] of Object.entries(commands)) {
        bot.chat(`!${cmd}: ${desc}`);
      }
      return;
    }

    // Remove ! prefix if present
    if (message.startsWith('!')) {
      message = message.slice(1);
    }

    // Command handlers
    try {
      if (message === 'protect me') {
        const player = bot.players[username];
        if (!player) {
          bot.chat("I can't see you!");
          return;
        }
        botState.following = player;
        botState.fighting = true;
        bot.chat(`I'll protect you, ${username}!`);
      }

      else if (message === 'learn build') {
        await buildingSystem.startScanning(username);
      }
      
      else if (message === 'list builds') {
        await buildingSystem.listCustomBuilds();
      }

      else if (message.startsWith('name build ')) {
        const name = message.substring(11).toLowerCase();
        await buildingSystem.saveCustomBuild(name);
      }

      else if (message.startsWith('build ')) {
        const buildType = message.substring(6).toLowerCase();
        const buildLocation = bot.entity.position.offset(5, 0, 5);

        if (buildType === 'house') {
          bot.chat("I'll build a house!");
          await buildingSystem.buildHouse(buildLocation);
        }
        else if (buildType === 'tower') {
          bot.chat("I'll build a tower!");
          await buildingSystem.buildTower(buildLocation);
        }
        else if (['castle', 'mansion', 'temple', 'village'].includes(buildType)) {
          bot.chat(`I'll build a ${buildType}!`);
          await buildingSystem.buildComplex(buildType, buildLocation);
        }
        else {
          await buildingSystem.buildCustom(buildType, buildLocation);
        }
      }

      else if (message === 'stop') {
        botState.following = null;
        botState.fighting = false;
        bot.pvp.stop();
        bot.pathfinder.setGoal(null);
        bot.chat('Stopped all activities');
      }

      else if (message === 'come') {
        const player = bot.players[username];
        if (!player) {
          bot.chat("I can't see you!");
          return;
        }
        botState.following = player;
        bot.chat(`Coming to you, ${username}!`);
        followPlayer();
      }

      else if (message.startsWith('mark ')) {
        const landmarkName = message.substring(5).toLowerCase();
        baseManager.addLandmark(landmarkName, bot.entity.position);
        bot.chat(`Marked location as '${landmarkName}'`);
      }

      else if (message === 'store items') {
        const chest = await chestManager.findChest();
        if (chest) {
          await chestManager.depositItems(bot.inventory.items(), chest);
          bot.chat("Stored items in chest!");
        } else {
          bot.chat("No chests nearby.");
        }
      }

      else if (message === 'enchant') {
        await enchantmentManager.enchantBestItems();
        bot.chat("Enchanted items!");
      }

      else if (message === 'show enchants') {
        const equipped = bot.inventory.slots.filter(item => item && item.enchants);
        if (equipped.length === 0) {
          bot.chat("No enchanted items.");
          return;
        }
        bot.chat('My enchanted items:');
        equipped.forEach(item => {
          bot.chat(`${item.name}: ${item.enchants.length} enchantments`);
        });
      }

      else if (message === 'status' || message === 'mood') {
        const status = healthManager.getFoodLevel();
        const moodSummary = botBrain.moodSystem.getMoodSummary();
        
        bot.chat(`Health: ${status.health}/20, Food: ${status.food}/20`);
        
        for (const [mood, value] of Object.entries(moodSummary.moods || {})) {
          const indicator = value > 0 ? '↑' : value < 0 ? '↓' : '→';
          bot.chat(`${mood}: ${indicator} ${Math.abs(value).toFixed(1)}`);
        }
      }

      else if (message === 'find food') {
        bot.chat("Looking for food!");
        await healthManager.searchForFood();
      }

      else if (message === 'cook food') {
        bot.chat("Cooking food...");
        await healthManager.cookFood();
      }

      else if (message.startsWith('get ')) {
        const itemName = message.substring(4).toLowerCase();
        const chestPos = await chestManager.findItemInChests(itemName);
        if (chestPos) {
          bot.chat(`Found ${itemName} in a chest!`);
        } else {
          bot.chat(`No ${itemName} in chests.`);
        }
      }

      else if (message === 'base chest') {
        const chest = await chestManager.findChest(5);
        if (chest) {
          chestManager.registerBaseChest(chest.position, 'storage');
          bot.chat("Registered chest as base storage!");
        } else {
          bot.chat("No chests nearby.");
        }
      }

      else if (message === 'organize chests') {
        bot.chat("Organizing chests...");
        await chestManager.organizeBaseChests();
      }

      else if (message.startsWith('skin ')) {
        const skinName = message.substring(5);
        try {
          await skinManager.loadSkin(skinName);
          bot.chat(`Changed skin to ${skinName}!`);
        } catch (err) {
          bot.chat(`Skin not found: ${skinName}`);
        }
      }

      else if (message === 'random skin') {
        try {
          await skinManager.randomSkin();
          bot.chat("Changed to random skin!");
        } catch (err) {
          bot.chat("No skins available.");
        }
      }

      else if (message === 'equip combat') {
        await combatManager.equipBestGear();
        bot.chat('Combat gear equipped!');
      }

      else if (message === 'use bow') {
        const success = await combatManager.equipBow();
        bot.chat(success ? 'Bow equipped!' : 'No bow found.');
      }

      else if (message === 'use shield') {
        const success = await combatManager.equipShield();
        bot.chat(success ? 'Shield equipped!' : 'No shield found.');
      }

      else {
        // AI conversation
        try {
          const botCurrentState = {
            health: bot.health,
            food: bot.food,
            nearbyPlayers: Object.keys(bot.players).filter(name => name !== bot.username),
            timeOfDay: bot.time.timeOfDay,
            holding: bot.heldItem ? bot.heldItem.name : 'nothing'
          };

          const response = await aiSystem.getResponse(username, message, botCurrentState);
          bot.chat(response);
        } catch (error) {
          console.error('AI error:', error.message);
          bot.chat("I'm having trouble understanding right now.");
        }
      }
    } catch (err) {
      console.error('Command error:', err.message);
      bot.chat("Something went wrong with that command.");
    }
  });

  // ============================================
  // FOLLOW PLAYER FUNCTION
  // ============================================

  async function followPlayer() {
    if (!botState.following) return;
    
    const pos = botState.following.entity.position;
    bot.pathfinder.setGoal(new GoalNear(pos.x, pos.y, pos.z, 2));
  }

  // Set up continuous following
  setInterval(() => {
    if (botState.following) {
      followPlayer();
    }
  }, 1000);

  // ============================================
  // PROTECTION MODE
  // ============================================

  bot.on('physicsTick', () => {
    if (!botState.fighting || !botState.following) return;

    const entity = bot.nearestEntity(e => {
      if (e === botState.following.entity) return false;
      return e.type === 'mob' || (e.type === 'player' && e !== botState.following.entity);
    });

    if (entity) {
      if (entity.position.distanceTo(bot.entity.position) < 8) {
        bot.pvp.attack(entity);
      }
    }
  });
    });
    })
    .catch(err => {
      console.error('Failed to create bot:', err.message);
      process.exit(1);
    });

// ============================================
// ERROR HANDLERS
// ============================================

// These handlers are registered after bot creation
function setupErrorHandlers() {
  bot.on('error', (err) => {
  console.error('Bot error:', err.message);
  });

  bot.on('kicked', (reason) => {
    console.log('Bot was kicked:', reason);
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      createVersionedBot().then(b => {
        bot = b;
        setupErrorHandlers();
      });
    }, 5000);
  });

  bot.on('end', () => {
    console.log('Bot disconnected');
  });
}

// ============================================
// ERROR HANDLERS (Global fallback)
// ============================================

// Global error handling if setupErrorHandlers isn't called in time
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (bot) {
    bot.quit();
  }
  process.exit(0);
});

export { bot, botState };
