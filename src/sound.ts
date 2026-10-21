let ctx: AudioContext | undefined;

function noise(c: AudioContext, seconds: number) {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const source = c.createBufferSource();
  source.buffer = buffer;
  return source;
}

// A clicky switch: a sharp high click at the actuation point, then a
// short bottom-out thud as the keycap hits the plate.
export function keyClick() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const detune = 0.92 + Math.random() * 0.16;

    const click = noise(ctx, 0.02);
    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.value = 4200 * detune;
    clickFilter.Q.value = 3;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 1.1;
    click.connect(clickFilter).connect(clickGain).connect(ctx.destination);
    click.start(t);

    const bottom = t + 0.014;
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.frequency.setValueAtTime(240 * detune, bottom);
    thud.frequency.exponentialRampToValueAtTime(110, bottom + 0.04);
    thudGain.gain.setValueAtTime(0.0001, t);
    thudGain.gain.setValueAtTime(0.22, bottom);
    thudGain.gain.exponentialRampToValueAtTime(0.001, bottom + 0.06);
    thud.connect(thudGain).connect(ctx.destination);
    thud.start(bottom);
    thud.stop(bottom + 0.07);

    const tap = noise(ctx, 0.03);
    const tapFilter = ctx.createBiquadFilter();
    tapFilter.type = 'lowpass';
    tapFilter.frequency.value = 1400;
    const tapGain = ctx.createGain();
    tapGain.gain.value = 0.25;
    tap.connect(tapFilter).connect(tapGain).connect(ctx.destination);
    tap.start(bottom);
  } catch {
    // Audio is optional; a browser without it just stays silent.
  }
}
