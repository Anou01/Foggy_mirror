import { describe, it, expect } from 'vitest';

const STATE = {
  WAITING_CALIBRATION: 'WAITING_CALIBRATION',
  COUNTDOWN: 'COUNTDOWN',
  IDLE: 'IDLE',
  FOGGING: 'FOGGING',
  READY: 'READY',
  DRAWING: 'DRAWING',
  RELEASE: 'RELEASE',
};

function advanceState(current, {
  mouthOpen = false,
  pinching = false,
  calibrationConfirmed = false,
  calibrationStillValid = true,
  countdownDone = false,
} = {}) {
  switch (current) {
    case STATE.WAITING_CALIBRATION:
      return calibrationConfirmed ? STATE.COUNTDOWN : current;
    case STATE.COUNTDOWN:
      if (!calibrationStillValid) return STATE.WAITING_CALIBRATION;
      return countdownDone ? STATE.IDLE : current;
    case STATE.IDLE:
      if (mouthOpen) return STATE.FOGGING;
      if (pinching) return STATE.READY;
      return current;
    case STATE.FOGGING:
      if (!mouthOpen) return STATE.READY;
      return current;
    case STATE.READY:
      if (mouthOpen) return STATE.FOGGING;
      if (pinching) return STATE.DRAWING;
      return current;
    case STATE.DRAWING:
      if (!pinching) return STATE.RELEASE;
      if (mouthOpen) return STATE.FOGGING;
      return current;
    case STATE.RELEASE:
      return mouthOpen ? STATE.FOGGING : STATE.READY;
    default:
      return current;
  }
}

describe('State: WAITING_CALIBRATION', () => {
  it('ignores mouth and pinch before calibration is confirmed', () => {
    expect(advanceState(STATE.WAITING_CALIBRATION, { mouthOpen: true, pinching: true })).toBe(STATE.WAITING_CALIBRATION);
  });

  it('goes COUNTDOWN when calibration is confirmed', () => {
    expect(advanceState(STATE.WAITING_CALIBRATION, { calibrationConfirmed: true })).toBe(STATE.COUNTDOWN);
  });
});

describe('State: COUNTDOWN', () => {
  it('cancels if hands break the L shape', () => {
    expect(advanceState(STATE.COUNTDOWN, { calibrationStillValid: false })).toBe(STATE.WAITING_CALIBRATION);
  });

  it('goes IDLE after countdown completes', () => {
    expect(advanceState(STATE.COUNTDOWN, { calibrationStillValid: true, countdownDone: true })).toBe(STATE.IDLE);
  });

  it('ignores mouth and pinch during countdown', () => {
    expect(advanceState(STATE.COUNTDOWN, { mouthOpen: true, pinching: true })).toBe(STATE.COUNTDOWN);
  });
});

describe('State: IDLE', () => {
  it('stays IDLE when mouth closed and not pinching', () => {
    expect(advanceState(STATE.IDLE, { mouthOpen: false, pinching: false })).toBe(STATE.IDLE);
  });
  it('goes FOGGING when mouth opens', () => {
    expect(advanceState(STATE.IDLE, { mouthOpen: true, pinching: false })).toBe(STATE.FOGGING);
  });
  it('goes READY when pinching without mouth', () => {
    expect(advanceState(STATE.IDLE, { mouthOpen: false, pinching: true })).toBe(STATE.READY);
  });
  it('prefers FOGGING over READY when both true', () => {
    expect(advanceState(STATE.IDLE, { mouthOpen: true, pinching: true })).toBe(STATE.FOGGING);
  });
});

describe('State: FOGGING', () => {
  it('stays FOGGING while mouth is open', () => {
    expect(advanceState(STATE.FOGGING, { mouthOpen: true })).toBe(STATE.FOGGING);
  });
  it('goes READY when mouth closes', () => {
    expect(advanceState(STATE.FOGGING, { mouthOpen: false })).toBe(STATE.READY);
  });
});

describe('State: READY', () => {
  it('stays READY when idle', () => {
    expect(advanceState(STATE.READY, {})).toBe(STATE.READY);
  });
  it('goes FOGGING when mouth opens', () => {
    expect(advanceState(STATE.READY, { mouthOpen: true })).toBe(STATE.FOGGING);
  });
  it('goes DRAWING when pinching', () => {
    expect(advanceState(STATE.READY, { pinching: true })).toBe(STATE.DRAWING);
  });
});

describe('State: DRAWING', () => {
  it('stays DRAWING while pinching and no mouth', () => {
    expect(advanceState(STATE.DRAWING, { pinching: true })).toBe(STATE.DRAWING);
  });
  it('goes RELEASE when pinch released', () => {
    expect(advanceState(STATE.DRAWING, { pinching: false })).toBe(STATE.RELEASE);
  });
  it('goes FOGGING when mouth opens mid-draw', () => {
    expect(advanceState(STATE.DRAWING, { mouthOpen: true, pinching: true })).toBe(STATE.FOGGING);
  });
});

describe('State: RELEASE', () => {
  it('goes FOGGING if mouth still open', () => {
    expect(advanceState(STATE.RELEASE, { mouthOpen: true })).toBe(STATE.FOGGING);
  });
  it('goes READY if mouth closed', () => {
    expect(advanceState(STATE.RELEASE, { mouthOpen: false })).toBe(STATE.READY);
  });
});