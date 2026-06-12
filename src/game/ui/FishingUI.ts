import type { FishingSnapshot } from "../fishing/FishingSystem";

export function promptForFishing(snapshot: FishingSnapshot, isMobile = false): string {
  switch (snapshot.state) {
    case "idle":
      return isMobile ? "Tap water to cast. Hold to reel." : "Move with WASD. Aim with mouse. Hold click or Space to cast.";
    case "chargingCast":
      return "Release to cast.";
    case "casting":
      return "Casting...";
    case "waitingForBite":
      return "Waiting for a bite...";
    case "biteWindow":
      return isMobile ? "BITE! Tap now!" : "BITE! Click or press Space now!";
    case "reeling":
      return "";
    case "caught":
      return "Caught!";
    case "escaped":
      return "It got away...";
  }
}
