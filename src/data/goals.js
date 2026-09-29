// The five finish destinations reached at the end of the E sections, with
// passenger-mode endings for a low (0-1), medium (2-3) and high (4-5) heart count.

export const GOALS = {
  goalHarbor: {
    name: 'HARBOR LIGHTS',
    text: 'THE NIGHT FERRY WAITS AT PIER 9',
    endings: ['SHE TAKES THE FERRY ALONE.', 'YOU SHARE A QUIET SODA ON THE PIER.', 'SHE SAVED YOU A SEAT ON THE FERRY!'],
  },
  goalOasis: {
    name: 'MIRAGE OASIS',
    text: 'COLD DRINKS UNDER THE PALMS',
    endings: ['SHE ORDERS ONE DRINK. FOR HERSELF.', 'TWO STRAWS, ONE BIG MILKSHAKE.', 'SHE BUYS THE WHOLE BAR A ROUND!'],
  },
  goalCanyon: {
    name: 'CANYON GATE',
    text: 'THE SUN SETS OVER RED ROCK',
    endings: ['SHE CALLS A CAB FROM THE GIFT SHOP.', 'YOU WATCH THE SUNSET SIDE BY SIDE.', 'SHE WANTS TO DRIVE BACK TOMORROW!'],
  },
  goalSummit: {
    name: 'SUMMIT LAKE',
    text: 'A CABIN BY STILL WATER',
    endings: ['SHE TAKES THE ONLY BED.', 'YOU PLAY CARDS BY THE FIREPLACE.', 'SHE TEACHES YOU TO FISH AT DAWN!'],
  },
  goalForest: {
    name: 'NORTHERN PINES',
    text: 'CAMPFIRE UNDER A MILLION STARS',
    endings: ['SHE PITCHES HER TENT FAR AWAY.', 'YOU TOAST MARSHMALLOWS TOGETHER.', 'SHE NAMES A STAR AFTER YOUR CAR!'],
  },
};

/** Game over lines in passenger mode, same low / medium / high tiers. */
export const TIME_UP_ENDINGS = ['SHE HITCHHIKES THE REST OF THE WAY.', 'SHE SAYS THERE IS ALWAYS NEXT TIME.', 'SHE LAUGHS: WHAT A RIDE ANYWAY!'];
