import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Volume2, VolumeX } from 'lucide-react';
import { CosmicCanvas } from './components/CosmicCanvas';
import { animState } from './components/CosmicDragon';
import './App.css';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

interface StageInfo {
  num: string;
  title: string;
  desc: string;
}

const stages: StageInfo[] = [
  {
    num: "01",
    title: "Celestial Cosmos",
    desc: "In the silent depths of the universe, stardust rotates in eternal slumber, carrying the raw energetic filaments of ancient nebulae."
  },
  {
    num: "02",
    title: "Convergence",
    desc: "Stellar filaments align. Gravitational pull folds space-time, drawing scattered light streams towards a central gravitational core."
  },
  {
    num: "03",
    title: "Awakening Conduit",
    desc: "The spine of the deity manifests. Living plasma maps a conduit through the dark void, structuring the serpentine silhouette."
  },
  {
    num: "04",
    title: "Cerebral Emergence",
    desc: "The celestial horns, whiskers, and sharp profile assemble. Living energy ignites consciousness at the apex of the stellar conduit."
  },
  {
    num: "05",
    title: "The Celestial Dragon",
    desc: "A colossal Eastern Celestial deity materializes. A living structure of stars, stardust, and plasma, breathing in the deep cosmic void."
  },
  {
    num: "06",
    title: "Cosmic Flight",
    desc: "Undulating through the cosmic ether, the serpentine deity swims, trailing glowing stardust filaments across space-time."
  },
  {
    num: "07",
    title: "Cinematic Orbit",
    desc: "The dimensional sweep reveals the structural depth of the living entity, showcasing the complexity of the galaxy particles."
  },
  {
    num: "08",
    title: "Circles of Time",
    desc: "The dragon loops around your perspective, wrapping the viewer inside a protective shield of swirling nebula gas."
  },
  {
    num: "09",
    title: "Ascension Vortex",
    desc: "Twisting into a vertical spiral vortex, the deity ascends, rising upwards into higher dimensions of starlight."
  },
  {
    num: "10",
    title: "Dissolution",
    desc: "Energy levels exceed stability. The serpentine silhouette dissolves, scattering its particle soul back into the deep void."
  },
  {
    num: "11",
    title: "Algoryx Wordmark",
    desc: "The scattered particles reconverge in geometric precision, locking into solid structural alignment to form the wordmark of ALGORYX."
  },
  {
    num: "12",
    title: "Supernova Explosion",
    desc: "A flash of pure starlight. The wordmark structure explodes in a cosmic shockwave, sending particles into high-velocity orbits."
  },
  {
    num: "13",
    title: "Eternal Return",
    desc: "Reassembling from the stardust, the celestial dragon reforms in an infinite loop of death, rebirth, and cosmic creation."
  }
];

