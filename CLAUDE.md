# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview
This is an AI-powered product replacement tool that allows users to upload product reference images and marketing images, then uses Google's Gemini AI to seamlessly replace products in marketing images. The application is built with React, TypeScript, and Vite, featuring a modern dark UI design.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (runs TypeScript compiler then Vite build)
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build locally

## Environment Setup

The application requires a Gemini API key:
- Create a `.env` file (not `.env.local` as mentioned in README)
- Set `API_KEY` environment variable to your Gemini API key
- The key is accessed via `process.env.API_KEY` and configured in vite.config.ts

## Architecture

### Core Application Flow
1. **Image Quality Analysis** (`analyzeReferenceImages`) - Validates product reference images
2. **Logical Consistency Check** - Analyzes images to prevent logical errors (e.g., replacing one shoe with two)
3. **Product Replacement** (`replaceProductInImage`) - Main AI generation process
4. **Quality Assessment** - Post-generation review of results

### Key Components
- `App.tsx` - Main application component with state management for the entire workflow
- `services/geminiService.ts` - Google Gemini AI integration with multi-step processing pipeline
- `components/ImageUploader.tsx` - File upload handling with base64 conversion
- `components/LogPanel.tsx` - Process logging and debugging interface
- `components/Header.tsx` - Application header
- `components/IconComponents.tsx` - Heroicons icon components

### State Management
The app uses React useState hooks for:
- Image files (product references and marketing image)
- Generation results and quality checks
- Loading states and error handling
- Logging system for AI process steps
- User feedback and retry mechanisms

### AI Integration
Uses Google Gemini models:
- `gemini-2.5-flash` - For analysis, feedback processing, and quality checks
- `gemini-2.5-flash-image-preview` - For actual image generation with multimodal output

### File Structure
- Root level contains main app files (App.tsx, index.tsx, types.ts)
- `components/` - React components
- `services/` - AI service integration
- No src/ directory - files are in project root
- TypeScript configuration includes root level files in compilation

## Common Development Patterns

### Error Handling
The app implements comprehensive error handling:
- API key validation
- Gemini API error catching and user-friendly messages
- Quality check failures are handled gracefully
- Loading states prevent multiple simultaneous operations

### Image Processing
- All images converted to base64 for AI processing
- Support for multiple image formats via FileReader API
- Image validation and file type checking
- Responsive image display with aspect ratio preservation

### Logging System
Detailed logging captures each AI interaction:
- Step-by-step process tracking
- Input prompts and images
- Model responses (text and generated images)
- Used for debugging and user transparency