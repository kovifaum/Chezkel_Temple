// All measurements are in cubits (אמות). Sources are the verse references in the comments;
// the layout follows the Gra's reading as presented in the attached book (פרק מ–מא).
export const D = {
  mount: 500,            // 42:20 – the temple precinct measured 500 × 500 (cubits; see variants for "500 reeds")
  wallT: 6, wallH: 6,    // 40:5 – wall: one reed thick, one reed high
  reed: 6,               // קנה = 6 amot (+ handbreadth per amah in the verse)
  gateLen: 50, gateWid: 25, pass: 10, // 40:13-15, 40:21
  cham: 6, gap: 5,       // 40:7 – each guard chamber 6×6, 5 between chambers
  ulamD: 8, ailD: 2,     // 40:9
  ailH: 60,              // 40:14 – "ויעש את אילים ששים אמה"
  outerSteps: 7,         // 40:22, 26
  innerSteps: 8,         // 40:31, 34, 37
  houseSteps: 10,        // 40:49
  step: 0.5,
  innerCourt: 100,       // 40:47 – 100 × 100
  between: 100,          // 40:19 – 100 cubits from the lower gate to the inner court
  houseLen: 100,         // 41:13
  houseW: 100,           // 41:14
};

// floor levels (y). Outer court floor is 7 steps above the ground; inner court 8 steps above that;
// the house 10 steps (6 cubits of "foundations", 41:8) above the inner court.
export const Y = {
  ground: 0,
  outer: D.outerSteps * D.step,                    // 3.5
  inner: D.outerSteps * D.step + D.innerSteps * D.step, // 7.5
  house: D.outerSteps * D.step + D.innerSteps * D.step + 6, // 13.5
};

export const levelAt = (x, z) => {
  if (x >= -150 && x <= -50 && Math.abs(z) <= 50) return Y.house;
  if (Math.abs(x) <= 50 && Math.abs(z) <= 50) return Y.inner;
  if (x > 50 && x <= 100 && Math.abs(z) <= 12.5) return Y.inner;
  if (Math.abs(x) <= 12.5 && Math.abs(z) > 50 && Math.abs(z) <= 100) return Y.inner;
  if (Math.abs(x) <= 250 && Math.abs(z) <= 250) return Y.outer;
  return 0;
};
