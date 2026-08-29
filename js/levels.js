/**
 * CogniCare - levels.js
 * Level definitions and configuration
 */

const LEVEL_DEFS = [
  {
    num: 1,
    name: 'Single Color',
    shortDesc: 'Touch all red balls',
    fullDesc: 'Touch every red ball on the screen.',
    colors: ['red'],
    layout: 'free',
    alternateRule: false,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
  {
    num: 2,
    name: 'Two Colors – Grouped',
    shortDesc: 'Alternate red and green (grouped)',
    fullDesc: 'Touch a ball, then switch to the other color. You cannot pick the same color twice in a row.',
    colors: ['red', 'green'],
    layout: 'grouped',
    alternateRule: true,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
  {
    num: 3,
    name: 'Two Colors – Mixed',
    shortDesc: 'Alternate red and green (mixed layout)',
    fullDesc: 'Balls are scattered randomly. Alternate between red and green. You cannot pick the same color twice in a row.',
    colors: ['red', 'green'],
    layout: 'free',
    alternateRule: true,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
  {
    num: 4,
    name: 'Three Colors – Grouped',
    shortDesc: 'Alternate three colors (grouped)',
    fullDesc: 'Three groups: Red, Green, Blue. Alternate colors each time. No same color twice in a row.',
    colors: ['red', 'green', 'blue'],
    layout: 'grouped',
    alternateRule: true,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
  {
    num: 5,
    name: 'Three Colors – Mixed',
    shortDesc: 'Alternate three colors (mixed layout)',
    fullDesc: 'Balls are randomly placed. Alternate between red, green and blue. No same color twice in a row.',
    colors: ['red', 'green', 'blue'],
    layout: 'free',
    alternateRule: true,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
  {
    num: 6,
    name: 'Advanced Mode',
    shortDesc: 'Faster, smaller balls – reaction time tracked',
    fullDesc: 'Three colors, mixed layout, smaller balls and higher speed. Reaction time per ball is measured.',
    colors: ['red', 'green', 'blue'],
    layout: 'free',
    alternateRule: true,
    ballSizeMultiplier: 0.75,
    speedMultiplier: 1.5,
    trackReactionTime: true,
  },
  {
    num: 7,
    name: 'Basket Sorting',
    shortDesc: 'Drag balls to correct baskets',
    fullDesc: 'Drag each ball to the matching colored basket. Wrong basket? The ball returns.',
    colors: ['red', 'green', 'blue'],
    layout: 'free',
    alternateRule: false,
    basketMode: true,
    ballSizeMultiplier: 1,
    speedMultiplier: 1,
  },
];

/**
 * Get level definition by number (1-based)
 */
function getLevelDef(num) {
  return LEVEL_DEFS.find(l => l.num === num) || LEVEL_DEFS[0];
}

/**
 * Generate instruction text for a level
 */
function getLevelInstruction(level, lastColor = null) {
  if (level.num === 1) return 'Touch every red ball!';
  if (level.num === 7) return 'Drag each ball to the correct colored basket!';
  if (level.alternateRule) {
    if (!lastColor) return `Touch a ${level.colors[0]} ball to begin.`;
    const others = level.colors.filter(c => c !== lastColor);
    return `Now touch a ${others.join(' or ')} ball.`;
  }
  return 'Touch the balls in the correct order.';
}
