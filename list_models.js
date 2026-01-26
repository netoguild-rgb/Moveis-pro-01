/**
 * List available Gemini models for the configured API key
 */

const API_KEY = 'AIzaSyAdygxV1LNWAMzUQdbIA-ZUPvdHQLIDycI';

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    console.log("📋 Fetching available Gemini models...\n");

    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
        console.log("Available models:");
        data.models.forEach(model => {
            console.log(`  - ${model.name} (${model.displayName})`);
            console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
        });
    } else {
        console.log("Error or no models:", data);
    }
}

listModels();
