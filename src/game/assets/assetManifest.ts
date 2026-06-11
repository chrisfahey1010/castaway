export const assetManifest = {
  textures: {
    grass: "/assets/textures/grass.jpg",
    sand: "/assets/textures/sand.jpg",
    waterDeep: "/assets/textures/water-deep.jpg",
    waterMedium: "/assets/textures/water-medium.jpg",
    waterShallow: "/assets/textures/water-shallow.jpg",
    waterNormal: "/assets/textures/water-normal.png",
    raft: "/assets/sprites/raft.png",
    palmTree: "/assets/sprites/palmtree.png",
    bobber: "/assets/sprites/bobber.png",
    fishShadow: "/assets/sprites/fish-shadow.png"
  },
  spritesheets: {
    fish: {
      url: "/assets/sprites/fish-sheet.png",
      cellWidth: 64,
      cellHeight: 64
    }
  },
  audio: {
    cast: "/assets/audio/cast.mp3",
    splash: "/assets/audio/splash.mp3",
    bite: "/assets/audio/bite.mp3",
    catchSuccess: "/assets/audio/catch-success.mp3",
    escape: "/assets/audio/escape.mp3"
  }
} as const;
