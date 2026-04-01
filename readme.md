# Minecraft AI Player

An intelligent AI bot for Minecraft using Mineflayer with advanced features including building systems, combat, inventory management, and personality-driven behavior.

## Requirements

### System Requirements
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Windows**, **macOS**, or **Linux**

### Minecraft Server Requirements
- Minecraft Java Edition server
- Server must support Minecraft version 1.8 - 1.20
- Offline or online mode server (offline recommended for testing)

## Installation

### Step 1: Install Node.js Dependencies
```powershell
cd e:\VS.code\A\AIplayer\2
npm install
```

This will install all required packages:
- `mineflayer` - Minecraft bot library
- `mineflayer-pathfinder` - Pathfinding system
- `mineflayer-pvp` - Combat system
- `dotenv` - Environment variable management
- `@xenova/transformers` - AI model library
- `axios` - HTTP requests

### Step 2: Configure Environment Variables

Create or edit the `.env` file in the project root:

```env
MC_HOST=your-server-ip
MC_PORT=12345
MC_USERNAME=YourBotName
MC_VERSION=1.20
MC_AUTH=offline
```

**Configuration Options:**

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `MC_HOST` | Minecraft server IP/hostname | `YSD_S2.aternos.me` | `localhost` |
| `MC_PORT` | Server port | `45419` | `25565` |
| `MC_USERNAME` | Bot username | `V` | `c` |
| `MC_VERSION` | Minecraft version (false = auto-detect) | `1.20` or `false` | `false` |
| `MC_AUTH` | Authentication type (`offline` or `microsoft`) | `offline` | `offline` |

## Running the Bot

### Quick Start
```powershell
npm start
```

### Manual Start
```powershell
node index.js
```

### With Custom Server
```powershell
$env:MC_HOST = "server.ip.address"
$env:MC_PORT = 12345
$env:MC_USERNAME = "BotName"
$env:MC_AUTH = "offline"
npm start
```

## Available Commands

Type these commands in Minecraft chat with the `!` prefix:

### Basic Commands
- `!help` - Show all available commands
- `!stop` - Stop all activities
- `!come` - Bot comes to your location
- `!protect me` - Bot protects you from mobs

### Building Commands
- `!build house` - Build a house
- `!build tower` - Build a tower
- `!build castle` - Build a castle
- `!learn build` - Scan a build pattern
- `!list builds` - Show saved builds

### Inventory Commands
- `!store items` - Store items in chest
- `!get <item>` - Get item from storage
- `!organize chests` - Organize base chests
- `!base chest` - Register chest as storage

### Status & Information
- `!status` - Show health and hunger status
- `!mood` - Show emotional/mood state
- `!show enchants` - Show enchanted items

### Skin Commands
- `!skin <name>` - Change bot skin
- `!random skin` - Apply random skin

### Combat
- `!equip combat` - Equip combat gear
- `!use bow` - Equip bow
- `!use shield` - Equip shield
- `!find food` - Search for food
- `!cook food` - Cook food

## File Structure

```
├── index.js              - Main bot entry point
├── ai.js                 - AI conversation system
├── autonomous.js         - Autonomous behavior engine
├── base.js               - Base management system
├── blueprints.js         - Building blueprints
├── brain.js              - Bot brain & personality
├── building.js           - Building system (ES6)
├── buildingAI.js         - AI building patterns
├── chests.js             - Chest/storage management
├── combat.js             - Combat & PvP system
├── enchantment.js        - Enchantment management
├── experience.js         - Experience/XP system
├── health.js             - Health/hunger management
├── imageSearch.js        - Image recognition
├── inventory.js          - Inventory management
├── mood.js               - Mood/emotion system
├── personality.js        - Personality types
├── resources.js          - Resource gathering
├── responses.js          - Chat response system
├── schematics.js         - Schematic handling
├── skin.js               - Skin management
├── tools.js              - Tool management (ES6)
├── versionManager.js     - Version detection
├── package.json          - NPM dependencies
├── .env                  - Configuration file
├── .gitignore            - Git ignore rules
└── skins/                - Custom skins folder
```

## Features

✅ **Version Auto-Detection** - Automatically detects server version (1.8 - 1.20)
✅ **AI System** - Natural language conversations using Xenova/DialoGPT
✅ **Building System** - Multiple building types with blueprints
✅ **Combat System** - PvP and mob protection
✅ **Inventory Management** - Automated storage and organization
✅ **Personality System** - Multiple personality types
✅ **Mood System** - Dynamic emotional state tracking
✅ **Autonomous Behavior** - Acts independently when idle
✅ **Enchantment Management** - Auto-enchanting support
✅ **Skin System** - Dynamic skin swapping
✅ **ES6 Modules** - Modern JavaScript module system

## Troubleshooting

### Cannot find module errors
```powershell
npm install
npm update
```

### Connection refused
- Verify server is running and accessible
- Check `MC_HOST` and `MC_PORT` in `.env`
- Ensure firewall allows connections
- Try default: `MC_HOST=localhost` and `MC_PORT=25565`

### Bot won't spawn
- Check server console for connection errors
- Ensure bot username is not already in use
- Verify `MC_AUTH=offline` for offline-mode servers
- Try auto-detecting version: `MC_VERSION=false`

### Commands not working
- Ensure prefix is used: `!help` (not `help`)
- Bot must complete spawn before accepting commands
- Check browser console for error messages

### Module/ES6 import errors
- Ensure `"type": "module"` is in `package.json`
- All imports should use `.js` extension (e.g., `./brain.js`)
- All files must have proper `export default ClassName` statements

## Environment Examples

### Local Server (Testing)
```env
MC_HOST=localhost
MC_PORT=12345
MC_USERNAME=TestBot
MC_VERSION=false
MC_AUTH=offline
```

### Aternos Server
```env
MC_HOST=lorem.aternos.me
MC_PORT=12345
MC_USERNAME=V
MC_VERSION=false
MC_AUTH=offline
```

### Online Mode Server
```env
MC_HOST=lorem.example.com
MC_PORT=12345
MC_USERNAME=BotName
MC_VERSION=1.20
MC_AUTH=microsoft
```

## Architecture Notes

### ES6 Module Conversion
The entire project has been converted to ES6 modules for modern JavaScript support:
- All `require()` statements replaced with `import/export`
- Uses `dotenv` for environment variable management
- Proper `__dirname` handling for file operations

### Module Organization
- **Systems**: Core game systems (Building, Combat, Health, etc.)
- **Managers**: Data/resource managers (Inventory, Chest, etc.)
- **AI**: Conversation and autonomous behavior
- **Configuration**: Version detection and bot setup

## Clean Build Status

✅ All modules converted to ES6
✅ All syntax validated
✅ Environment configuration ready
✅ Dependencies installed
✅ Ready for deployment
