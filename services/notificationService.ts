
// A simple audio context to play a sound
let audioContext: AudioContext;

const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

export const unlockAudio = () => {
    try {
        const context = getAudioContext();
        if (context.state === 'suspended') {
            context.resume().catch(() => {});
        }
    } catch {
        // Sin gesto de usuario todavía: se reintenta en el próximo toque.
    }
};

export const playNotificationSound = () => {
    try {
        const context = getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.3, context.currentTime);

        oscillator.start(context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
        oscillator.stop(context.currentTime + 0.5);
    } catch (e) {
        console.error("Could not play notification sound:", e);
    }
};

// Distinct vibration patterns so the alert type can be told apart without looking
const VIBRATION_PATTERNS: number[][] = [
    [300],                       // one long pulse
    [200, 100, 200],             // two short pulses
    [200, 100, 200, 100, 200],   // three short pulses
    [400, 150, 400],             // two long pulses
];

// Deterministic mapping: same alert type always produces the same pattern
export const patternForAlertType = (type: string): number[] => {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = (hash * 31 + type.charCodeAt(i)) | 0;
    }
    return VIBRATION_PATTERNS[Math.abs(hash) % VIBRATION_PATTERNS.length];
};

export const vibrateDevice = (pattern: number[] = [200, 100, 200]) => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.error("Could not vibrate device:", e);
        }
    }
};

// --- SOS siren: two-tone loop, loud enough for a factory floor ---

let sirenNodes: {
    carrier: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    gain: GainNode;
} | null = null;

export const startSiren = () => {
    if (sirenNodes) return; // already sounding
    try {
        const context = getAudioContext();
        if (context.state === 'suspended') {
            context.resume();
        }

        // Carrier ~900 Hz; an LFO swings it ±200 Hz twice per second (classic two-tone siren)
        const carrier = context.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(900, context.currentTime);

        const lfo = context.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(2, context.currentTime);

        const lfoGain = context.createGain();
        lfoGain.gain.setValueAtTime(200, context.currentTime);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.25, context.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);
        carrier.connect(gain);
        gain.connect(context.destination);

        carrier.start();
        lfo.start();

        sirenNodes = { carrier, lfo, lfoGain, gain };
    } catch (e) {
        console.error("Could not start siren:", e);
    }
};

export const stopSiren = () => {
    if (!sirenNodes) return;
    try {
        sirenNodes.carrier.stop();
        sirenNodes.lfo.stop();
        sirenNodes.carrier.disconnect();
        sirenNodes.lfo.disconnect();
        sirenNodes.lfoGain.disconnect();
        sirenNodes.gain.disconnect();
    } catch (e) {
        console.error("Could not stop siren:", e);
    }
    sirenNodes = null;
};
