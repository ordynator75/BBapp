const presets = [
  {
    id: "deep-sleep",
    name: "Głęboki sen",
    beat: 2,
    base: 180,
    duration: 30,
    description: "Fale delta 0.5–2.5 Hz, regeneracja fizyczna.",
  },
  {
    id: "yoga-nidra",
    name: "Yoga Nidra",
    beat: 5,
    base: 200,
    duration: 25,
    description: "Fale theta 4–6 Hz, ciało śpi, umysł przytomny.",
  },
  {
    id: "lucid-dreaming",
    name: "Świadome śnienie (LD)",
    beat: 8,
    base: 210,
    duration: 30,
    description: "Zakres 6–14 Hz, faza REM, świadomy sen.",
  },
  {
    id: "obe",
    name: "Wyjście z ciała (OBE)",
    beat: 6,
    base: 190,
    duration: 35,
    description: "6 Hz przechodzące w 15 Hz, stan transowy (MVP: start 6 Hz).",
  },
  {
    id: "unity",
    name: "Głęboka medytacja jedności",
    beat: 6,
    base: 160,
    duration: 40,
    description: "4–7 Hz z dodatkiem 40 Hz gamma (MVP: theta).",
  },
  {
    id: "flow",
    name: "Flow / kreatywność",
    beat: 12,
    base: 220,
    duration: 20,
    description: "10–14 Hz (alpha + beta), kreatywna koncentracja.",
  },
  {
    id: "focus",
    name: "Koncentracja / nauka",
    beat: 16,
    base: 220,
    duration: 25,
    description: "14–18 Hz (mid-beta), skupienie poznawcze.",
  },
  {
    id: "relax",
    name: "Relaksacja / redukcja lęku",
    beat: 7,
    base: 200,
    duration: 20,
    description: "6–8 Hz (theta/alpha), wyciszenie.",
  },
  {
    id: "energy",
    name: "Pobudzenie / energia",
    beat: 20,
    base: 240,
    duration: 15,
    description: "18–30 Hz (high beta/gamma), motywacja i aktywizacja.",
  },
];

const presetSelect = document.getElementById("preset");
const presetDetails = document.getElementById("presetDetails");
const baseFrequencyInput = document.getElementById("baseFrequency");
const beatFrequencyInput = document.getElementById("beatFrequency");
const durationInput = document.getElementById("duration");
const volumeInput = document.getElementById("volume");
const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const stopButton = document.getElementById("stop");
const statusLabel = document.getElementById("status");
const testLeftButton = document.getElementById("testLeft");
const testRightButton = document.getElementById("testRight");
const exportButton = document.getElementById("export");
const exportStatus = document.getElementById("exportStatus");

let audioContext = null;
let currentNodes = null;
let isPlaying = false;
let timerId = null;
let remainingSeconds = 0;

const formatTime = (value) => {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const populatePresets = () => {
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.name;
    presetSelect.append(option);
  });
};

const applyPreset = (presetId) => {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) return;
  baseFrequencyInput.value = preset.base;
  beatFrequencyInput.value = preset.beat;
  durationInput.value = preset.duration;
  presetDetails.textContent = preset.description;
};

const ensureAudioContext = () => {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContext();
  }
  return audioContext;
};

const createBinauralNodes = (context) => {
  const base = Number(baseFrequencyInput.value);
  const beat = Number(beatFrequencyInput.value);
  const volume = Number(volumeInput.value);

  const leftOsc = context.createOscillator();
  const rightOsc = context.createOscillator();
  const leftGain = context.createGain();
  const rightGain = context.createGain();
  const masterGain = context.createGain();
  const merger = context.createChannelMerger(2);

  leftOsc.frequency.value = base;
  rightOsc.frequency.value = base + beat;
  leftGain.gain.value = 1;
  rightGain.gain.value = 1;
  masterGain.gain.value = volume;

  leftOsc.connect(leftGain).connect(merger, 0, 0);
  rightOsc.connect(rightGain).connect(merger, 0, 1);
  merger.connect(masterGain).connect(context.destination);

  return {
    leftOsc,
    rightOsc,
    leftGain,
    rightGain,
    masterGain,
  };
};

const updateStatus = (message) => {
  statusLabel.textContent = message;
};

const clearTimer = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const updateRemainingTime = () => {
  if (remainingSeconds <= 0) {
    stopPlayback();
    updateStatus("Sesja zakończona");
    return;
  }
  updateStatus(`Odtwarzanie binaural beats (pozostało ${formatTime(remainingSeconds)})`);
  remainingSeconds -= 1;
};

const startTimer = () => {
  clearTimer();
  updateRemainingTime();
  timerId = setInterval(updateRemainingTime, 1000);
};

