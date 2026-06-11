type SoundKey = "cast" | "splash" | "bite" | "reel" | "catchSuccess" | "escape" | "ui";

const tones: Record<SoundKey, { frequency: number; duration: number; type: OscillatorType }> = {
  cast: { frequency: 340, duration: 0.09, type: "triangle" },
  splash: { frequency: 150, duration: 0.14, type: "sine" },
  bite: { frequency: 640, duration: 0.1, type: "square" },
  reel: { frequency: 260, duration: 0.035, type: "sawtooth" },
  catchSuccess: { frequency: 820, duration: 0.22, type: "triangle" },
  escape: { frequency: 120, duration: 0.18, type: "sine" },
  ui: { frequency: 520, duration: 0.05, type: "triangle" }
};

export class AudioManager {
  private context: AudioContext | null = null;
  volume = 0.45;

  play(key: SoundKey): void {
    const tone = tones[key];
    const context = this.getContext();
    if (!context) {
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.value = tone.frequency;
    gain.gain.value = this.volume * 0.08;
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + tone.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + tone.duration);
  }

  playLoop(_key: string): void {
    return;
  }

  stop(_key: string): void {
    return;
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }

    this.context = new AudioCtor();
    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
