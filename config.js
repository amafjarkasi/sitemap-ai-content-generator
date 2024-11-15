// config.js
module.exports = {
    openai: {
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        maxTokens: 800
    },
    processing: {
        maxWorkers: 3,
        rateLimit: 2000,
        retries: 3,
        timeout: 1000 // Change timeout to 1000 ms
    },
    articles: {
        percentage: 10,
        minArticles: 1,
        maxArticles: 2,
        minWords: 500
    },
    output: {
        outputDir: 'output'
    },
    states: ['NJ', 'NY', 'PA']
};