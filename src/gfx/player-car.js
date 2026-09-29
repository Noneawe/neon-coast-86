// Player car pixel art: rear view of an original red 80s convertible with two
// occupants. Rows are ASCII, one character per pixel, mapped through PALETTE.

/** Character → colour. '.' is transparent. */
export const PLAYER_CAR_PALETTE = {
  K: '#101014', // tyres, taillight surround
  k: '#2a2a32', // underbody, shadow, tread
  g: '#5a5a6a', // windscreen frame, bumper shade
  G: '#c0c0cc', // chrome bumper
  W: '#f4f4f4', // plate
  R: '#d81c1c', // body
  r: '#8e1010', // body shade / side panel
  h: '#ff6a5a', // deck highlight
  L: '#ff3030', // taillights
  O: '#ffa020', // indicators
  c: '#8fd3ff', // windscreen glass
  b: '#3a2410', // driver hair
  s: '#e8b088', // skin
  n: '#2050c0', // driver shirt
  y: '#f2c84a', // passenger hair
  p: '#f040a0', // passenger top
};

/** Rows that belong to the car body (receive the side panel in turn frames). */
export const PLAYER_CAR_BODY_ROWS = [10, 23];

export const PLAYER_CAR_ROWS = [
    '................................................................',
    '...................bbbbb................yyyyy...................',
    '..................bbbbbbb..............yyyyyyy..................',
    '..............ggggbbbbbbbggggggggggggggyyyyyyygggg..............',
    '.............gccccbbbbbbbccccccccccccccyyyyyyyccccg.............',
    '............gcccccbbbbbbbccccccccccccccyyyyyyycccccg............',
    '............gccccccbbbbbcccccccccccccccyyyyyyycccccg............',
    '............gcccccccssscccccccccccccccyyyyyyyyyccccg............',
    '............gccnnnnnnnnnnnnnccccccccccyyypppyyyccccg............',
    '............gccnnnnnnnnnnnnnccccccccpppppppppppppccg............',
    '.......RRRhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhRRR.......',
    '.....RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR.....',
    '....RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR....',
    '...rRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRr...',
    '...rRRKLLLLLLLLOOOKKKKKKKKKKKKKKKKKKKKKKKKKKKKOOOLLLLLLLLKRRr...',
    '...rRRKLLLLLLLLOOOkkkkkkkkkkkkkkkkkkkkkkkkkkkkOOOLLLLLLLLKRRr...',
    '...rRRKLLLLLLLLOOOKKKKKKKKKKKKKKKKKKKKKKKKKKKKOOOLLLLLLLLKRRr...',
    '...rRRKLLLLLLLLOOOKKKKKKKKKKKKKKKKKKKKKKKKKKKKOOOLLLLLLLLKRRr...',
    '...rRRRRRRRRRRRRRRRRRRRRRRWWWWWWWWWWWWRRRRRRRRRRRRRRRRRRRRRRr...',
    '...rRRRRRRRRRRRRRRRRRRRRRRWWKWKKWKWKWWRRRRRRRRRRRRRRRRRRRRRRr...',
    '...rrrrrrrrrrrrrrrrrrrrrrrWWWWWWWWWWWWrrrrrrrrrrrrrrrrrrrrrrr...',
    '...rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr...',
    '..GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..',
    '..gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg..',
    '...KKKKKKKKKKggkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkggKKKKKKKKKK...',
    '...KkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkK...',
    '...KKKKKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKKKKKKKK...',
    '...KkkkkkkkkK......................................KkkkkkkkkK...',
    '...KKKKKKKKKK......................................KKKKKKKKKK...',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
];
