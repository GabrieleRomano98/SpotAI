# Adding Gemini API Key to Cloud Run

Your SpotAI deployment now uses Google Gemini AI. You need to add the API key as an environment variable in Cloud Run.

## Steps

1. **Get your Gemini API key:**
   - Go to: https://aistudio.google.com/app/apikey
   - Create a new API key or copy existing one

2. **Add to Cloud Run:**
   - Go to: https://console.cloud.google.com/run
   - Click on your `spotai` service
   - Click **Edit & Deploy New Revision**
   - Scroll to **Variables & Secrets**
   - Click **Add Variable**
   - Name: `GEMINI_API_KEY`
   - Value: Paste your API key
   - Click **Deploy**

3. **Wait for deployment** (2-3 minutes)

4. **Test your app** - The AI should now respond with Gemini-generated answers!

## For Local Development

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API key:
   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Restart the server

## Note

The deployment from the latest push will still use the old "AI answer" placeholder until you add the API key to Cloud Run.
