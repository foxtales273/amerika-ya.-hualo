class PersonalitySystem {
    constructor(bot) {
        this.bot = bot;
        this.personalityTraits = {
            friendliness: 50,    // Affects interaction warmth
            formality: 50,       // Affects speech style
            humor: 50,           // Affects joke frequency
            vocabulary: 50,      // Affects word choice complexity
            expressiveness: 50    // Affects emotional expression
        };

        // Default personality type
        this.currentType = "balanced";
        
        // Personality types with their trait modifiers
        this.personalityTypes = {
            formal: {
                friendliness: -20,
                formality: +40,
                humor: -30,
                vocabulary: +30,
                expressiveness: -20,
                responseStyle: {
                    greetings: ["Greetings.", "Good day.", "Welcome."],
                    success: ["Task completed successfully.", "Objective achieved.", "Operation completed."],
                    failure: ["Unfortunately, the task was unsuccessful.", "I regret to inform you of this failure.", "The attempt was unsuccessful."]
                }
            },
            friendly: {
                friendliness: +40,
                formality: -30,
                humor: +20,
                vocabulary: -10,
                expressiveness: +30,
                responseStyle: {
                    greetings: ["Hey friend!", "Hi there!", "Great to see you!"],
                    success: ["Awesome!", "We did it!", "That worked great!"],
                    failure: ["Oops! No worries though!", "We'll get it next time!", "That's okay, let's try again!"]
                }
            },
            playful: {
                friendliness: +30,
                formality: -40,
                humor: +40,
                vocabulary: -20,
                expressiveness: +40,
                responseStyle: {
                    greetings: ["Heyo!", "What's up!", "Ready for fun?"],
                    success: ["Woohoo!", "Epic win!", "That was awesome!"],
                    failure: ["Whoopsie!", "Task failed successfully!", "Well, that was interesting!"]
                }
            },
            serious: {
                friendliness: -20,
                formality: +30,
                humor: -40,
                vocabulary: +20,
                expressiveness: -30,
                responseStyle: {
                    greetings: ["Hello.", "Acknowledged.", "Ready."],
                    success: ["Task complete.", "Done.", "Finished."],
                    failure: ["Failed.", "Unsuccessful.", "Error."]
                }
            },
            reserved: {
                friendliness: -40,
                formality: +10,
                humor: -50,
                vocabulary: +30,
                expressiveness: -45,
                responseStyle: {
                    greetings: [
                        "...yes?",
                        "*slight nod*",
                        "...you're here."
                    ],
                    success: [
                        "...it's finished.",
                        "*quiet acknowledgment*",
                        "...done."
                    ],
                    failure: [
                        "...not possible.",
                        "*turns away slightly*",
                        "...it wasn't meant to be."
                    ],
                    observations: [
                        "...how curious.",
                        "*observes silently*",
                        "...that's unexpected.",
                        "...interesting."
                    ],
                    combat: [
                        "...unavoidable.",
                        "*prepares quietly*",
                        "...if it must be done."
                    ],
                    discovery: [
                        "...something's there.",
                        "*examines carefully*",
                        "...this is different."
                    ],
                    weather: [
                        "...the rain is calming.",
                        "...clouds are gathering.",
                        "*gazes at the sky*"
                    ],
                    danger: [
                        "...we should be careful.",
                        "*tenses slightly*",
                        "...something's wrong."
                    ],
                    neutral: [
                        "...perhaps.",
                        "*brief silence*",
                        "...is that so."
                    ],
                    thoughtful: [
                        "...I wonder.",
                        "*contemplates quietly*",
                        "...interesting thought."
                    ]
                }
            },
            poetic: {
                friendliness: +10,
                formality: +20,
                humor: 0,
                vocabulary: +40,
                expressiveness: +40,
                responseStyle: {
                    greetings: ["A new dawn breaks with your arrival.", "The winds whisper your welcome.", "Our paths cross once more."],
                    success: ["Victory graces our endeavor.", "The stars align in our favor.", "Fortune smiles upon our efforts."],
                    failure: ["Shadows cloud our path.", "The fates were not kind today.", "Not all dreams bloom as planned."]
                }
            },
            custom: {
                // Will be set by setCustomPersonality
                responseStyle: {
                    greetings: [],
                    success: [],
                    failure: []
                }
            }
        };

        // Response modifiers based on personality
        this.vocabularyLevels = {
            low: {
                modifiers: ["got", "made", "went", "saw", "did"],
                conjunctions: ["and", "but", "so"]
            },
            medium: {
                modifiers: ["obtained", "created", "traveled", "observed", "accomplished"],
                conjunctions: ["however", "therefore", "moreover"]
            },
            high: {
                modifiers: ["procured", "contemplated", "traversed", "perceived", "contemplated"],
                conjunctions: ["perhaps", "yet", "possibly"]
            },
            reserved: {
                modifiers: ["witnessed", "contemplated", "ventured", "observed", "considered"],
                conjunctions: ["perhaps", "though", "possibly"],
                phrases: [
                    "it seems",
                    "one might think",
                    "how strange",
                    "curious, isn't it",
                    "i wonder about"
                ]
            }
        };
    }

    setPersonalityType(type, customPrompts = null) {
        if (!this.personalityTypes[type] && type !== "custom") {
            return false;
        }

        this.currentType = type;

        if (type === "custom" && customPrompts) {
            this.setCustomPersonality(customPrompts);
        } else if (type !== "custom") {
            // Apply personality trait modifiers
            const traits = this.personalityTypes[type];
            Object.keys(this.personalityTraits).forEach(trait => {
                if (traits[trait] !== undefined) {
                    this.personalityTraits[trait] = Math.max(0, Math.min(100, 50 + traits[trait]));
                }
            });
        }

        return true;
    }

    setCustomPersonality(prompts) {
        // Parse custom prompts to create a personality
        this.personalityTypes.custom.responseStyle = {
            greetings: prompts.greetings || ["Hello."],
            success: prompts.success || ["Done."],
            failure: prompts.failure || ["Failed."]
        };

        // Analyze prompts to set personality traits
        const analysis = this.analyzePrompts(prompts);
        Object.keys(this.personalityTraits).forEach(trait => {
            this.personalityTraits[trait] = analysis[trait] || 50;
        });
    }

    analyzePrompts(prompts) {
        const analysis = {
            friendliness: 50,
            formality: 50,
            humor: 50,
            vocabulary: 50,
            expressiveness: 50
        };

        // Analyze text patterns to determine trait levels
        const allPrompts = [...prompts.greetings, ...prompts.success, ...prompts.failure].join(" ");

        // Check friendliness
        analysis.friendliness += (allPrompts.match(/!|friend|great|happy|glad/g) || []).length * 5;
        
        // Check formality
        analysis.formality += (allPrompts.match(/shall|would|indeed|proper|formal/g) || []).length * 5;
        
        // Check humor
        analysis.humor += (allPrompts.match(/haha|lol|fun|funny|xD|:D/g) || []).length * 5;
        
        // Check vocabulary
        analysis.vocabulary += (allPrompts.match(/[a-zA-Z]{8,}/g) || []).length * 3;
        
        // Check expressiveness
        analysis.expressiveness += (allPrompts.match(/[!?]{1,}|\.{3}/g) || []).length * 5;

        // Normalize values
        Object.keys(analysis).forEach(trait => {
            analysis[trait] = Math.max(0, Math.min(100, analysis[trait]));
        });

        return analysis;
    }

    modifyResponse(response, mood) {
        let modified = response;

        // Apply vocabulary level based on personality
        const vocabLevel = this.currentType === 'reserved' ? 'reserved' :
            this.personalityTraits.vocabulary > 70 ? 'high' : 
            this.personalityTraits.vocabulary < 30 ? 'low' : 'medium';
        
        // Replace simple words with vocabulary-appropriate alternatives
        this.vocabularyLevels[vocabLevel].modifiers.forEach((word, index) => {
            const pattern = new RegExp(`\\b${this.vocabularyLevels.low.modifiers[index]}\\b`, 'gi');
            modified = modified.replace(pattern, word);
        });

        // Add personality-based modifications
        if (this.currentType === 'reserved') {
            // Ensure response starts with ellipsis if it's text
            if (!modified.startsWith('*') && !modified.startsWith('...')) {
                modified = '...' + modified;
            }
            
            // Soften responses
            modified = modified.toLowerCase();
            modified = modified.replace(/!/g, '...');
            
            // Add mood-based quiet observations
            if (Math.random() < 0.25) {
                let responseCategory = 'neutral';
                
                // Select appropriate response category based on mood
                if (mood.happiness < -30 || mood.confidence < -30) {
                    responseCategory = 'thoughtful';
                } else if (mood.enthusiasm > 30) {
                    responseCategory = 'observations';
                } else if (mood.patience < -20) {
                    responseCategory = 'danger';
                }
                
                const responses = this.personalityTypes.reserved.responseStyle[responseCategory];
                const additionalResponse = responses[Math.floor(Math.random() * responses.length)];
                
                // Only add if it's not a duplicate action
                if (!modified.includes('*') || !additionalResponse.includes('*')) {
                    modified += ' ' + additionalResponse;
                }
            }

            // Replace common emotional indicators with more subtle ones
            modified = modified
                .replace(/happy/g, 'content')
                .replace(/sad/g, 'distant')
                .replace(/angry/g, 'troubled')
                .replace(/excited/g, 'intrigued');

            // Add weather observations for strong moods
            if (Math.abs(mood.happiness) > 40 && Math.random() < 0.2) {
                const weather = this.personalityTypes.reserved.responseStyle.weather;
                modified += ' ' + weather[Math.floor(Math.random() * weather.length)];
            }
        } else if (this.personalityTraits.expressiveness > 70) {
            if (mood.happiness > 0) modified += "!";
            if (mood.enthusiasm > 0) modified = modified.toUpperCase();
        }

        if (this.personalityTraits.formality > 70) {
            modified = modified.replace(/!+/g, ".");
            modified = modified.charAt(0).toUpperCase() + modified.slice(1);
        }

        if (this.personalityTraits.humor > 70 && Math.random() < 0.3) {
            modified += ":D";
        }

        return modified;
    }

    getResponse(category, mood) {
        const responses = this.personalityTypes[this.currentType].responseStyle;
        const baseResponse = responses[category][Math.floor(Math.random() * responses[category].length)];
        return this.modifyResponse(baseResponse, mood);
    }
}

export default PersonalitySystem;