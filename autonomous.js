class AutonomousBehavior {
    constructor(bot, ai, buildingSystem) {
        this.bot = bot;
        this.ai = ai;
        this.buildingSystem = buildingSystem;
        this.state = {
            currentTask: null,
            lastDecision: Date.now(),
            preferences: {
                buildingStyle: 'house',
                explorationRange: 100,
                friendliness: 0.8
            },
            memory: {
                knownPlayers: {},
                builtStructures: [],
                exploredAreas: new Set()
            }
        };
    }

    async initialize() {
        // Start the decision-making loop
        this.decisionLoop();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Track player interactions
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;
            
            // Update player relationship in memory
            if (!this.state.memory.knownPlayers[username]) {
                this.state.memory.knownPlayers[username] = {
                    firstMet: Date.now(),
                    interactions: 0,
                    lastInteraction: Date.now(),
                    relationship: 0
                };
            }
            
            const player = this.state.memory.knownPlayers[username];
            player.interactions++;
            player.lastInteraction = Date.now();
            player.relationship += 0.1; // Increment relationship score
        });

        // Track day/night cycle
        this.bot.on('time', () => {
            const isNight = this.bot.time.timeOfDay > 12000;
            if (isNight && !this.state.currentTask) {
                this.considerShelter();
            }
        });
    }

    async decisionLoop() {
        while (true) {
            try {
                await this.makeDecision();
                await new Promise(resolve => setTimeout(resolve, 5000)); // Think every 5 seconds
            } catch (error) {
                console.error('Decision loop error:', error);
            }
        }
    }

    async makeDecision() {
        // Don't make new decisions if already busy
        if (this.state.currentTask) return;

        const now = Date.now();
        if (now - this.state.lastDecision < 5000) return; // Don't decide too frequently
        
        this.state.lastDecision = now;

        // Get current situation
        const nearbyPlayers = Object.keys(this.bot.players);
        const isNight = this.bot.time.timeOfDay > 12000;
        const hasHome = this.state.memory.builtStructures.length > 0;

        // Decision tree
        if (isNight && !hasHome) {
            await this.buildShelter();
        } else if (nearbyPlayers.length > 0 && Math.random() < this.state.preferences.friendliness) {
            await this.interactWithPlayers();
        } else if (Math.random() < 0.3) {
            await this.exploreArea();
        } else if (this.bot.creative && Math.random() < 0.4) {
            await this.buildSomething();
        }
    }

    async buildShelter() {
        this.state.currentTask = 'building_shelter';
        this.bot.chat("I think I'll build myself a shelter here.");
        
        const location = this.bot.entity.position.offset(5, 0, 5);
        await this.buildingSystem.buildHouse(location);
        
        this.state.memory.builtStructures.push({
            type: 'house',
            location: location,
            purpose: 'shelter',
            built: Date.now()
        });
        
        this.state.currentTask = null;
    }

    async interactWithPlayers() {
        this.state.currentTask = 'socializing';
        const nearbyPlayers = Object.keys(this.bot.players);
        
        if (nearbyPlayers.length > 0) {
            const player = nearbyPlayers[Math.floor(Math.random() * nearbyPlayers.length)];
            const greeting = this.generateGreeting(player);
            this.bot.chat(greeting);
        }
        
        this.state.currentTask = null;
    }

    async exploreArea() {
        this.state.currentTask = 'exploring';
        this.bot.chat("I'm going to explore a bit!");
        
        // Pick a random direction and walk
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.state.preferences.explorationRange;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        try {
            await this.bot.pathfinder.goto(this.bot.entity.position.offset(x, 0, z));
        } catch (error) {
            console.log('Exploration path failed:', error);
        }
        
        this.state.currentTask = null;
    }

    async buildSomething() {
        this.state.currentTask = 'building';
        this.bot.chat("I feel like building something!");
        
        const location = this.bot.entity.position.offset(10, 0, 10);
        if (Math.random() < 0.5) {
            await this.buildingSystem.buildHouse(location);
        } else {
            await this.buildingSystem.buildTower(location);
        }
        
        this.state.currentTask = null;
    }

    generateGreeting(playerName) {
        const player = this.state.memory.knownPlayers[playerName];
        if (!player) {
            return `Hello ${playerName}! Nice to meet you!`;
        }
        
        const timeSinceLastInteraction = Date.now() - player.lastInteraction;
        if (timeSinceLastInteraction > 3600000) { // More than an hour
            return `Hey ${playerName}! Good to see you again!`;
        }
        return `Hi again ${playerName}!`;
    }

    considerShelter() {
        if (!this.state.memory.builtStructures.length) {
            this.buildShelter();
        }
    }
}

export default AutonomousBehavior;