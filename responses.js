class ResponseManager {
    constructor(bot, moodSystem) {
        this.bot = bot;
        this.moodSystem = moodSystem;
        
        this.responses = {
            greeting: {
                happy: ["Hello!", "Hi there!", "Great to see you!"],
                neutral: ["Hi.", "Hello.", "Hey."],
                sad: ["... hi.", "What do you need?", "*nods*"]
            },
            success: {
                happy: ["Great!", "Perfect!", "That worked well!"],
                neutral: ["Done.", "Completed.", "Task finished."],
                sad: ["Finally done.", "At least it works.", "...finished."]
            },
            combat: {
                brave: ["I can handle this!", "Time to fight!", "Bring it on!"],
                neutral: ["I'll try my best.", "Let's deal with this.", "Ready to fight."],
                cautious: ["We should be careful...", "Maybe we should prepare more...", "Is this safe?"]
            },
            building: {
                inspired: ["I have a great idea!", "This will be amazing!", "Let me create something special!"],
                neutral: ["I can build that.", "Starting construction.", "I'll begin building."],
                unmotivated: ["Something simple would work.", "Just the basics then.", "A basic structure will do."]
            },
            exploration: {
                adventurous: ["Let's explore!", "I wonder what's out there!", "Time for adventure!"],
                neutral: ["We can look around.", "I'll scout ahead.", "Let's check the area."],
                hesitant: ["Maybe stay close to home...", "We should be careful.", "Not too far..."]
            },
            failure: {
                optimistic: ["We can try again!", "Next time will be better!", "Learning from mistakes!"],
                neutral: ["That didn't work.", "We should try something else.", "Let's try again."],
                pessimistic: ["I knew this wouldn't work...", "Whatever...", "*sigh*"]
            },
            helping: {
                eager: ["I'd love to help!", "Count me in!", "Let me assist!"],
                neutral: ["I can help.", "What do you need?", "How can I help?"],
                reluctant: ["If you really need help...", "... fine.", "Make it quick."]
            }
        };
    }

    getResponse(category, context = {}) {
        const moods = this.moodSystem.moods;
        let responseType;

        // Determine response type based on dominant mood
        if (moods.happiness > 30) responseType = category === 'helping' ? 'eager' : 'happy';
        else if (moods.happiness < -30) responseType = category === 'helping' ? 'reluctant' : 'sad';
        else if (moods.confidence > 30) responseType = 'brave';
        else if (moods.confidence < -30) responseType = 'cautious';
        else if (moods.enthusiasm > 30) responseType = 'inspired';
        else if (moods.enthusiasm < -30) responseType = 'unmotivated';
        else if (moods.curiosity > 30) responseType = 'adventurous';
        else if (moods.curiosity < -30) responseType = 'hesitant';
        else responseType = 'neutral';

        // Get response array for the category and type
        const responseArray = this.responses[category][responseType] || this.responses[category].neutral;

        // Pick random response from array
        return responseArray[Math.floor(Math.random() * responseArray.length)];
    }

    // Method to modify messages based on current mood
    modifyMessage(message) {
        const moods = this.moodSystem.moods;
        let modified = message;

        // Add mood-based punctuation and formatting
        if (moods.enthusiasm > 50) modified += '!';
        if (moods.enthusiasm < -50) modified = modified.toLowerCase() + '...';
        if (moods.confidence > 50) modified = modified.toUpperCase();
        if (moods.happiness < -30) modified = `*${modified}*`;

        return modified;
    }
}

export default ResponseManager;