const startPlayback = async () => {
  const context = ensureAudioContext();

  if (context.state === "suspended") {
    await context.resume();
    isPlaying = true;
    startTimer();
    toggleControls();
    return;
  }

  if (isPlaying) return;

  const durationMinutes = Number(durationInput.value);
  remainingSeconds = durationMinutes * 60;

  currentNodes = createBinauralNodes(context);
  currentNodes.leftOsc.start();
  currentNodes.rightOsc.start();
  isPlaying = true;
  startTimer();
  toggleControls();
};

const pausePlayback = async () => {
  if (!audioContext) return;
  await audioContext.suspend();
  isPlaying = false;
  clearTimer();
  updateStatus("Pauza");
  toggleControls();
};

const stopPlayback = () => {
  if (!audioContext || !currentNodes) return;
  currentNodes.leftOsc.stop();
  currentNodes.rightOsc.stop();
  currentNodes.leftOsc.disconnect();
  currentNodes.rightOsc.disconnect();
  currentNodes.leftGain.disconnect();
  currentNodes.rightGain.disconnect();
  currentNodes.masterGain.disconnect();
  currentNodes = null;
  isPlaying = false;
  clearTimer();
  remainingSeconds = 0;
  updateStatus("Zatrzymano");
  toggleControls();
};

const toggleControls = () => {
  playButton.disabled = isPlaying;
  pauseButton.disabled = !isPlaying || !audioContext || audioContext.state !== "running";
  stopButton.disabled = !audioContext || !currentNodes;
};

const playTestTone = (channel) => {
  const context = ensureAudioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();
  const merger = context.createChannelMerger(2);

  osc.frequency.value = 440;
  gain.gain.value = 0.5;

  if (channel === "left") {
    osc.connect(gain).connect(merger, 0, 0);
  } else {
    osc.connect(gain).connect(merger, 0, 1);
  }

  merger.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + 0.5);
};

const bufferToWave = (audioBuffer) => {
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  const setUint16 = (data) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952);
  setUint32(length - 8);
  setUint32(0x45564157);
  setUint32(0x20746d66);
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(audioBuffer.sampleRate);
  setUint32(audioBuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164);
  setUint32(length - pos - 4);

  for (let i = 0; i < numOfChan; i += 1) {
    channels.push(audioBuffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i += 1) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset += 1;
  }

  return buffer;
};

const exportWav = async () => {
  const durationMinutes = Number(durationInput.value);
  const durationSeconds = durationMinutes * 60;
  const sampleRate = 44100;

  exportButton.disabled = true;
  exportStatus.textContent = "Generowanie pliku...";

  const offlineContext = new OfflineAudioContext(2, sampleRate * durationSeconds, sampleRate);
  const base = Number(baseFrequencyInput.value);
  const beat = Number(beatFrequencyInput.value);
  const volume = Number(volumeInput.value);

  const leftOsc = offlineContext.createOscillator();
  const rightOsc = offlineContext.createOscillator();
  const leftGain = offlineContext.createGain();
  const rightGain = offlineContext.createGain();
  const masterGain = offlineContext.createGain();
  const merger = offlineContext.createChannelMerger(2);

  leftOsc.frequency.value = base;
  rightOsc.frequency.value = base + beat;
  leftGain.gain.value = 1;
  rightGain.gain.value = 1;
  masterGain.gain.value = volume;

  leftOsc.connect(leftGain).connect(merger, 0, 0);
  rightOsc.connect(rightGain).connect(merger, 0, 1);
  merger.connect(masterGain).connect(offlineContext.destination);

  leftOsc.start(0);
  rightOsc.start(0);
  leftOsc.stop(durationSeconds);
  rightOsc.stop(durationSeconds);

  const renderedBuffer = await offlineContext.startRendering();
  const wavData = bufferToWave(renderedBuffer);
  const blob = new Blob([wavData], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `binaural_${base}Hz_${beat}Hz_${durationMinutes}min.wav`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  exportStatus.textContent = "Eksport gotowy.";
  exportButton.disabled = false;
};

presetSelect.addEventListener("change", (event) => {
  applyPreset(event.target.value);
});

playButton.addEventListener("click", () => {
  startPlayback();
});

pauseButton.addEventListener("click", () => {
  pausePlayback();
});

stopButton.addEventListener("click", () => {
  stopPlayback();
});

testLeftButton.addEventListener("click", () => {
  playTestTone("left");
});

testRightButton.addEventListener("click", () => {
  playTestTone("right");
});

volumeInput.addEventListener("input", () => {
  if (currentNodes) {
    currentNodes.masterGain.gain.value = Number(volumeInput.value);
  }
});

exportButton.addEventListener("click", () => {
  exportWav();
});

populatePresets();
applyPreset(presets[0].id);
toggleControls();
