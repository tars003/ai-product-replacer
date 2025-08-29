import { GoogleGenAI, Modality, Part } from "@google/genai";
import { ImageFile } from '../types';

// This function converts a base64 string to a GenerativePart object
const fileToGenerativePart = (image: ImageFile): Part => {
  // Expected format: "data:image/jpeg;base64,...."
  const matches = image.base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string format');
  }
  
  return {
    inlineData: {
      mimeType: matches[1], // e.g., "image/jpeg"
      data: matches[2],     // the actual base64 data
    },
  };
};

const getAnalysisInstruction = async (
  productImages: ImageFile[],
  marketingImage: ImageFile
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productParts = productImages.map(fileToGenerativePart);
  const marketingPart = fileToGenerativePart(marketingImage);

  const analysisPrompt = `
    You are a logical reasoning assistant for an advanced AI image editor. Your task is to analyze a set of reference product images and a target marketing image to create a single, precise instruction for the editor.

    1.  **Analyze the Target Image:** Carefully examine the target marketing image. Identify the primary product that needs to be replaced. Pay close attention to the quantity of the product (e.g., is it a single shoe, a pair of shoes, one bottle, a six-pack of bottles?).
    2.  **Analyze the Reference Images:** Examine the new product in the reference images.
    3.  **Create a Critical Instruction:** Based on your analysis, write a single, clear, and concise instruction sentence for the image editor. This instruction MUST prevent logical errors. For example, if the target image contains a single shoe and the reference images show a pair of shoes, your instruction MUST explicitly say to replace the single shoe with ONLY ONE shoe from the reference.

    **Example Output:** "Replace the single sneaker in the target image with a single sneaker from the reference images, ensuring only one shoe is depicted in the final result."

    Your output must be ONLY this single instruction sentence. Do not add any extra text, explanations, or greetings.
    `;

  const promptParts: Part[] = [
    ...productParts,
    marketingPart,
    { text: analysisPrompt },
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: promptParts },
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error during image analysis:", error);
    throw new Error("The AI failed to analyze the images for logical consistency.");
  }
};

const getQualityCheckFeedback = async (
  productImages: ImageFile[],
  originalImage: ImageFile,
  generatedImageBase64: string,
  instruction: string,
  originalText: string | null
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productParts = productImages.map(fileToGenerativePart);
  const originalPart = fileToGenerativePart(originalImage);
  const generatedPart: Part = {
    inlineData: {
      mimeType: 'image/png', // The generation model returns png
      data: generatedImageBase64,
    },
  };

  const analysisPrompt = `
    You are an expert Quality Assurance specialist for an AI image editor.
    Your task is to perform a detailed review of an image generation task. I will provide you with several images in this order:
    1. Reference images of the new product.
    2. The original marketing image.
    3. The final generated image.

    Your job is to provide a concise, one-paragraph critique by analyzing these images. Answer the following questions in your analysis:
    - **Product Accuracy:** Does the product in the **final generated image** accurately match the product from the **reference images**? Are the details, colors, and branding correct?
    - **Logical Consistency:** Compare the **final generated image** to the **original marketing image**. Are there any logical flaws? For example, was the correct number of items replaced (e.g., one shoe for one shoe)? Is the product placed believably in the scene?
    - **Instruction Adherence:** Did the generation follow this critical instruction: "${instruction}"?
    - **Integration Quality:** How well were lighting, shadows, and perspective matched between the new product and the original scene?
    - **Overall Realism:** Does the final image look photorealistic and free of noticeable flaws or artifacts?

    CRITICAL INSTRUCTION: "${instruction}"
    EDITOR's DESCRIPTION: "${originalText || 'No description provided.'}"

    Provide your final analysis as a single paragraph. Do not use markdown formatting.
    `;
  
  const promptParts: Part[] = [
    ...productParts,
    originalPart,
    generatedPart,
    { text: analysisPrompt },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: promptParts },
  });

  return response.text.trim();
};


export const replaceProductInImage = async (
  productImages: ImageFile[],
  marketingImage: ImageFile,
  feedback?: string,
  onProgress?: (message: string) => void
): Promise<{ image: string | null; text: string | null; qualityCheck: string | null }> => {
  // Ensure the API key is available
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please ensure it is configured.");
  }
  try {
    // Step 1: Analyze images for logical consistency
    onProgress?.('Step 1/3: Analyzing images...');
    const analysisInstruction = await getAnalysisInstruction(productImages, marketingImage);
    console.log("AI Analysis Instruction:", analysisInstruction);
    
    // Step 2: Generate the image with the analysis instruction
    onProgress?.('Step 2/3: Generating new image...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const productParts = productImages.map(fileToGenerativePart);
    const marketingPart = fileToGenerativePart(marketingImage);

    const baseTextPrompt = `
      You are an expert photorealistic image editor AI. Your function is to replace products in images.
      
      Attached are ${productImages.length} images of the new product for reference.
      The final attached image is the marketing image.
      
      ---
      CRITICAL INSTRUCTION FROM PRE-ANALYSIS: You must follow this instruction precisely to avoid logical errors.
      "${analysisInstruction}"
      ---
      
      Your task:
      1.  Strictly follow the 'CRITICAL INSTRUCTION' above.
      2.  Seamlessly replace the product in the marketing image with the new product.
      3.  Match the lighting, shadows, perspective, and scale of the original image for a photorealistic result.
      4.  The background and all other elements must remain completely unchanged.
      
      Output requirements:
      - YOU MUST output the modified image. An image output is mandatory.
      - You can provide a brief text description of the edit alongside the image.
    `;

    const feedbackText = feedback
      ? `\n\n---
PREVIOUS ATTEMPT FEEDBACK: The user was not satisfied. Address the following feedback: "${feedback}"
Analyze this feedback carefully and generate a new image that corrects the specified issues, while still following the CRITICAL INSTRUCTION.
---`
      : '';

    const textPrompt = `${baseTextPrompt}${feedbackText}`;


    const promptParts: Part[] = [
      ...productParts,
      marketingPart,
      { text: textPrompt },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: promptParts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    let resultImage: string | null = null;
    let resultText: string | null = null;

    if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                resultImage = part.inlineData.data;
            } else if (part.text) {
                resultText = part.text;
            }
        }
    }
    
    if (!resultImage) {
        console.warn("Model did not return an image.", response);
        const errorMessage = resultText 
            ? `The AI model failed to generate an image and responded with: "${resultText}"`
            : "The AI model did not return an image. This can be an intermittent issue. Please try again.";
        throw new Error(errorMessage);
    }
    
    // Step 3: Perform Quality Check
    onProgress?.('Step 3/3: Performing quality check...');
    let qualityCheck: string | null = null;
    try {
        qualityCheck = await getQualityCheckFeedback(
            productImages,
            marketingImage,
            resultImage,
            analysisInstruction,
            resultText
        );
    } catch (qcError) {
        console.warn("Quality check step failed:", qcError);
        qualityCheck = "The AI quality check could not be completed due to an error.";
    }


    return { image: resultImage, text: resultText, qualityCheck };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
};