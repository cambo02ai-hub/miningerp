import { getIdCardDesignSettings } from './idCardSettings';

export interface ProcessPhotoResult {
  editedPhotoUrl: string;
  processedByAi: boolean;
  message: string;
}

/**
 * Processes an uploaded employee photo with CometAPI (gemini-3.1-flash-lite-image)
 * to match reference uniform clothing and background.
 * Falls back to original uploaded photo if API key is missing or request fails.
 */
export async function processEmployeePhotoWithGemini(
  photoDataUrl: string
): Promise<ProcessPhotoResult> {
  if (!photoDataUrl) {
    return {
      editedPhotoUrl: '',
      processedByAi: false,
      message: 'No photo provided',
    };
  }

  const settings = getIdCardDesignSettings();
  const apiKey = (import.meta as any).env?.VITE_COMET_API_KEY || (window as any).__COMET_API_KEY__ || '';
  const apiUrl = (import.meta as any).env?.VITE_COMET_API_URL || 'https://api.cometapi.com';
  const modelName = 'gemini-3.1-flash-lite-image';

  // Extract base64 and mime type
  const mimeMatch = photoDataUrl.match(/^data:(image\/[a-zA-Z]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = photoDataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  if (apiKey) {
    try {
      const promptText = `Edit this headshot photo to wear the company polo shirt uniform (light blue polo shirt with "${settings.companyName}" company embroidery) and clean background. Maintain exact facial features.`;
      const endpoint = `${apiUrl.replace(/\/+$/, '')}/v1beta/models/${modelName}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        // Look for inline image response or candidate text
        const parts = json?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inline_data || p.inlineData);
        if (imagePart) {
          const resData = imagePart.inline_data || imagePart.inlineData;
          const resMime = resData.mime_type || resData.mimeType || 'image/png';
          const resBase64 = resData.data;
          return {
            editedPhotoUrl: `data:${resMime};base64,${resBase64}`,
            processedByAi: true,
            message: 'Gemini AI ဖြင့် ဝတ်စုံနှင့် ပုံရိပ် အလိုအလျောက် ပြုပြင်ပြီးပါပြီ။',
          };
        }
      }
    } catch (err: any) {
      console.warn('CometAPI Gemini image processing error, using fallback:', err?.message);
    }
  }

  // Fallback: Return original uploaded photo with fallback message
  return {
    editedPhotoUrl: photoDataUrl,
    processedByAi: false,
    message: 'မူရင်း Upload တင်ထားသော ဓာတ်ပုံကို ID Card တွင် အသုံးပြုထားပါသည်။',
  };
}
