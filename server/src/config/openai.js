const OpenAI = require('openai');

let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey || apiKey.includes('your_openai_api_key') || apiKey === '') {
  throw new Error('OpenAI API key not configured. Please set a valid key in .env');
}
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
};

module.exports = { getOpenAIClient };
