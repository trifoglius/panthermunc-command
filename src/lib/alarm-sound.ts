const ALARM_SOUND_URL = "/alarm_sound.wav";

let alarmAudio: HTMLAudioElement | null = null;
let unlocked = false;

export function setAlarmAudioElement(element: HTMLAudioElement | null) {
  alarmAudio = element;
  unlocked = false;
}

function getAlarmAudio() {
  if (alarmAudio) return alarmAudio;
  if (typeof window === "undefined") return null;
  return new Audio(ALARM_SOUND_URL);
}

/** Call during a user gesture so playback works when the timer expires. */
export function unlockAlarmSound() {
  const audio = getAlarmAudio();
  if (!audio || unlocked) return;

  audio.currentTime = 0;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
    })
    .catch(() => {});
}

export function playAlarmSound() {
  const audio = getAlarmAudio();
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => {
    const fallback = new Audio(ALARM_SOUND_URL);
    fallback.currentTime = 0;
    void fallback.play().catch(() => {});
  });
}
