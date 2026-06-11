import { assetManifest } from "../assets/assetManifest";

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

const fileSounds: Partial<Record<SoundKey, string>> = {
  cast: assetManifest.audio.cast,
  reel: assetManifest.audio.reel
};

export class AudioManager {
  private context: AudioContext | null = null;
  private readonly clips = new Map<SoundKey, HTMLAudioElement>();
  private readonly loops = new Map<SoundKey, HTMLAudioElement>();
  volume = 0.45;

  play(key: SoundKey): void {
    const file = fileSounds[key];
    if (file) {
      this.playFile(key, file);
      return;
    }

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

  playLoop(key: SoundKey): void {
    const file = fileSounds[key];
    if (!file) {
      return;
    }

    const audio = this.getAudioElement(this.loops, key, file);
    audio.loop = true;
    audio.volume = this.volume;

    if (audio.paused) {
      void audio.play().catch(() => undefined);
    }
  }

  stop(key: SoundKey): void {
    const audio = this.loops.get(key);
    if (!audio) {
      return;
    }

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Some browsers reject seeking before metadata is available.
    }
  }

  private playFile(key: SoundKey, file: string): void {
    const audio = this.getAudioElement(this.clips, key, file);
    audio.loop = false;
    audio.volume = this.volume;
    try {
      audio.currentTime = 0;
    } catch {
      // Some browsers reject seeking before metadata is available.
    }

    void audio.play().catch(() => undefined);
  }

  private getAudioElement(collection: Map<SoundKey, HTMLAudioElement>, key: SoundKey, file: string): HTMLAudioElement {
    const existing = collection.get(key);
    if (existing) {
      return existing;
    }

    const audio = new Audio(file);
    audio.preload = "auto";
    collection.set(key, audio);
    return audio;
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
