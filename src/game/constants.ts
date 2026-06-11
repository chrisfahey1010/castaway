export const GAME_CONFIG = {
  world: {
    radius: 120,
    islandRadius: 22,
    shallowRadius: 48,
    reefRadius: 78,
    deepRadius: 120
  },
  raft: {
    acceleration: 20,
    maxSpeed: 10,
    drag: 0.91,
    turnSpeed: 2.25,
    collisionRadius: 2.2,
    shallowSpeedMultiplier: 0.82,
    reefSpeedMultiplier: 0.9
  },
  fishing: {
    minCastDistance: 6,
    maxCastDistance: 30,
    maxChargeSeconds: 1.25,
    castTravelSpeed: 34,
    reelLineSpeed: 12,
    fishRunLineSpeed: 2.2,
    boatTowardTensionRelief: 0.035,
    boatAwayTensionGain: 0.055,
    biteMinSeconds: 1.6,
    biteMaxSeconds: 5.6,
    baseHookWindowSeconds: 1.2,
    maxFightSeconds: 22
  },
  camera: {
    height: 90,
    orthoSize: 68,
    mobileOrthoSize: 128,
    followSharpness: 5.5
  }
} as const;
