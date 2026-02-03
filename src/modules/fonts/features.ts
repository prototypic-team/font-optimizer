const FEATURE_NAMES: Record<string, string> = {
  // Ligatures
  liga: "Standard Ligatures",
  dlig: "Discretionary Ligatures",
  hlig: "Historical Ligatures",
  clig: "Contextual Ligatures",
  rlig: "Required Ligatures",

  // Letter case
  smcp: "Small Capitals",
  c2sc: "Capitals to Small Capitals",
  pcap: "Petite Capitals",
  c2pc: "Capitals to Petite Capitals",
  unic: "Unicase",
  case: "Case-Sensitive Forms",

  // Numerals
  lnum: "Lining Figures",
  onum: "Oldstyle Figures",
  pnum: "Proportional Figures",
  tnum: "Tabular Figures",
  frac: "Fractions",
  afrc: "Alternative Fractions",
  ordn: "Ordinals",
  zero: "Slashed Zero",

  // Positioning
  kern: "Kerning",
  cpsp: "Capital Spacing",
  mark: "Mark Positioning",
  mkmk: "Mark to Mark Positioning",

  // Stylistic
  salt: "Stylistic Alternates",
  swsh: "Swash",
  calt: "Contextual Alternates",
  hist: "Historical Forms",
  locl: "Localized Forms",
  rand: "Randomize",

  // Width variants
  fwid: "Full Widths",
  hwid: "Half Widths",
  pwid: "Proportional Widths",
  twid: "Third Widths",
  qwid: "Quarter Widths",

  // Vertical
  vert: "Vertical Writing",
  vrt2: "Vertical Alternates and Rotation",
  vkrn: "Vertical Kerning",

  // Other
  aalt: "Access All Alternates",
  ccmp: "Glyph Composition/Decomposition",
  rclt: "Required Contextual Alternates",
  rvrn: "Required Variation Alternates",
  curs: "Cursive Positioning",
  dist: "Distances",
  size: "Optical Size",
  subs: "Subscript",
  sups: "Superscript",
  sinf: "Scientific Inferiors",
  titl: "Titling",
};

export const getFeatureName = (tag: string): string =>
  FEATURE_NAMES[tag] ?? tag.toUpperCase();
