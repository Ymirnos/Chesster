import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';

export function useAmbientMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(-20); // dB

  // Refs for Tone.js elements
  const noiseRef = useRef<Tone.Noise | null>(null);
  const noiseFilterRef = useRef<Tone.Filter | null>(null);
  const noiseLfoRef = useRef<Tone.LFO | null>(null);
  
  const birdSynthRef = useRef<Tone.MonoSynth | null>(null);
  const bellRef = useRef<Tone.PolySynth | null>(null);
  const padRef = useRef<Tone.PolySynth | null>(null);
  
  const filterRef = useRef<Tone.Filter | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  const NOTES = ['C4', 'E4', 'G4', 'A4', 'B4', 'C5', 'E5', 'G5'];

  const initTone = useCallback(async () => {
    await Tone.start();
    
    // Lowpass filter for general ambient warmth
    filterRef.current = new Tone.Filter({
      frequency: 750,
      type: 'lowpass',
      rolloff: -24
    }).toDestination();

    // Reverb for deep spacious atmosphere
    reverbRef.current = new Tone.Reverb({
      decay: 9,
      wet: 0.65
    }).connect(filterRef.current);
    await reverbRef.current.generate();

    // 1. Nature Wind & Gentle Blow Sound Generator (Brownian sound)
    noiseRef.current = new Tone.Noise({
      type: 'brown',
      volume: -26
    });

    // Q-Filter representing rustling leaves & trees wind
    noiseFilterRef.current = new Tone.Filter({
      frequency: 250,
      type: 'bandpass',
      Q: 1.2
    }).connect(reverbRef.current);

    // Dynamic wave simulation via spacey low-frequency oscillator
    noiseLfoRef.current = new Tone.LFO({
      frequency: 0.06, // Once every ~16 seconds cycle
      min: 140,
      max: 550
    }).connect(noiseFilterRef.current.frequency);

    noiseRef.current.connect(noiseFilterRef.current);

    // 2. High-Frequency Sine Synthesizer for organic chirping mini-birds
    birdSynthRef.current = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.12,
        sustain: 0,
        release: 0.1
      },
      filter: {
        Q: 1,
        type: 'lowpass',
        frequency: 4500
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.08,
        sustain: 1,
        baseFrequency: 3200,
        octaves: 1.2
      }
    }).connect(reverbRef.current);
    birdSynthRef.current.volume.value = -18;

    // 3. Wooden forest wind chimes & morning drops block
    bellRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 1.2,
        decay: 2.2,
        sustain: 0.35,
        release: 6
      }
    }).connect(reverbRef.current);
    bellRef.current.volume.value = -10;

    // 4. Low gentle mountain ridge warm pad
    padRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 7,
        decay: 4,
        sustain: 0.82,
        release: 12
      }
    }).connect(reverbRef.current);
    padRef.current.volume.value = -28;

    // Beautiful scheduling cycle
    loopRef.current = new Tone.Loop((time) => {
      // Gentle wooden melodic pluck play
      if (Math.random() > 0.45) {
        const note = NOTES[Math.floor(Math.random() * NOTES.length)];
        bellRef.current?.triggerAttackRelease(note, '2n', time);
      }

      // Procedural bird calls trigger
      if (Math.random() > 0.8) {
        const baseTime = time;
        const noteFreqs = [2900, 3100, 2950];
        noteFreqs.forEach((freq, idx) => {
          birdSynthRef.current?.triggerAttackRelease(
            freq, 
            0.07, 
            baseTime + idx * 0.15
          );
        });
      }

      // Ambient swelling bass notes
      if (Math.random() > 0.88) {
        const bases = ['C3', 'G3', 'F3', 'E3'];
        const root = bases[Math.floor(Math.random() * bases.length)];
        padRef.current?.triggerAttackRelease(root, '1n', time);
      }
    }, '2n');

    Tone.getTransport().bpm.value = 32; // Organic slow heartbeat style
  }, []);

  const toggleMusic = useCallback(async () => {
    if (!isPlaying) {
      if (!noiseRef.current) {
        await initTone();
      }
      Tone.getTransport().start();
      noiseRef.current?.start();
      noiseLfoRef.current?.start();
      loopRef.current?.start(0);
      setIsPlaying(true);
    } else {
      Tone.getTransport().stop();
      noiseRef.current?.stop();
      noiseLfoRef.current?.stop();
      loopRef.current?.stop();
      setIsPlaying(false);
    }
  }, [isPlaying, initTone]);

  useEffect(() => {
    if (noiseRef.current) {
      Tone.getDestination().volume.rampTo(volume, 0.1);
    }
  }, [volume]);

  // Clean-up
  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      loopRef.current?.dispose();
      bellRef.current?.dispose();
      padRef.current?.dispose();
      noiseRef.current?.dispose();
      noiseFilterRef.current?.dispose();
      noiseLfoRef.current?.dispose();
      birdSynthRef.current?.dispose();
      filterRef.current?.dispose();
      reverbRef.current?.dispose();
    };
  }, []);

  return {
    isPlaying,
    toggleMusic,
    volume,
    setVolume
  };
}
