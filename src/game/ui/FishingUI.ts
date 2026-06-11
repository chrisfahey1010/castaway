import type { FishingSnapshot } from "../fishing/FishingSystem";

export function promptForFishing(snapshot: FishingSnapshot): string {
  switch (snapshot.state) {
    case "idle":
      return "Move with WASD. Aim with mouse. Hold click or Space to cast.";
    case "chargingCast":
      return "Release to cast.";
    case "casting":
      return "Casting...";
    case "waitingForBite":
      return "Waiting for a bite...";
    case "biteWindow":
      return "BITE! Click or press Space now!";
    case "reeling":
      return "Hold to reel, release to lower tension.";
    case "caught":
      return "Caught!";
    case "escaped":
      return "It got away...";
  }
}
