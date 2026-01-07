const axios = require('axios');
const { fromBuffer } = require('file-type');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

class VertexAI {
  constructor() {
    this.api_url = 'https://firebasevertexai.googleapis.com/v1beta';
    this.model_url = 'projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models';
    this.headers = {
      'content-type': 'application/json',
      'x-goog-api-client': 'gl-kotlin/2.1.0-ai fire/16.5.0',
      'x-goog-api-key': 'AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk'
    };
    this.ratio = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    this.model = {
      search: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
      chat: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'],
      image_gemini: ['gemini-2.0-flash-preview-image-generation'],
      image_imagen: ['imagen-3.0-generate-002', 'imagen-4.0-generate-preview-06-06'],
      tts: ['gemini-2.5-flash-preview-tts']
    };
  }

  async chat(question, { model = 'gemini-2.0-flash', system_instruction = null, file_buffer = null, search = false } = {}) {
    if (!question) throw new Error('Question is required');
    if (!this.model.chat.includes(model)) throw new Error(`Model chat tidak valid: ${model}`);

    const parts = [{ text: question }];
    if (file_buffer) {
      const { mime } = await fromBuffer(file_buffer);
      parts.unshift({
        inlineData: {
          mimeType: mime,
          data: file_buffer.toString('base64')
        }
      });
    }

    const payload = {
      model: `${this.model_url}/${model}`,
      contents: [
        ...(system_instruction ? [{
          role: 'model',
          parts: [{ text: system_instruction }]
        }] : []),
        {
          role: 'user',
          parts: parts
        }
      ],
      ...(search ? {
        tools: [{ googleSearch: {} }]
      } : {})
    };

    const res = await axios.post(`${this.api_url}/${this.model_url}/${model}:generateContent`, payload, {
      headers: this.headers
    });

    if (res.status !== 200) throw new Error('Request gagal ke Gemmy');
    return res.data.candidates;
  }

  async image(prompt, { model = 'gemini-2.0-flash-preview-image-generation', aspect_ratio = '1:1' } = {}) {
    if (!prompt) throw new Error('Prompt is required');

    const isGeminiImageModel = this.model.image_gemini.includes(model);
    const isImagenModel = this.model.image_imagen.includes(model);

    if (!isGeminiImageModel && !isImagenModel)
      throw new Error(`Model image tidak valid: ${model}`);

    let payload, endpoint;

    if (isGeminiImageModel) {
      payload = {
        model: `${this.model_url}/${model}`,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      };
      endpoint = 'generateContent';
    } else {
      if (!this.ratio.includes(aspect_ratio)) throw new Error(`Aspect ratio tidak valid: ${aspect_ratio}`);

      payload = {
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          includeRaiReason: true,
          aspectRatio: aspect_ratio,
          personGeneration: 'allow_adult',
          safetySetting: 'block_only_high',
          addWatermark: false,
          imageOutputOptions: {
            mimeType: 'image/jpeg',
            compressionQuality: 100
          }
        }
      };
      endpoint = 'predict';
    }

    const res = await axios.post(`${this.api_url}/${this.model_url}/${model}:${endpoint}`, payload, {
      headers: this.headers
    });

    if (res.status !== 200) throw new Error('Request image gagal ke Gemmy');
    return isGeminiImageModel ? res.data.candidates : res.data.predictions;
  }

  async tts(text, { model = 'gemini-2.5-flash-preview-tts', delay = 1000, system_instruction = '[selalu gunakan bahasa indonesia, selalu gunakan gaya bicara yang imut dan gemesin, selalu gunakan nada lemas, lelah, seperti setelah melakukan hubungan seksual.]' } = {}) {
    if (!text) throw new Error('Text is required');

    const body = {
      contents: [
        {
          role: 'model',
          parts: [{ text: system_instruction }]
        },
        { 
          role: 'user', 
          parts: [{ text }] 
        }
      ],
      generationConfig: {
        responseModalities: ['audio'],
        temperature: 1,
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: 'Leda'
            }
          }
        }
      }
    };

    let attempt = 1;

    while (true) {
      try {
        console.log(`TTS attempt ${attempt}...`);

        const response = await axios.post(
          `${this.api_url}/${this.model_url}/${model}:generateContent`,
          body,
          { headers: this.headers }
        );

        if (!response.data?.candidates || !response.data.candidates[0]) {
          throw new Error('No candidates in response');
        }

        if (!response.data.candidates[0]?.content?.parts) {
          throw new Error('No content parts in response');
        }

        const allParts = response.data.candidates[0].content.parts;
        const audioDataParts = allParts.filter(part => part.inlineData);

        if (audioDataParts.length === 0) {
          throw new Error('No audio data found in response');
        }

        const combinedAudioData = audioDataParts
          .map(part => part.inlineData.data)
          .join('');

        const oggBuffer = await this.convertPCMToOggOpus(combinedAudioData);

        console.log(`TTS berhasil pada attempt ${attempt}`);
        return oggBuffer;
      } catch (e) {
        console.error(`TTS attempt ${attempt} gagal:`, e.message || e);

        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));

        delay = Math.min(delay * 1.2, 60000);
        attempt++;
      }
    }
  }

  async convertPCMToOggOpus(base64Data) {
    return new Promise((resolve, reject) => {
      const pcmBuffer = Buffer.from(base64Data, 'base64');
      const inputStream = new PassThrough();
      const outputChunks = [];

      inputStream.end(pcmBuffer);

      const outputStream = new PassThrough();

      outputStream.on('data', chunk => {
        outputChunks.push(chunk);
      });

      outputStream.on('end', () => {
        resolve(Buffer.concat(outputChunks));
      });

      outputStream.on('error', reject);

      ffmpeg(inputStream)
        .inputOptions(['-f', 's16le', '-ar', '24000', '-ac', '1'])
        .toFormat('ogg')
        .audioCodec('libopus')
        .audioBitrate(64)
        .audioFrequency(24000)
        .audioChannels(1)
        .outputOptions(['-compression_level', '10'])
        .on('error', error => {
          console.error('FFmpeg error:', error);
          reject(error);
        })
        .on('end', () => {
          console.log('Conversion to OGG Opus completed');
        })
        .pipe(outputStream);
    });
  }
}

module.exports = VertexAI;