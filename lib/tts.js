const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");

const api_url = "https://firebasevertexai.googleapis.com/v1beta";
const model_url =
  "projects/gemmy-ai-bdc03/locations/us-central1/publishers/google/models";
const headers = {
  "content-type": "application/json",
  "x-goog-api-client": "gl-kotlin/2.1.0-ai fire/16.5.0",
  "x-goog-api-key": "AIzaSyD6QwvrvnjU7j-R6fkOghfIVKwtvc7SmLk"
};

async function tts(text, { model = "gemini-2.5-flash-preview-tts", delay = 1000 } = {}) {
  if (!text) throw new Error("Text is required");

  const body = {
    contents: [
      {
        role: "model",
        parts: [
          {
            text: "[selalu gunakan bahasa indonesia, selalu gunakan gaya bicara yang imut dan gemesin, selalu gunakan nada lemas, lelah, seperti setelah melakukan hubungan seksual.]"
          }
        ]
      },
      { role: "user", parts: [{ text }] }
    ],
    generationConfig: {
      responseModalities: ["audio"],
      temperature: 1,
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: "Leda"
          }
        }
      }
    }
  };

  let attempt = 1;

  while (true) {
    try {
      const response = await axios.post(
        `${api_url}/${model_url}/${model}:generateContent`,
        body,
        { headers }
      );

      if (!response.data?.candidates || !response.data.candidates[0]) {
        throw new Error("No candidates in response");
      }

      if (!response.data.candidates[0]?.content?.parts) {
        throw new Error("No content parts in response");
      }

      const allParts = response.data.candidates[0].content.parts;
      const audioDataParts = allParts.filter(part => part.inlineData);

      if (audioDataParts.length === 0) {
        throw new Error("No audio data found in response");
      }

      const combinedAudioData = audioDataParts
        .map(part => part.inlineData.data)
        .join("");

      const oggBuffer = await convertPCMToOggOpus(combinedAudioData);
      return oggBuffer;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.2, 60000);
      attempt++;
    }
  }
}

function convertPCMToOggOpus(base64Data) {
  return new Promise((resolve, reject) => {
    const pcmBuffer = Buffer.from(base64Data, "base64");
    const inputStream = new PassThrough();
    const outputChunks = [];

    inputStream.end(pcmBuffer);

    const outputStream = new PassThrough();

    outputStream.on("data", chunk => {
      outputChunks.push(chunk);
    });

    outputStream.on("end", () => {
      resolve(Buffer.concat(outputChunks));
    });

    outputStream.on("error", reject);

    ffmpeg(inputStream)
      .inputOptions(["-f", "s16le", "-ar", "24000", "-ac", "1"])
      .toFormat("ogg")
      .audioCodec("libopus")
      .audioBitrate(64)
      .audioFrequency(24000)
      .audioChannels(1)
      .outputOptions(["-compression_level", "10"])
      .on("error", reject)
      .pipe(outputStream);
  });
}

module.exports = tts;
