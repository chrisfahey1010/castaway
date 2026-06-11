export const assetManifest = {
  textures: {
    coral: "/assets/textures/coral.jpg",
    grass: "/assets/textures/grass.jpg",
    rock: "/assets/textures/rock.jpg",
    sand: "/assets/textures/sand.jpg",
    waterDeep: "/assets/textures/water-deep.png",
    waterMedium: "/assets/textures/water-medium.png",
    waterShallow: "/assets/textures/water-shallow.png",
    waterNormal: "/assets/textures/water-normal.png",
    raft: "/assets/sprites/raft.png",
    fisherman: "/assets/sprites/fisherman.png",
    palmTree: "/assets/sprites/palmtree.png",
    bobber: "/assets/sprites/bobber.png",
    fishShadow: "/assets/sprites/shark.png",
    stingrayShadow: "/assets/sprites/stingray.png"
  },
  spritesheets: {
    fish: {
      url: "/assets/sprites/fish-sheet.png",
      cellWidth: 64,
      cellHeight: 64
    }
  },
  audio: {
    cast: "/assets/sounds/cast.mp3",
    reel: "/assets/sounds/reel.mp3",
    splash: "/assets/audio/splash.mp3",
    bite: "/assets/audio/bite.mp3",
    catchSuccess: "/assets/audio/catch-success.mp3",
    escape: "/assets/audio/escape.mp3"
  }
} as const;
