import { pipeline } from '@xenova/transformers';

class MinecraftAI {
    constructor() {
        this.pipe = null;
        this.context = '';
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize the AI model
            this.pipe = await pipeline('text-generation', 'Xenova/DialoGPT-small');
            console.log('AI Model loaded successfully!');
        } catch (error) {
            console.error('Error loading AI model:', error);
        }
    }

    // Function to maintain conversation context
    updateContext(username, message, botState) {
        const stateInfo = `Current status: Health=${botState.health}/20, Hunger=${botState.food}/20, ` +
                         `Time=${botState.timeOfDay > 12000 ? 'night' : 'day'}, ` +
                         `Holding=${botState.holding}, Players nearby=${botState.nearbyPlayers.join(', ')}. `;
        
        this.context = `${stateInfo}\n${username}: ${message}\nAI:`;
    }

    async getResponse(username, message, botState) {
        try {
            // Update conversation context with current game state
            this.updateContext(username, message, botState);

            // Generate response using the model
            const result = await this.pipe(this.context, {
                max_length: 100,
                temperature: 0.7,
                num_return_sequences: 1
            });

            // Extract and clean up the response
            let response = result[0].generated_text;
            response = response.split('AI:').pop().trim();
            response = response.split('\n')[0].trim();

            // Keep response length suitable for Minecraft chat
            if (response.length > 100) {
                response = response.substring(0, 97) + '...';
            }

            return response || "I'm not sure what to say to that.";

        } catch (error) {
            console.error('Error generating AI response:', error);
            return "I'm having trouble processing that right now.";
        }
    }
}

const AISystem = MinecraftAI;
export default AISystem;
