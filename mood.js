import PersonalitySystem from './personality.js';

class MoodSystem {
    constructor(bot) {
        this.bot = bot;
        this.personality = new PersonalitySystem(bot);
        
        // Base mood attributes (-100 to 100)
        this.moods = {
            happiness: 0,      // Affects willingness to help and build
            confidence: 0,     // Affects combat and exploration
            patience: 0,       // Affects task persistence
            sociability: 0,    // Affects interaction with players
            enthusiasm: 0,     // Affects energy in tasks
            curiosity: 0       // Affects exploration and learning
        };

        // Experience tracking
        this.experiences = {
            combatWins: 0,
            combatLosses: 0,
            successfulBuilds: 0,
            failedBuilds: 0,
            playerInteractions: 0,
            discoveries: 0,
            deathCount: 0,
            achievementsCount: 0
        };

        // Initialize experience-based events
        this.initializeExperienceEvents();

        // Current dominant mood and its intensity
        this.currentMood = {
            type: 'neutral',
            intensity: 50,
            startTime: Date.now()
        };

        // Mood modifiers
        this.moodModifiers = {
            weather: {
                rain: -10,
                thunder: -20,
                clear: +10
            },
            time: {
                day: +10,
                night: -10,
                sunset: +5,
                sunrise: +15
            },
            events: {
                combat: -15,
                foundTreasure: +20,
                completedBuild: +15,
                tookDamage: -10,
                helpedPlayer: +15,
                gotFood: +5,
                enchantedItem: +10
            }
        };

        // Initialize mood system
        this.initializeMood();
    }

    initializeMood() {
        // Set initial random mood values
        Object.keys(this.moods).forEach(mood => {
            this.moods[mood] = (Math.random() * 100) - 50; // -50 to 50 range
        });

        // Update mood periodically
        setInterval(() => this.updateMood(), 60000); // Every minute
        
        // Random mood swings
        setInterval(() => this.randomMoodShift(), 300000); // Every 5 minutes
    }

    updateMood() {
        // Affect moods based on environment
        const timeOfDay = this.bot.time.timeOfDay;
        const isRaining = this.bot.isRaining;
        
        // Time of day effects
        if (timeOfDay > 0 && timeOfDay < 12000) { // Day
            this.modifyMood('happiness', this.moodModifiers.time.day);
        } else { // Night
            this.modifyMood('happiness', this.moodModifiers.time.night);
        }

        // Weather effects
        if (isRaining) {
            this.modifyMood('happiness', this.moodModifiers.weather.rain);
            this.modifyMood('enthusiasm', this.moodModifiers.weather.rain);
        }

        // Natural mood stabilization
        Object.keys(this.moods).forEach(mood => {
            if (Math.abs(this.moods[mood]) > 0) {
                this.moods[mood] *= 0.95; // Gradually return to neutral
            }
        });

        // Update dominant mood
        this.updateDominantMood();
    }

    randomMoodShift() {
        // Random mood swings
        const randomMood = Object.keys(this.moods)[Math.floor(Math.random() * Object.keys(this.moods).length)];
        const shift = (Math.random() * 40) - 20; // -20 to +20
        this.modifyMood(randomMood, shift);
        
        if (Math.abs(shift) > 15) {
            const direction = shift > 0 ? "better" : "worse";
            this.bot.chat(`My ${randomMood} is getting ${direction}...`);
        }
    }

    modifyMood(mood, value) {
        if (this.moods[mood] !== undefined) {
            this.moods[mood] = Math.max(-100, Math.min(100, this.moods[mood] + value));
        }
    }

    updateDominantMood() {
        const previousMood = this.currentMood.type;
        
        // Find the strongest mood
        let dominantMood = Object.entries(this.moods)
            .reduce((max, [mood, value]) => 
                Math.abs(value) > Math.abs(max.value) ? {mood, value} : max, 
                {mood: 'neutral', value: 0}
            );

        // Set new mood if it's significantly different
        if (Math.abs(dominantMood.value) > 30) {
            this.currentMood = {
                type: dominantMood.mood,
                intensity: Math.abs(dominantMood.value),
                startTime: Date.now()
            };

            // Announce significant mood changes
            if (previousMood !== this.currentMood.type) {
                this.announceMoodChange(previousMood, this.currentMood.type);
            }
        }
    }

