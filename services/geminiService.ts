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

export const replaceProductInImage = async (
  productImages: ImageFile[],
  marketingImage: ImageFile,
  feedback?: string
): Promise<{ image: string | null; text: string | null }> => {
  // Ensure the API key is available
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please ensure it is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct the prompt parts
  const productParts = productImages.map(fileToGenerativePart);
  const marketingPart = fileToGenerativePart(marketingImage);

  const baseTextPrompt = `
    You are an expert photorealistic image editor AI. Your primary function is to replace products in images.
    
    Attached are ${productImages.length} images of the new product. Use these as a reference.
    
    The final attached image is the marketing image where you will replace the existing product.
    
    Your task:
    1.  Identify the main product in the marketing image.
    2.  Seamlessly replace it with the new product from the reference images.
    3.  Match the lighting, shadows, perspective, and scale of the original image for a photorealistic result.
    4.  The background and all other elements of the marketing image must remain completely unchanged.
    
    Output requirements:
    - YOU MUST output the modified image as the primary result.
    - An image output is mandatory. Do not respond with only text.
    - If you cannot fulfill the request for any reason, explain why in the text part, but prioritize generating an image if at all possible.
    - You can also provide a brief text description of the edit alongside the mandatory image.
  `;

  const feedbackText = feedback
    ? `\n\n---
PREVIOUS ATTEMPT FEEDBACK: The user was not satisfied with the last generated image. Please address the following feedback to improve the result: "${feedback}"
Analyze this feedback carefully and generate a new image that corrects the specified issues.
---`
    : '';

  const textPrompt = `${baseTextPrompt}${feedbackText}`;


  const promptParts: Part[] = [
    ...productParts,
    marketingPart,
    { text: textPrompt },
  ];

  try {
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

    return { image: resultImage, text: resultText };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
};