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
  marketingImage: ImageFile
): Promise<{ image: string | null; text: string | null }> => {
  // Ensure the API key is available
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please ensure it is configured.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct the prompt parts
  const productParts = productImages.map(fileToGenerativePart);
  const marketingPart = fileToGenerativePart(marketingImage);

  const textPrompt = `
    You are an expert in photo editing. Your task is to replace a product in a marketing image with a new product.
    
    Attached are ${productImages.length} images of the new product. Use these as a reference to understand the new product from multiple angles.
    
    The final image attached is the marketing image which contains the product to be replaced.
    
    Instructions:
    1.  Identify the main product in the marketing image that is meant to be replaced.
    2.  Replace that product with the new product from the reference images.
    3.  The replacement must be seamless and photorealistic. You must match the lighting, shadows, perspective, and scale of the original marketing image.
    4.  ABSOLUTELY DO NOT change anything else in the marketing image. The background, any text, other objects, or people must remain completely untouched. Your only job is to replace the product.
    5.  Return only the modified image. You can optionally return a short text description of the changes made.
  `;

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
        if(!resultText){
             throw new Error("The AI model did not return an image or text. Please try again with clearer images.");
        }
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