export function App() {
  const [soundOn, setSoundOn] = useState(false);
  
  // Audio Synthesis Engine Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Web Audio Synthesis for Cosmic Ambient Hum
  const toggleSound = () => {
    if (!soundOn) {
      // Initialize Audio Context if not present
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Create main master gain with low volume
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        // Low Pass Filter for spacey hum
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, ctx.currentTime);
        filter.connect(masterGain);

        // Sub hum oscillator (55Hz sine wave)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(55, ctx.currentTime);
        osc1.connect(filter);
        osc1.start();
        oscillatorsRef.current.push(osc1);

        // Fifth harmony oscillator (82.4Hz sine wave)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(82.4, ctx.currentTime);
        osc2.connect(filter);
        osc2.start();
        oscillatorsRef.current.push(osc2);

        // LFO to modulate hum amplitude (gives breathing effect)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.2, ctx.currentTime); // 0.2Hz wave
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.015, ctx.currentTime);
        
        lfo.connect(lfoGain);
        lfoGain.connect(masterGain.gain);
        lfo.start();
        oscillatorsRef.current.push(lfo);
      }

      // Smooth fade-in sound
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      gainNodeRef.current?.gain.linearRampToValueAtTime(0.08, audioContextRef.current.currentTime + 1.5);
      setSoundOn(true);
    } else {
      // Smooth fade-out sound
      gainNodeRef.current?.gain.linearRampToValueAtTime(0.0, audioContextRef.current!.currentTime + 1.0);
      setTimeout(() => {
        if (audioContextRef.current && !soundOn) {
          audioContextRef.current.suspend();
        }
      }, 1000);
      setSoundOn(false);
    }
  };

  useEffect(() => {
    // 1. GSAP ScrollTrigger Camera & Uniform Choreography Timeline
    const mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.4, // Scrub lag for high-end film feel
      }
    });

    // We animate the variables in animState object
    // Timeline steps divided uniformly across the 13 scroll stages
    mainTimeline
      // Stage 2 (0% -> 8.3%): Convergence
      .to(animState, {
        transition: 0.45,
        cameraX: 5.0,
        cameraY: 6.0,
        cameraZ: 40.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 16.0,
        duration: 1,
        ease: 'power1.inOut'
      })
      // Stage 3 (8.3% -> 16.6%): Awakening Conduit (Spine)
      .to(animState, {
        transition: 0.8,
        cameraX: -8.0,
        cameraY: 4.5,
        cameraZ: 32.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 16.0,
        duration: 1,
        ease: 'power1.inOut'
      })
      // Stage 4 (16.6% -> 25%): Cerebral Emergence (Head)
      .to(animState, {
        transition: 1.0,
        cameraX: 0.0,
        cameraY: 0.9,
        cameraZ: -5.8,
        lookAtX: 0.0,
        lookAtY: 0.4,
        lookAtZ: -1.8,
        mouseStrength: 0.5,
        duration: 1,
        ease: 'power2.inOut'
      })
      // Stage 5 (25% -> 33.3%): Full Reveal
      .to(animState, {
        cameraX: 16.0,
        cameraY: 8.0,
        cameraZ: 22.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 16.0,
        mouseStrength: 1.0,
        swimSpeed: 1.5,
        swimAmplitude: 0.8,
        duration: 1,
        ease: 'power1.inOut'
      })
      // Stage 6 (33.3% -> 41.6%): Cosmic Flight (Swim)
      .to(animState, {
        cameraX: -16.0,
        cameraY: 2.0,
        cameraZ: 14.0,
        lookAtX: 0.0,
        lookAtY: -2.0,
        lookAtZ: 16.0,
        swimSpeed: 2.5,
        swimAmplitude: 1.4,
        duration: 1,
        ease: 'sine.inOut'
      })
      // Stage 7 (41.6% -> 50%): Cinematic Orbit
      .to(animState, {
        cameraX: 16.0,
        cameraY: -3.5,
        cameraZ: 9.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 16.0,
        duration: 1,
        ease: 'power1.inOut'
      })
      // Stage 8 (50% -> 58.3%): Circles of Time (Wrap)
      .to(animState, {
        circleWrap: 1.0,
        cameraX: 0.0,
        cameraY: 0.0,
        cameraZ: 0.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: -5.0,
        swimSpeed: 1.1,
        swimAmplitude: 0.6,
        duration: 1,
        ease: 'power2.inOut'
      })
      // Stage 9 (58.3% -> 66.6%): Ascension Vortex
      .to(animState, {
        circleWrap: 0.0,
        ascension: 1.0,
        cameraX: 4.5,
        cameraY: 22.0,
        cameraZ: 10.0,
        lookAtX: 0.0,
        lookAtY: 14.0,
        lookAtZ: 0.0,
        swimSpeed: 2.2,
        swimAmplitude: 1.1,
        duration: 1,
        ease: 'power2.inOut'
      })
      // Stage 10 (66.6% -> 75%): Dissolution (Explosion)
      .to(animState, {
        ascension: 0.0,
        dispersal: 1.0,
        cameraX: 0.0,
        cameraY: 0.0,
        cameraZ: 32.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 0.0,
        duration: 1,
        ease: 'power2.out'
      })
      // Stage 11 (75% -> 83.3%): Algoryx Logo
      .to(animState, {
        dispersal: 0.0,
        logoTransition: 1.0,
        cameraX: 0.0,
        cameraY: 0.0,
        cameraZ: 21.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 0.0,
        duration: 1,
        ease: 'power2.inOut'
      })
      // Stage 12 (83.3% -> 91.6%): Supernova (Logo Explosion)
      .to(animState, {
        logoTransition: 1.0,
        dispersal: 1.0,
        cameraX: 0.0,
        cameraY: 0.0,
        cameraZ: 25.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 0.0,
        duration: 1,
        ease: 'power2.out'
      })
      // Stage 13 (91.6% -> 100%): Eternal Return (Reformation)
      .to(animState, {
        dispersal: 0.0,
        logoTransition: 0.0,
        transition: 1.0,
        cameraX: 14.0,
        cameraY: 6.0,
        cameraZ: 26.0,
        lookAtX: 0.0,
        lookAtY: 0.0,
        lookAtZ: 16.0,
        duration: 1,
        ease: 'power2.inOut'
      });

    // 2. TOGGLE PANEL TRANSITIONS (Slides panels in/out as section scrolls)
    const panels = gsap.utils.toArray('.content-panel');
    panels.forEach((panel: any) => {
      ScrollTrigger.create({
        trigger: panel.closest('.scroll-section'),
        start: 'top center+=250',
        end: 'bottom center-=250',
        toggleClass: { targets: panel, className: 'active' },
      });
    });

    // Cleanup triggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <>
      {/* 3D Background Canvas */}
      <div className="canvas-container">
        <CosmicCanvas />
      </div>

      {/* Brand Header */}
      <header className="brand-header">
        <a href="#" className="brand-logo">ALGORYX</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', pointerEvents: 'auto' }}>
          <span className="brand-tech">GPU SIMULATION V1.0</span>
          <button className="audio-control" onClick={toggleSound}>
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
        </div>
      </header>

      {/* Floating Scroll mouse indicator */}
      <div className="scroll-indicator">
        <div className="scroll-indicator-mouse">
          <div className="scroll-indicator-wheel" />
        </div>
        <span>SCROLL TO DIRECT</span>
      </div>

      {/* Scrollable container holding overlay sections */}
      <main className="scroll-container">
        {stages.map((stage, index) => (
          <section key={index} className="scroll-section">
            <div className="content-panel">
              <div className="stage-number">{stage.num}</div>
              <h2 className="stage-title">{stage.title}</h2>
              <p className="stage-desc">{stage.desc}</p>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
export default App;
