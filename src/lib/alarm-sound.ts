let alarmAudio: HTMLAudioElement | null = null;

export function playAlarmSound() {
  if (typeof window === "undefined") return;

  if (!alarmAudio) {
    alarmAudio = new Audio("/alarm_sound.wav");
  }

  alarmAudio.currentTime = 0;
  void alarmAudio.play().catch(() => {
    // Browsers may block playback until the user has interacted with the page.
  });
}
