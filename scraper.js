const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { URL } = require('url');
const cliProgress = require('cli-progress');
const colors = require('colors');
const config = require('./config');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).argv;

const exclusionFilePath = 'exclusions.txt'; // Path to the exclusion file

async function readExclusionFile() {
    try {
        await fs.access(exclusionFilePath);
        const data = await fs.readFile(exclusionFilePath, 'utf-8');
        return data.split('\n').map(word => word.trim()).filter(word => word.length > 0);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Exclusion file not found: ${exclusionFilePath}. No keywords will be excluded.`);
            return [];
        } else {
            console.error(`Error reading exclusion file: ${error.message}`);
            return [];
        }
    }
}

// Ensure OpenAI API key is set
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not set. Please set it in the .env file.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MAX_WORKERS = config.MAX_WORKERS;
const RATE_LIMIT_DELAY = config.RATE_LIMIT_DELAY;
const stateAbbreviations = config.STATE_ABBREVIATIONS;
const outputDir = argv.outputDir || config.OUTPUT_DIR;

// Validate configuration values
if (typeof MAX_WORKERS !== 'number' || MAX_WORKERS <= 0) {
    throw new Error('Invalid MAX_WORKERS value in config.js');
}
if (typeof RATE_LIMIT_DELAY !== 'number' || RATE_LIMIT_DELAY <= 0) {
    throw new Error('Invalid RATE_LIMIT_DELAY value in config.js');
}
if (!Array.isArray(stateAbbreviations) || stateAbbreviations.length === 0) {
    throw new Error('Invalid STATE_ABBREVIATIONS value in config.js');
}

// Generate a timestamp for file naming
function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

// Create a progress bar for a given domain
function createProgressBar(domain) {
    return new cliProgress.SingleBar({
        format: colors.magenta(`${domain} |{bar}| {percentage}%`),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);
}

// Validate if a keyword is valid (at least two words)
function isValidKeyword(keyword) {
    const words = keyword.split(' ').filter(word => word.trim());
    return words.length >= 2;
}

// Check if a phrase contains a state abbreviation
function containsStateAbbreviation(phrase) {
    return stateAbbreviations.some(state => phrase.endsWith(state));
}

// Process a sitemap URL and extract keywords and phrases
async function processSitemap(sitemapUrl, excludedKeywords) {
    const domain = new URL(sitemapUrl).hostname;
    const timestamp = getTimestamp();
    const domainOutputDir = path.join(outputDir, `${domain}_${timestamp}`);
    let randomKeyword = 'None';
    
    try {
        await fs.mkdir(domainOutputDir, { recursive: true });
        
        const response = await axios.get(sitemapUrl);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        const { keywords, phrases } = result.urlset.url
            .map(urlEntry => urlEntry.loc[0])
            .filter(url => !/(blog|blogs|blogging|blog-post|blog-posts)/i.test(url))
            .map(url => {
                const withoutDomain = url.replace(/^https?:\/\/[^\/]+/, '');
                const withoutSlashes = withoutDomain.replace(/^\/|\/$/g, '').replace(/\.html$|\.php$/g, '');
                const words = withoutSlashes.replace(/-/g, ' ')
                    .split(' ')
                    .filter(word => word.trim().length > 0);
                
                const transformedWords = words.map((word, index) => {
                    if (index === words.length - 1 && stateAbbreviations.includes(word.toUpperCase())) {
                        return word.toUpperCase();
                    }
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                });
                
                return transformedWords.join(' ');
            })
            .filter(text => text.length > 0)
            .reduce((acc, phrase) => {
                if (containsStateAbbreviation(phrase) && isValidKeyword(phrase) && !excludedKeywords.includes(phrase)) {
                    acc.keywords.push(phrase);
                } else if (!containsStateAbbreviation(phrase) && isValidKeyword(phrase) && !excludedKeywords.includes(phrase)) {
                    acc.phrases.push(phrase);
                }
                return acc;
            }, { keywords: [], phrases: [] });

        await Promise.all([
            fs.writeFile(path.join(domainOutputDir, `keywords_${timestamp}.txt`), keywords.join('\n')),
            fs.writeFile(path.join(domainOutputDir, `phrases_${timestamp}.txt`), phrases.join('\n'))
        ]);

        if (keywords.length > 0) {
            randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
            const article = await generateArticle(randomKeyword);
            const safeFileName = randomKeyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            await fs.writeFile(path.join(domainOutputDir, `${safeFileName}_${timestamp}.txt`), article);
        }

        return {
            domain,
            outputDir: domainOutputDir,
            keywordCount: keywords.length,
            phraseCount: phrases.length,
            processedKeyword: randomKeyword
        };
    } catch (error) {
        throw new Error(`Error processing ${domain}: ${error.message}`);
    }
}

// Generate an article using OpenAI GPT-3.5
async function generateArticle(keyword) {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
            
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a professional content writer specializing in local service businesses." },
                    { role: "user", content: `Write a 500 word SEO-optimized article about ${keyword}. Include specific details about the service, how the area is being served, benefits to customers, and end with a clear call to action` }
                ],
                temperature: 0.7,
                max_tokens: 800
            });

            return completion.choices[0].message.content;
        } catch (error) {
            attempts++;
            console.error(`Attempt ${attempts} failed for ${keyword}: ${error.message}`);
            if (attempts === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY * attempts));
        }
    }
}

// Main function to orchestrate the entire process
async function main() {
    const excludedKeywords = await readExclusionFile();
    const sitemaps = await fs.readFile('sitemaps.txt', 'utf-8');
    const sitemapUrls = sitemaps.split('\n').filter(url => url.trim());
    const workers = new Map();
    const results = [];
    const progressBars = new Map();

    console.log(`Processing ${sitemapUrls.length} sitemaps...`);

    for (const sitemapUrl of sitemapUrls) {
        while (workers.size >= MAX_WORKERS) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        const domain = new URL(sitemapUrl).hostname;
        const progressBar = createProgressBar(domain);
        progressBar.start(100, 0);
        progressBars.set(domain, progressBar);

        const worker = new Worker(__filename, { workerData: { sitemapUrl, excludedKeywords } });
        workers.set(worker, sitemapUrl);

        worker.on('message', result => {
            if (result.error) {
                console.error(`\nFailed processing ${sitemapUrl}: ${result.error}`);
                progressBars.get(domain).stop();
            } else {
                progressBars.get(domain).update(100);
                results.push(result);
                console.log(`\nCompleted ${result.domain}: ${result.keywordCount} keywords, ${result.phraseCount} phrases`);
            }
        });

        worker.on('error', error => {
            console.error(`\nWorker error for ${sitemapUrl}:`, error);
            progressBars.get(domain).stop();
        });

        worker.on('exit', () => {
            workers.delete(worker);
            progressBars.get(domain).stop();
        });

        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }

    while (workers.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const timestamp = getTimestamp();
    const summaries = results.map(r => 
        `${r.domain}: ${r.keywordCount} keywords, ${r.phraseCount} phrases, processed keyword: ${r.processedKeyword}`
    );
    
    await Promise.all(results.map(async r => {
        await fs.writeFile(path.join(r.outputDir, `summary_${timestamp}.txt`), 
            summaries.find(s => s.startsWith(r.domain))
        );
    }));

    const totalArticles = results.filter(r => r.processedKeyword !== 'None').length;
    console.log(`\nAll processing complete. ${totalArticles} articles generated. See output folders for details.`);
}

// Check if the script is running in the main thread or as a worker
if (!isMainThread) {
    const { sitemapUrl, excludedKeywords } = workerData;
    processSitemap(sitemapUrl, excludedKeywords)
        .then(result => parentPort.postMessage(result))
        .catch(error => parentPort.postMessage({ error: error.message }));
} else {
    main().catch(console.error);
}