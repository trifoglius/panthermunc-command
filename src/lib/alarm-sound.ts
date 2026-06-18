const ALARM_URL = "/alarm_sound.wav";

let audioContext: AudioContext | null = null;
let alarmBuffer: AudioBuffer | null = null;
let bufferPromise: Promise<AudioBuffer> | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function loadAlarmBuffer() {
  if (bufferPromise) return bufferPromise;

  bufferPromise = (async () => {
    const ctx = getAudioContext();
    if (!ctx) throw new Error("AudioContext unavailable");

    const response = await fetch(ALARM_URL);
    if (!response.ok) throw new Error("Failed to load alarm sound");

    const data = await response.arrayBuffer();
    return ctx.decodeAudioData(data);
  })();

  return bufferPromise;
}

/** Call from a user gesture (e.g. Start) so playback works when the timer expires. */
export function unlockAlarmSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  void loadAlarmBuffer()
    .then((buffer) => {
      alarmBuffer = buffer;
    })
    .catch(() => {});
}

export function playAlarmSound() {
  void (async () => {
    const ctx = getAudioContext();
    if (!ctx) {
      playWithHtmlAudio();
      return;
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    try {
      const buffer = alarmBuffer ?? (await loadAlarmBuffer());
      alarmBuffer = buffer;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      playWithHtmlAudio();
    }
  })();
}

function playWithHtmlAudio() {
  const audio = new Audio(ALARM_URL);
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}
