# Sitemap Content Generator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14-green.svg)

A powerful Node.js tool that scrapes sitemaps, extracts keywords, and generates SEO-optimized content using OpenAI's GPT-3.5 API.

> 💡 Processes multiple sitemaps concurrently and generates unique content for each keyword

## Features

- ⚡️ Multi-threaded processing with Worker Threads
- 🎯 Location-specific keyword extraction (supports multiple state abbreviations)
- ✍️ AI-powered content generation
- 📊 Real-time progress visualization
- 🔄 Automatic rate limiting and retries
- 📁 Organized output with timestamps
- 🛠️ Keyword exclusion using an exclusion file

## Prerequisites

- Node.js 14 or higher
- OpenAI API key
- Source sitemap URLs

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your OpenAI API key:

```env
OPENAI_API_KEY=your-api-key-here
```

4. Create a `sitemaps.txt` file with target sitemap URLs (one per line):

```txt
https://example.com/sitemap.xml
```

## Configuration

Edit `config.js` to modify:

- OpenAI parameters (model, temperature, tokens)
- Processing settings (workers, rate limits, retries)
- Article generation settings
- Output directory
- Target states

Example `config.js`:

```javascript
module.exports = {
    MAX_WORKERS: 3,
    RATE_LIMIT_DELAY: 1000,
    MODEL: "gpt-3.5-turbo",
    MAX_TOKENS: 800,
    TEMPERATURE: 0.7,
    STATE_ABBREVIATIONS: ['NJ', 'NY', 'CA'],
    OUTPUT_DIR: 'output' // Default output directory
};
```

## Usage

Run the scraper:

```bash
node scraper.js
```

The tool will:
1. Load sitemaps from `sitemaps.txt`
2. Process each sitemap with `processSitemap` function
3. Extract keywords and phrases
4. Generate articles using `generateArticle` function
5. Save results in timestamped folders

## Output Structure

For each processed sitemap, creates a directory `output/{domain}_{timestamp}/` containing:

- `keywords_{timestamp}.txt` - Extracted keywords
- `phrases_{timestamp}.txt` - Extracted phrases 
- `{keyword}_{timestamp}.txt` - Generated articles
- `summary_{timestamp}.txt` - Processing summary

These changes will allow users to specify a custom output directory and improve the overall functionality and usability of the script.

## Exclusion File

Create an `exclusions.txt` file with keywords to exclude (one per line):

```txt
keyword1
keyword2
keyword3
```

## Functions

- `getTimestamp` - Generates timestamp for file naming
- `createProgressBar` - Creates progress visualization
- `isValidKeyword` - Validates extracted keywords
- `processSitemap` - Main sitemap processing logic
- `generateArticle` - OpenAI article generation
- `main` - Orchestrates the entire process

## Dependencies

See `package.json` for full list:
- axios - HTTP requests
- xml2js - XML parsing
- openai - OpenAI API client
- cli-progress - Progress bars
- colors - Terminal coloring

## License

MIT

## Contributing

Pull requests welcome. For major changes, please open an issue first.
