const fs = require("fs");
const { execFileSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");

function writeWav(filename, freq = 600, duration = 0.08) {
  const sampleRate = 44100;
  const samples = Math.floor(duration * sampleRate);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const value =
      Math.sin(2 * Math.PI * freq * t) *
      Math.exp(-25 * t) *
      32767;

    buffer.writeInt16LE(value, 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
}

function generateMp3(name, freq, duration = 0.08) {
  const wavFile = `${name}.wav`;
  const mp3File = `${name}.mp3`;

  writeWav(wavFile, freq, duration);

  execFileSync(ffmpeg, [
    "-y",
    "-i", wavFile,
    "-codec:a", "libmp3lame",
    "-qscale:a", "2",
    mp3File
  ]);

  fs.unlinkSync(wavFile);
  console.log(`Created ${mp3File}`);
}

generateMp3("move", 650, 0.07);
generateMp3("capture", 360, 0.09);
generateMp3("check", 900, 0.12);
generateMp3("castle", 550, 0.12);
generateMp3("game-end", 220, 0.25);

console.log("All chess MP3 sounds generated.");