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

## Prerequisites

- Node.js 14 or higher
- OpenAI API key
- Source sitemap URLs

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