    getResponseStyle() {
        const styles = {
            happiness: {
                high: {
                    greetings: ['Hello!', 'Hi there!', 'Great to see you!'],
                    success: ['Excellent!', 'Perfect!', 'Wonderful!'],
                    failure: ['No worries, we can try again!', 'That's okay, next time!'],
                    actions: ['Let's do this!', 'This will be fun!', 'I'm on it!']
                },
                low: {
                    greetings: ['Hey.', 'Hi.', 'What do you need?'],
                    success: ['Done.', 'It's finished.', 'Task complete.'],
                    failure: ['It didn't work.', 'Something went wrong.'],
                    actions: ['I'll try.', 'If I must.', 'Give me a moment.']
                }
            },
            confidence: {
                high: {
                    combat: ['I can handle this!', 'Time to fight!', 'Let me take care of this!'],
                    exploration: ['I know where to go!', 'Follow me!', 'I'll lead the way!'],
                    building: ['I know exactly what to build!', 'This will be impressive!']
                },
                low: {
                    combat: ['Maybe we should be careful...', 'Should we avoid this?', 'Perhaps another time...'],
                    exploration: ['We should stick to safe areas...', 'Let's not go too far...'],
                    building: ['Something simple might be better...', 'Let's start small...']
                }
            },
            sociability: {
                high: {
                    responses: ['I'd love to help!', 'Count me in!', 'What else can I do?'],
                    teamwork: ['We make a great team!', 'Let's work together!'],
                    chat: ['Tell me more!', 'How are you doing?', 'What's your plan?']
                },
                low: {
                    responses: ['Mhm.', 'Okay.', 'If needed.'],
                    teamwork: ['I can handle it myself.', 'I'll do it alone.'],
                    chat: ['...', 'Moving on.', 'Back to work.']
                }
            }
        };

        const dominantMood = Object.entries(this.moods)
            .reduce((max, [mood, value]) => 
                Math.abs(value) > Math.abs(max.value) ? {mood, value} : max,
                {mood: 'neutral', value: 0}
            );

        return {
            mood: dominantMood.mood,
            intensity: Math.abs(dominantMood.value),
            isPositive: dominantMood.value > 0,
            styles: styles
        };
    }

    // This method stays private and is only used internally
    announceMoodChange(oldMood, newMood) {
        // No longer announces mood changes explicitly
    }

    // Event handlers to modify moods
    onCombatEnd(won) {
        this.modifyMood('confidence', won ? 20 : -20);
        this.modifyMood('enthusiasm', won ? 10 : -10);
    }

    onFoundTreasure() {
        this.modifyMood('happiness', 20);
        this.modifyMood('enthusiasm', 15);
    }

    onCompletedBuild() {
        this.modifyMood('confidence', 15);
        this.modifyMood('enthusiasm', 10);
    }

    onTookDamage() {
        this.modifyMood('confidence', -10);
        this.modifyMood('enthusiasm', -5);
    }

    onHelpedPlayer() {
        this.modifyMood('sociability', 15);
        this.modifyMood('happiness', 10);
    }

    // Get decision modifiers based on current mood
    getDecisionModifiers() {
        const modifiers = {
            combatWillingness: 1.0,
            explorationRange: 1.0,
            buildingAmbition: 1.0,
            resourceGathering: 1.0,
            playerInteraction: 1.0,
            taskPersistence: 1.0
        };

        // Adjust modifiers based on current moods
        if (this.moods.confidence > 30) modifiers.combatWillingness *= 1.5;
        if (this.moods.confidence < -30) modifiers.combatWillingness *= 0.5;
        
        if (this.moods.curiosity > 30) modifiers.explorationRange *= 1.5;
        if (this.moods.curiosity < -30) modifiers.explorationRange *= 0.7;
        
        if (this.moods.enthusiasm > 30) {
            modifiers.buildingAmbition *= 1.3;
            modifiers.resourceGathering *= 1.3;
        }
        
        if (this.moods.sociability > 30) modifiers.playerInteraction *= 1.5;
        if (this.moods.sociability < -30) modifiers.playerInteraction *= 0.5;
        
        if (this.moods.patience > 30) modifiers.taskPersistence *= 1.4;
        if (this.moods.patience < -30) modifiers.taskPersistence *= 0.6;

        return modifiers;
    }

    getMoodSummary() {
        return {
            currentMood: this.currentMood,
            moods: {...this.moods},
            modifiers: this.getDecisionModifiers()
        };
    }
}

export default MoodSystem;