/**
 * LexiCraft - Smart English Vocabulary Master
 * Chapter Management & AI Semantic Meaning Checker
 */

(function () {
  'use strict';

  // Hủy triệt để mọi phát âm còn sót lại từ phiên làm việc trước trong trình duyệt
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // ==========================================
  // STORAGE KEYS & GLOBAL STATE
  // ==========================================
  const STORAGE_KEYS = {
    VOCAB: 'lexicraft_vocab_v2',
    CHAPTERS: 'lexicraft_chapters_v2',
    STATS: 'lexicraft_stats_v2',
    SETTINGS: 'lexicraft_settings_v2',
    AI_KEY: 'lexicraft_gemini_key_v2'
  };

  let chapters = [];
  let vocabulary = [];
  let currentChapterId = 'all'; // 'all' hoặc ID cụ thể của chương
  let currentStudyDirection = 'vi-en'; // 'vi-en' (Gõ tiếng Anh) hoặc 'en-vi' (AI Check Tiếng Việt)

  let stats = {
    currentStreak: 0,
    maxStreak: 0,
    totalAnswered: 0,
    totalCorrect: 0
  };

  let settings = {
    soundEnabled: true,
    geminiApiKey: '',
    strictCorrection: true // Mặc định: Sai đâu báo đỏ ở đấy & đợi sửa đúng
  };

  // State for Type-to-Check Mode
  let checkQueue = [];
  let checkIndex = 0;
  let checkAnswerSubmitted = false;
  let isAwaitingCorrection = false;
  let autoAdvanceTimer = null;
  let awaitingNextEnter = false;
  let userPressedEnterDuringSpeech = false;
  let isSpeechSpeaking = false;
  let currentSpeechUtterance = null;
  let hasUserSelectedChapter = false; // Mới vào không phát âm voice, chỉ khi chọn chương mới có
  let isChapterCompleteModalActive = false; // Modal chúc mừng Luffy khi học hết đủ từ của chương
  let answerCountdownTimer = null; // Đếm ngược 1 phút (60s) để xem đáp án và nghĩa
  let answerCountdownSeconds = 60;
  let quizCountdownTimer = null;
  let quizCountdownSeconds = 60;

  // State for Intro Splash Screen
  let isIntroActive = true;
  let introCountdownTimer = null;
  let introSecondsRemaining = 30;

  // State for Quiz Mode
  let quizCurrentWord = null;
  let quizOptions = [];
  let quizScore = 0;
  let quizRoundIndex = 0;
  const QUIZ_ROUND_TOTAL = 10;
  let quizAnswered = false;
  let quizAwaitingNextEnter = false;
  let quizPressedEnterDuringSpeech = false;

  // State for Flashcard Mode
  let flashcardQueue = [];
  let flashcardIndex = 0;
  let flashcardFlipped = false;

  // Audio Context (Web Audio API)
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ==========================================
  // SOUND EFFECTS GENERATOR
  // ==========================================
  const SFX = {
    playChillWelcome(onComplete) {
      if (!settings.soundEnabled) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }
      initAudioContext();
      if (!audioCtx) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const now = audioCtx.currentTime;

      // Warm lowpass filter for gentle lofi ambient warmth
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.Q.setValueAtTime(1.0, now);
      filter.connect(audioCtx.destination);

      // Deep soothing warm ambient pad base: C3 (130.81Hz)
      const padOsc = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      padOsc.type = 'sine';
      padOsc.frequency.setValueAtTime(130.81, now);
      padGain.gain.setValueAtTime(0, now);
      padGain.gain.linearRampToValueAtTime(0.08, now + 0.25);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      padOsc.connect(padGain);
      padGain.connect(filter);
      padOsc.start(now);
      padOsc.stop(now + 2.3);

      // Dreamy, peaceful Cmaj9 chill chime arpeggio: C4, G4, B4, D5, E5, G5
      const notes = [
        { freq: 261.63, time: 0.00, dur: 1.6, vol: 0.12 }, // C4
        { freq: 392.00, time: 0.16, dur: 1.7, vol: 0.11 }, // G4
        { freq: 493.88, time: 0.32, dur: 1.8, vol: 0.13 }, // B4
        { freq: 587.33, time: 0.48, dur: 1.9, vol: 0.14 }, // D5
        { freq: 659.25, time: 0.64, dur: 2.1, vol: 0.15 }, // E5
        { freq: 783.99, time: 0.82, dur: 2.2, vol: 0.12 }  // G5
      ];

      notes.forEach(item => {
        const t = now + item.time;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        const g2 = audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(item.freq, t);

        // Detuned gentle triangle for soft sparkle
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(item.freq * 1.002, t);

        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(item.vol, t + 0.035);
        g1.gain.exponentialRampToValueAtTime(0.001, t + item.dur);

        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(item.vol * 0.4, t + 0.035);
        g2.gain.exponentialRampToValueAtTime(0.001, t + item.dur);

        osc1.connect(g1);
        g1.connect(filter);

        osc2.connect(g2);
        g2.connect(filter);

        osc1.start(t);
        osc1.stop(t + item.dur + 0.05);
        osc2.start(t);
        osc2.stop(t + item.dur + 0.05);
      });

      if (typeof onComplete === 'function') {
        setTimeout(onComplete, 1100);
      }
    },

    playSuccess() {
      if (!settings.soundEnabled) return;
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.36);
      });
    },

    playPartial() {
      if (!settings.soundEnabled) return;
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    },

    playError() {
      if (!settings.soundEnabled) return;
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    },

    playFlip() {
      if (!settings.soundEnabled) return;
      initAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  };

  // ==========================================
  // CONTINUOUS AUTOMATIC CHILL BGM ENGINE
  // ==========================================
  const ChillBGM = {
    isPlaying: false,
    intervalId: null,
    gainNode: null,
    filterNode: null,
    currentChordIdx: 0,
    isMutedByUser: false,
    _autoStartHandler: null,

    // Dreamy Lo-Fi Progression: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
    progression: [
      {
        name: 'Fmaj7',
        bass: 174.61, // F3
        notes: [349.23, 440.00, 523.25, 659.25], // F4, A4, C5, E5
        melody: [659.25, 523.25, 440.00]
      },
      {
        name: 'Em7',
        bass: 164.81, // E3
        notes: [329.63, 392.00, 493.88, 587.33], // E4, G4, B4, D5
        melody: [587.33, 493.88, 392.00]
      },
      {
        name: 'Dm7',
        bass: 146.83, // D3
        notes: [293.66, 349.23, 440.00, 523.25], // D4, F4, A4, C5
        melody: [523.25, 440.00, 349.23]
      },
      {
        name: 'Cmaj7',
        bass: 130.81, // C3
        notes: [261.63, 329.63, 392.00, 493.88], // C4, E4, G4, B4
        melody: [493.88, 392.00, 329.63]
      }
    ],

    init() {
      try {
        this.isMutedByUser = localStorage.getItem('vocab_bgm_muted') === 'true';
      } catch (e) {
        this.isMutedByUser = false;
      }

      if (this.isMutedByUser) {
        this.updateUI(false);
        return;
      }

      // Tự động phát nhạc chill khi mở trang hoặc khi có cử chỉ tương tác đầu tiên
      const autoStart = () => {
        if (this.isMutedByUser) {
          this._removeAutoStartListeners();
          return;
        }
        initAudioContext();
        if (audioCtx && audioCtx.state === 'running') {
          this.start(false);
          this._removeAutoStartListeners();
        } else if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => {
            if (audioCtx.state === 'running' && !this.isMutedByUser) {
              this.start(false);
              this._removeAutoStartListeners();
            }
          }).catch(() => {});
        }
      };

      this._autoStartHandler = autoStart;
      this._removeAutoStartListeners = () => {
        if (this._autoStartHandler) {
          window.removeEventListener('pointerdown', this._autoStartHandler);
          window.removeEventListener('keydown', this._autoStartHandler);
          window.removeEventListener('click', this._autoStartHandler);
          this._autoStartHandler = null;
        }
      };

      window.addEventListener('pointerdown', this._autoStartHandler, { passive: true });
      window.addEventListener('keydown', this._autoStartHandler, { passive: true });
      window.addEventListener('click', this._autoStartHandler, { passive: true });

      // Khởi chạy ngay lập tức nếu trình duyệt cho phép autoplay
      autoStart();
    },

    start(manual = false) {
      if (this.isPlaying) return;
      if (this.isMutedByUser && !manual) return;
      if (manual) {
        this.isMutedByUser = false;
        try { localStorage.setItem('vocab_bgm_muted', 'false'); } catch (e) {}
      }

      initAudioContext();
      if (!audioCtx) return;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          if (audioCtx.state === 'running' && (manual || !this.isMutedByUser)) {
            this._beginPlayback();
          }
        }).catch(() => {});
        return;
      }

      this._beginPlayback();
    },

    _beginPlayback() {
      if (this.isPlaying) return;
      if (!audioCtx || audioCtx.state !== 'running') return;

      this.isPlaying = true;
      this.currentChordIdx = 0;

      // Master output filter & gain for warm, velvety chill BGM
      this.filterNode = audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1350, audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(0.8, audioCtx.currentTime);

      this.gainNode = audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.24, audioCtx.currentTime + 1.2); // Gentle fade-in

      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(audioCtx.destination);

      this.playNextChord();
      if (this.intervalId) clearInterval(this.intervalId);
      // Mỗi hợp âm ngân vang 3.4 giây (nhịp điệu Lo-Fi thư giãn)
      this.intervalId = setInterval(() => {
        if (!this.isPlaying) return;
        this.playNextChord();
      }, 3400);

      this.updateUI(true);
    },

    stop(manual = false) {
      if (manual) {
        this.isMutedByUser = true;
        try { localStorage.setItem('vocab_bgm_muted', 'true'); } catch (e) {}
        if (typeof this._removeAutoStartListeners === 'function') {
          this._removeAutoStartListeners();
        }
      }

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      if (this.gainNode && audioCtx) {
        try {
          this.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
          this.gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
          this.gainNode.disconnect();
        } catch (e) {}
        this.gainNode = null;
      }

      this.isPlaying = false;
      this.updateUI(false);
    },

    toggle() {
      if (this.isPlaying) {
        this.stop(true);
        showToast('Đã tắt nhạc Chill 🔇', 'info');
      } else {
        this.start(true);
        showToast('Đã bật nhạc Chill thư giãn 🎵', 'info');
      }
    },

    playNextChord() {
      if (!this.isPlaying || !audioCtx || audioCtx.state !== 'running' || !this.filterNode) return;
      const now = audioCtx.currentTime;
      const chord = this.progression[this.currentChordIdx];
      this.currentChordIdx = (this.currentChordIdx + 1) % this.progression.length;

      // 1. Soft Warm Bass (Sine wave)
      const bassOsc = audioCtx.createOscillator();
      const bassGain = audioCtx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(chord.bass, now);
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.14, now + 0.2);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      bassOsc.connect(bassGain);
      bassGain.connect(this.filterNode);
      bassOsc.start(now);
      bassOsc.stop(now + 3.3);

      // 2. Lush Rhodes / Electric Piano Chords
      chord.notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.06; // gentle strum/arpeggiate
        const osc = audioCtx.createOscillator();
        const oscDetune = audioCtx.createOscillator();
        const g = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        oscDetune.type = 'triangle';
        oscDetune.frequency.setValueAtTime(freq * 1.0015, noteStart);

        g.gain.setValueAtTime(0, noteStart);
        g.gain.linearRampToValueAtTime(0.07, noteStart + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, noteStart + 3.1);

        osc.connect(g);
        oscDetune.connect(g);
        g.connect(this.filterNode);

        osc.start(noteStart);
        osc.stop(noteStart + 3.2);
        oscDetune.start(noteStart);
        oscDetune.stop(noteStart + 3.2);
      });

      // 3. Delicate Melody Sparkle Note (drops gently)
      if (chord.melody && chord.melody.length > 0) {
        const melNote = chord.melody[Math.floor(Math.random() * chord.melody.length)];
        const melStart = now + 1.2 + Math.random() * 0.8;
        const melOsc = audioCtx.createOscillator();
        const melGain = audioCtx.createGain();

        melOsc.type = 'sine';
        melOsc.frequency.setValueAtTime(melNote, melStart);
        melGain.gain.setValueAtTime(0, melStart);
        melGain.gain.linearRampToValueAtTime(0.045, melStart + 0.04);
        melGain.gain.exponentialRampToValueAtTime(0.001, melStart + 1.6);

        melOsc.connect(melGain);
        melGain.connect(this.filterNode);
        melOsc.start(melStart);
        melOsc.stop(melStart + 1.7);
      }
    },

    updateUI(active) {
      document.querySelectorAll('.chill-bgm-toggle-btn').forEach(btn => {
        btn.classList.toggle('is-playing', active);
        const text = btn.querySelector('.bgm-status-text');
        if (text) {
          if (btn.id === 'intro-bgm-status') {
            text.textContent = active ? 'Nhạc Chill Tự Động 🎵' : 'Nhạc Chill: Đã Tắt 🔇';
          } else {
            text.textContent = active ? 'Nhạc Chill 🎵' : 'Nhạc Chill 🔇';
          }
        }
      });
    }
  };

  // Text-To-Speech (Phát âm tiếng Anh bản ngữ)
  function speakWord(text, onFinish, isManual = false) {
    if (!settings.soundEnabled || !text) {
      isSpeechSpeaking = false;
      if (typeof onFinish === 'function') onFinish();
      return;
    }
    // Tuyệt đối không phát âm voice nếu người dùng chưa chọn chương (trừ khi người dùng bấm nút loa thủ công)
    if (!hasUserSelectedChapter && !isManual) {
      isSpeechSpeaking = false;
      if (typeof onFinish === 'function') onFinish();
      return;
    }
    if (!('speechSynthesis' in window)) {
      isSpeechSpeaking = false;
      if (typeof onFinish === 'function') onFinish();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (engVoice) utterance.voice = engVoice;

    isSpeechSpeaking = true;
    currentSpeechUtterance = utterance;

    let hasCompleted = false;
    const finish = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      isSpeechSpeaking = false;
      if (currentSpeechUtterance === utterance) {
        currentSpeechUtterance = null;
      }
      if (typeof onFinish === 'function') {
        onFinish();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    // Safety timeout: Chrome/Edge can occasionally freeze onend if audio device is suspended
    const fallbackMs = Math.max(2200, (text || '').length * 180);
    setTimeout(finish, fallbackMs);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      finish();
    }
  }

  function stopSpeech() {
    isSpeechSpeaking = false;
    currentSpeechUtterance = null;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }

  // ==========================================
  // CONFETTI EFFECT
  // ==========================================
  const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animId: null,

    init() {
      this.canvas = document.getElementById('confetti-canvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    fire(count = 70) {
      this.init();
      if (!this.canvas || !this.ctx) return;
      const colors = ['#6366f1', '#a855f7', '#10b981', '#fbbf24', '#38bdf8', '#ec4899'];

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.canvas.width / 2 + (Math.random() - 0.5) * 300,
          y: this.canvas.height * 0.45,
          vx: (Math.random() - 0.5) * 14,
          vy: (Math.random() - 0.9) * 16,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          life: 1,
          decay: Math.random() * 0.015 + 0.012
        });
      }

      if (!this.animId) this.animate();
    },

    animate() {
      if (Confetti.particles.length === 0) {
        Confetti.animId = null;
        if (Confetti.ctx && Confetti.canvas) {
          Confetti.ctx.clearRect(0, 0, Confetti.canvas.width, Confetti.canvas.height);
        }
        return;
      }

      Confetti.ctx.clearRect(0, 0, Confetti.canvas.width, Confetti.canvas.height);

      for (let i = Confetti.particles.length - 1; i >= 0; i--) {
        const p = Confetti.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.rotation += p.vRot;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > Confetti.canvas.height) {
          Confetti.particles.splice(i, 1);
          continue;
        }

        Confetti.ctx.save();
        Confetti.ctx.translate(p.x, p.y);
        Confetti.ctx.rotate((p.rotation * Math.PI) / 180);
        Confetti.ctx.fillStyle = p.color;
        Confetti.ctx.globalAlpha = p.life;
        Confetti.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        Confetti.ctx.restore();
      }

      Confetti.animId = requestAnimationFrame(() => Confetti.animate());
    }
  };

  // Toast Notification
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================
  // DATA PERSISTENCE & CHAPTER LOGIC
  // ==========================================
  function loadData() {
    try {
      // 1. Chapters (Chỉ khởi tạo 1 chương duy nhất ban đầu)
      const storedChapters = localStorage.getItem(STORAGE_KEYS.CHAPTERS);
      if (storedChapters) {
        chapters = JSON.parse(storedChapters);
        // Dọn dẹp các chương mẫu cũ 1-5 nếu còn lưu trong LocalStorage để chỉ có 1 chương ban đầu
        const legacyIds = ['chap-1', 'chap-2', 'chap-3', 'chap-4', 'chap-5'];
        if (chapters.some(c => legacyIds.includes(c.id))) {
          chapters = chapters.filter(c => !legacyIds.includes(c.id));
          if (chapters.length === 0) {
            chapters = JSON.parse(JSON.stringify(DEFAULT_CHAPTERS));
          }
          saveChapters();
        }
      } else {
        chapters = JSON.parse(JSON.stringify(DEFAULT_CHAPTERS));
        saveChapters();
      }

      // 2. Vocabulary
      const storedVocab = localStorage.getItem(STORAGE_KEYS.VOCAB);
      if (storedVocab) {
        vocabulary = JSON.parse(storedVocab);
        const legacyIds = ['chap-1', 'chap-2', 'chap-3', 'chap-4', 'chap-5'];
        if (vocabulary.some(v => legacyIds.includes(v.chapterId))) {
          vocabulary = vocabulary.filter(v => !legacyIds.includes(v.chapterId));
          saveVocabulary();
        }
      } else {
        vocabulary = JSON.parse(JSON.stringify(DEFAULT_VOCABULARY));
        saveVocabulary();
      }

      // Mặc định chọn chương đầu tiên nếu có, nếu không thì 'all'
      currentChapterId = chapters[0]?.id || 'all';

      // 3. Stats & Settings
      const storedStats = localStorage.getItem(STORAGE_KEYS.STATS);
      if (storedStats) stats = Object.assign(stats, JSON.parse(storedStats));

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (storedSettings) settings = Object.assign(settings, JSON.parse(storedSettings));
      if (settings.strictCorrection === undefined) settings.strictCorrection = true;

      const storedKey = localStorage.getItem(STORAGE_KEYS.AI_KEY);
      if (storedKey) settings.geminiApiKey = storedKey;
    } catch (e) {
      console.error('Error loading data', e);
      chapters = JSON.parse(JSON.stringify(DEFAULT_CHAPTERS));
      vocabulary = JSON.parse(JSON.stringify(DEFAULT_VOCABULARY));
    }
  }

  function saveVocabulary() {
    try {
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(vocabulary));
    } catch (e) {
      console.error('Error saving vocabulary', e);
    }
    updateHeaderStats();
    renderStatsView();
  }

  function saveChapters() {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAPTERS, JSON.stringify(chapters));
    } catch (e) {
      console.error('Error saving chapters', e);
    }
    renderChapterDropdowns();
    renderChapterManageList();
    renderStatsView();
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.error('Error saving stats', e);
    }
    updateHeaderStats();
    renderStatsView();
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      if (settings.geminiApiKey) {
        localStorage.setItem(STORAGE_KEYS.AI_KEY, settings.geminiApiKey);
      } else {
        localStorage.removeItem(STORAGE_KEYS.AI_KEY);
      }
    } catch (e) {
      console.error('Error saving settings', e);
    }
  }

  // Get active vocabulary filtered by selected chapter
  function getActiveVocabulary() {
    if (currentChapterId === 'all') {
      return vocabulary;
    }
    return vocabulary.filter(v => v.chapterId === currentChapterId);
  }

  function getChapterName(chapterId) {
    const chap = chapters.find(c => c.id === chapterId);
    return chap ? chap.name : 'Chương chung';
  }

  function renderChapterDropdowns() {
    const globalSelect = document.getElementById('global-chapter-select');
    const formChapter = document.getElementById('form-chapter');
    const filterChapter = document.getElementById('filter-chapter');

    const totalWords = vocabulary.length;

    // 1. Global selector
    if (globalSelect) {
      globalSelect.innerHTML = `<option value="all">🌟 Tất cả các chương (Toàn bộ ${totalWords} từ)</option>`;
      chapters.forEach(ch => {
        const count = vocabulary.filter(v => v.chapterId === ch.id).length;
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = `${ch.name} (${count} từ)`;
        if (ch.id === currentChapterId) opt.selected = true;
        globalSelect.appendChild(opt);
      });
    }

    // 2. Form select
    if (formChapter) {
      formChapter.innerHTML = '';
      chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = ch.name;
        formChapter.appendChild(opt);
      });
    }

    // 3. Filter in vocabulary list
    if (filterChapter) {
      filterChapter.innerHTML = `<option value="all">Tất cả chương</option>`;
      chapters.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id;
        opt.textContent = ch.name;
        filterChapter.appendChild(opt);
      });
    }

    // 4. Quick Chapter Pill Buttons (Bấm trực tiếp vào chương cần học & tự động nói từ)
    const pillsContainer = document.getElementById('quick-chapter-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';

      // Pill 'all'
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = `chapter-pill-btn ${currentChapterId === 'all' && hasUserSelectedChapter ? 'active' : ''}`;
      allBtn.dataset.chapterId = 'all';
      allBtn.innerHTML = `<span>🌟</span> <strong>Tất cả chương</strong> <span class="pill-badge">${totalWords} từ</span>`;
      allBtn.onclick = () => selectChapterAndSpeak('all');
      pillsContainer.appendChild(allBtn);

      // Pills cho từng chương cụ thể
      chapters.forEach(ch => {
        const count = vocabulary.filter(v => v.chapterId === ch.id).length;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chapter-pill-btn ${currentChapterId === ch.id && hasUserSelectedChapter ? 'active' : ''}`;
        btn.dataset.chapterId = ch.id;
        btn.innerHTML = `<span>📖</span> <strong>${ch.name}</strong> <span class="pill-badge">${count} từ</span> <span class="pill-voice-icon">🔊</span>`;
        btn.onclick = () => selectChapterAndSpeak(ch.id);
        pillsContainer.appendChild(btn);
      });
    }
  }

  // Tự động voice phát âm từ khi bấm vào chương cần học
  function selectChapterAndSpeak(chapId) {
    hasUserSelectedChapter = true;
    currentChapterId = chapId;

    const globalSelect = document.getElementById('global-chapter-select');
    if (globalSelect) globalSelect.value = chapId;

    // Cập nhật trạng thái active cho các nút bấm chương
    document.querySelectorAll('.chapter-pill-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.chapterId === chapId);
    });

    showToast(currentChapterId === 'all' ? 'Đã chọn: Tất cả các chương' : `Đang học: ${getChapterName(currentChapterId)} 🔊`, 'info');

    initCheckMode(true);
    initFlashcardMode(true);
    updateHeaderStats();

    // Phát âm từ đầu tiên của chương ngay lập tức khi bấm chọn chương
    setTimeout(() => {
      const activeSection = document.querySelector('.view-section.active');
      let targetWord = '';
      if (activeSection && activeSection.id === 'flashcard-view') {
        const item = flashcardQueue[flashcardIndex] || flashcardQueue[0];
        targetWord = item?.word;
      } else if (activeSection && activeSection.id === 'quiz-view') {
        targetWord = quizCurrentWord?.word;
      } else {
        const item = checkQueue[checkIndex] || checkQueue[0];
        targetWord = item?.word;
      }

      if (targetWord && settings.soundEnabled) {
        speakWord(targetWord, null, true);
      }
    }, 60);
  }

  function updateHeaderStats() {
    const activeVocab = getActiveVocabulary();
    const masteredCount = activeVocab.filter(v => v.mastered).length;
    const totalCount = activeVocab.length;

    const streakElem = document.getElementById('streak-count');
    const headerMastered = document.getElementById('header-mastered-count');

    if (streakElem) streakElem.textContent = stats.currentStreak;
    if (headerMastered) headerMastered.textContent = `${masteredCount}/${totalCount}`;

    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) soundIcon.textContent = settings.soundEnabled ? '🔊' : '🔇';
  }

  // ==========================================
  // SMART AI SEMANTIC MEANING EVALUATOR
  // ==========================================
  const AIMeaningChecker = {
    // Normalization helper
    cleanText(str) {
      return (str || '')
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    // Offline Built-in NLP Semantic Matcher
    evaluateOffline(userText, item) {
      const cleanUser = this.cleanText(userText);
      const cleanTarget = this.cleanText(item.meaning);

      if (!cleanUser) {
        return {
          score: 0,
          verdict: 'wrong',
          title: 'Chưa có câu trả lời',
          explanation: 'Bạn chưa nhập nghĩa tiếng Việt.',
          synonyms: item.meaning
        };
      }

      // Collect all acceptable synonyms
      const allSynonyms = [item.meaning];
      if (item.synonyms && Array.isArray(item.synonyms)) {
        allSynonyms.push(...item.synonyms);
      }
      // Also split comma-separated meanings
      item.meaning.split(/[,;\/]/).forEach(part => {
        const p = part.trim();
        if (p && !allSynonyms.includes(p)) allSynonyms.push(p);
      });

      const cleanedSynonyms = allSynonyms.map(s => this.cleanText(s)).filter(Boolean);

      // Check 1: Exact match with target meaning or any synonym
      for (const syn of cleanedSynonyms) {
        if (cleanUser === syn) {
          return {
            score: 100,
            verdict: 'perfect',
            title: '🎉 Chính xác tuyệt đối (100%)',
            explanation: `Nghĩa bạn gõ hoàn toàn trùng khớp với định nghĩa chuẩn của từ "${item.word}".`,
            synonyms: allSynonyms.slice(0, 4).join(', ')
          };
        }
      }

      // Check 2: Substring or high containment match
      for (const syn of cleanedSynonyms) {
        if (cleanUser.includes(syn) || syn.includes(cleanUser)) {
          // If length ratio is close
          const ratio = Math.min(cleanUser.length, syn.length) / Math.max(cleanUser.length, syn.length);
          if (ratio > 0.45) {
            const score = Math.round(85 + ratio * 15);
            return {
              score: Math.min(score, 98),
              verdict: 'perfect',
              title: `✨ Rất chính xác (${score}%)`,
              explanation: `Tuyệt vời! Nghĩa bạn đưa ra nắm bắt trọn vẹn ngữ nghĩa cốt lõi của từ "${item.word}".`,
              synonyms: allSynonyms.slice(0, 4).join(', ')
            };
          }
        }
      }

      // Check 3: Word token overlap
      const userWords = cleanUser.split(' ');
      let maxOverlap = 0;
      let matchedSyn = '';

      cleanedSynonyms.forEach(syn => {
        const synWords = syn.split(' ');
        let matches = 0;
        userWords.forEach(w => {
          if (w.length >= 2 && synWords.includes(w)) matches++;
        });
        const overlapRatio = matches / Math.max(userWords.length, synWords.length);
        if (overlapRatio > maxOverlap) {
          maxOverlap = overlapRatio;
          matchedSyn = syn;
        }
      });

      if (maxOverlap >= 0.5) {
        const score = Math.round(75 + maxOverlap * 20);
        return {
          score,
          verdict: 'perfect',
          title: `Đồng nghĩa tốt (${score}%)`,
          explanation: `Ý nghĩa câu trả lời rất sát với nghĩa chuẩn trong ngữ cảnh bài học.`,
          synonyms: allSynonyms.slice(0, 4).join(', ')
        };
      } else if (maxOverlap >= 0.25) {
        const score = Math.round(55 + maxOverlap * 20);
        return {
          score,
          verdict: 'good',
          title: `Gần đúng (${score}%)`,
          explanation: `Bạn đã nắm được một phần ý nghĩa, tuy nhiên nên bổ sung thêm sắc thái diễn đạt cho đầy đủ hơn.`,
          synonyms: allSynonyms.slice(0, 4).join(', ')
        };
      }

      // Check 4: If none matched
      return {
        score: 25,
        verdict: 'wrong',
        title: 'Chưa chính xác (25%)',
        explanation: `Nghĩa bạn nhập khác với nghĩa thông dụng của từ "${item.word}" trong bài học.`,
        synonyms: allSynonyms.slice(0, 4).join(', ')
      };
    },

    // Online Gemini API Semantic Evaluator (Optional when API Key is supplied)
    async evaluateOnline(userText, item) {
      const apiKey = settings.geminiApiKey.trim();
      if (!apiKey) {
        return this.evaluateOffline(userText, item);
      }

      const prompt = `Bạn là một chuyên gia ngôn ngữ học Anh - Việt thông thái. Hãy chấm điểm nghĩa tiếng Việt của người học.
Từ tiếng Anh: "${item.word}" (loại từ: ${item.partOfSpeech || 'n/a'})
Nghĩa tiếng Việt chuẩn trong giáo trình: "${item.meaning}"
Câu ví dụ: "${item.example || ''}"
Nghĩa tiếng Việt mà người học đã gõ: "${userText}"

Hãy phân tích xem nghĩa người học gõ có đồng nghĩa, gần nghĩa hoặc chấp nhận được trong ngữ cảnh này không (tiếng Việt có nhiều từ đồng nghĩa).
Trả về KẾT QUẢ DUY NHẤT dạng JSON (không có markdown khác ngoài JSON):
{
  "score": <số nguyên từ 0 đến 100>,
  "verdict": "<'perfect' nếu score >= 80, 'good' nếu 50-79, 'wrong' nếu < 50>",
  "title": "<Lời nhận xét ngắn gọn 3-5 từ, ví dụ: 'Đồng nghĩa xuất sắc (95%)' hoặc 'Chưa sát nghĩa (30%)'>",
  "explanation": "<Lời giải thích thân thiện 1-2 câu về sắc thái nghĩa của từ và so sánh cách dịch của người học>",
  "synonyms": "<3-4 từ đồng nghĩa tiếng Việt hay nhất của từ này>"
}`;

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
          })
        });

        if (!res.ok) {
          console.warn('Gemini API request failed, falling back to offline evaluator.');
          return this.evaluateOffline(userText, item);
        }

        const data = await res.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) return this.evaluateOffline(userText, item);

        const cleanJson = rawContent.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err) {
        console.error('Error calling Gemini API:', err);
        return this.evaluateOffline(userText, item);
      }
    }
  };

  // ==========================================
  // MODAL BÁO HOÀN THÀNH CHƯƠNG (ẢNH LUFFY & BẤM PHÍM BẤT KỲ ĐỂ QUAY LẠI)
  // ==========================================
  function showChapterCompleteModal() {
    isChapterCompleteModalActive = true;
    stopSpeech();
    Confetti.fire(180);
    SFX.playSuccess();
    const modal = document.getElementById('chapter-complete-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
    const chapName = getChapterName(currentChapterId);
    const title = document.getElementById('complete-chapter-title');
    const desc = document.getElementById('complete-chapter-desc');
    if (title) {
      title.textContent = `Đã Học Hết Toàn Bộ Từ Trong ${chapName}!`;
    }
    if (desc) {
      desc.textContent = `Bạn đã hoàn thành đủ tất cả các từ vựng của chương! Luffy rất vui và tự hào về bạn! Bấm phím bất kỳ hoặc click màn hình để quay lại nhé! ✨`;
    }
  }

  function dismissChapterCompleteModal() {
    if (!isChapterCompleteModalActive) return;
    isChapterCompleteModalActive = false;
    const modal = document.getElementById('chapter-complete-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    checkIndex = 0;
    flashcardIndex = 0;
    initCheckMode(true);
    initFlashcardMode(true);
    showToast('Đã quay lại học từ đầu chương! Tiếp tục phát huy nhé! 🚀', 'info');
  }

  // ==========================================
  // MODE 1: GÕ TỪ & CHECK ĐÚNG / SAI
  // ==========================================
  function initCheckMode(shuffle = false) {
    const activeVocab = getActiveVocabulary();
    if (activeVocab.length === 0) {
      showToast('Chương này hiện chưa có từ vựng nào! Hãy thêm từ mới.', 'warning');
      return;
    }

    if (shuffle || checkQueue.length === 0) {
      checkQueue = [...activeVocab];
      checkQueue.sort((a, b) => {
        if (a.mastered === b.mastered) return Math.random() - 0.5;
        return a.mastered ? 1 : -1;
      });
      checkIndex = 0;
    }

    renderCurrentCheckWord();
  }

  function renderCurrentCheckWord() {
    if (checkIndex >= checkQueue.length && checkQueue.length > 0) {
      showChapterCompleteModal();
      return;
    }

    const item = checkQueue[checkIndex];
    if (!item) return;

    checkAnswerSubmitted = false;

    // Update progress bar
    const progressFill = document.getElementById('check-progress-fill');
    const progressText = document.getElementById('check-progress-text');
    if (progressFill) progressFill.style.width = `${((checkIndex + 1) / checkQueue.length) * 100}%`;
    if (progressText) progressText.textContent = `Từ ${checkIndex + 1} / ${checkQueue.length}`;

    // Update badges
    const promptChapterName = document.getElementById('prompt-chapter-name');
    const promptPos = document.getElementById('prompt-pos');
    const promptTitle = document.getElementById('prompt-title-text');
    const promptPhonetic = document.getElementById('prompt-phonetic-sub');
    const promptSpeakBtn = document.getElementById('prompt-speak-btn');
    const promptSentence = document.getElementById('prompt-sentence');

    if (promptChapterName) promptChapterName.textContent = getChapterName(item.chapterId);
    if (promptPos) promptPos.textContent = item.partOfSpeech || 'word';

    const input = document.getElementById('check-user-input');

    // Hiển thị phiên âm IPA chuẩn ngay cạnh nghĩa/từ cho người học quan sát
    if (promptPhonetic) {
      if (item.phonetic) {
        promptPhonetic.innerHTML = `<span>🗣️ Phiên âm:</span> <strong>${item.phonetic}</strong>`;
        promptPhonetic.style.display = 'inline-flex';
      } else {
        promptPhonetic.style.display = 'none';
      }
    }

    if (promptSpeakBtn) {
      promptSpeakBtn.style.display = 'inline-grid';
      promptSpeakBtn.onclick = () => speakWord(item.word, null, true);
    }

    // Chế độ Vi -> En (Gõ tiếng Anh)
    if (currentStudyDirection === 'vi-en') {
      if (promptTitle) promptTitle.textContent = item.meaning;

      if (item.example) {
        const escapedWord = item.word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        let sentenceWithBlank = item.example.replace(regex, '<mark>_______</mark>');
        if (!sentenceWithBlank.includes('<mark>_______</mark>')) {
          sentenceWithBlank = `"${item.example}"`;
        }
        if (promptSentence) {
          promptSentence.innerHTML = `${sentenceWithBlank}<span class="sentence-trans">${item.exampleMeaning || ''}</span>`;
        }
      } else {
        if (promptSentence) {
          promptSentence.innerHTML = `Hãy gõ từ tiếng Anh tương ứng với nghĩa trên.<span class="sentence-trans"></span>`;
        }
      }

      if (input) input.placeholder = 'Gõ từ tiếng Anh tương ứng tại đây... (Enter để kiểm tra)';
    }
    // Chế độ En -> Vi (AI Check nghĩa Tiếng Việt)
    else {
      if (promptTitle) promptTitle.textContent = item.word;

      if (promptSentence) {
        promptSentence.innerHTML = `"${item.example || 'Example sentence not provided.'}"<span class="sentence-trans" style="color: #38bdf8;">Hãy dịch nghĩa của từ "${item.word}" sang tiếng Việt theo cách hiểu của bạn. AI sẽ phân tích ngữ nghĩa!</span>`;
      }

      if (input) input.placeholder = 'Gõ nghĩa tiếng Việt của từ này... (Enter để AI chấm điểm)';
    }

    // Reset card UI states
    const card = document.getElementById('test-card');
    const stdFeedback = document.getElementById('standard-feedback-box');
    const aiFeedback = document.getElementById('ai-feedback-box');
    const actionsDefault = document.getElementById('typing-actions-default');
    const actionsNext = document.getElementById('typing-actions-next');
    const aiLoading = document.getElementById('ai-loading-indicator');
    const diffCard = document.getElementById('char-diff-card');
    const submitBtn = document.getElementById('submit-check-btn');

    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    isAwaitingCorrection = false;

    if (diffCard) {
      diffCard.style.display = 'none';
      diffCard.classList.remove('is-resolved');
    }
    if (submitBtn) {
      submitBtn.innerHTML = '<span>✓</span> Kiểm Tra (Enter)';
    }

    if (input) {
      input.value = '';
      input.className = 'vocab-input';
      input.disabled = false;
      input.focus();
    }
    if (card) card.classList.remove('is-correct', 'is-wrong', 'is-partial');
    if (stdFeedback) stdFeedback.className = 'ai-eval-box';
    if (aiFeedback) aiFeedback.className = 'ai-eval-box';
    if (aiLoading) aiLoading.classList.remove('active');
    if (actionsDefault) actionsDefault.style.display = 'flex';
    if (actionsNext) actionsNext.style.display = 'none';

    // Chỉ tự động phát âm khi người dùng đã chọn chương học (mới vào trang chưa chọn thì không phát âm)
    if (hasUserSelectedChapter && settings.soundEnabled && item && item.word) {
      speakWord(item.word);
    }
  }

  // ==========================================
  // CHARACTER-LEVEL DIFF ALGORITHM (SAI ĐÂU BÁO ĐỎ Ở ĐẤY)
  // ==========================================
  function computeCharDiff(inputStr, targetStr) {
    const s1 = (inputStr || '').trim();
    const s2 = (targetStr || '').trim();
    const s1Lower = s1.toLowerCase();
    const s2Lower = s2.toLowerCase();

    const m = s1Lower.length;
    const n = s2Lower.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1Lower[i - 1] === s2Lower[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j - 1], // Thay thế (sai ký tự)
            dp[i - 1][j],     // Dư ký tự
            dp[i][j - 1]      // Thiếu ký tự
          );
        }
      }
    }

    let i = m, j = n;
    const diffStream = [];
    let wrongCount = 0;
    let missingCount = 0;
    let extraCount = 0;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && s1Lower[i - 1] === s2Lower[j - 1]) {
        diffStream.unshift({
          type: s1[i - 1] === ' ' ? 'space' : 'correct',
          char: s1[i - 1],
          expected: s2[j - 1]
        });
        i--; j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        wrongCount++;
        diffStream.unshift({
          type: 'wrong',
          char: s1[i - 1] === ' ' ? '␣' : s1[i - 1],
          expected: s2[j - 1]
        });
        i--; j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        extraCount++;
        diffStream.unshift({
          type: 'extra',
          char: s1[i - 1] === ' ' ? '␣' : s1[i - 1],
          expected: ''
        });
        i--;
      } else {
        missingCount++;
        diffStream.unshift({
          type: 'missing',
          char: s2[j - 1] === ' ' ? '␣' : s2[j - 1],
          expected: s2[j - 1]
        });
        j--;
      }
    }

    const isMatch = (m > 0) && (wrongCount === 0 && missingCount === 0 && extraCount === 0);
    return {
      diffStream,
      wrongCount,
      missingCount,
      extraCount,
      isMatch
    };
  }

  function renderCharDiffStream(diffResult, targetWord) {
    const diffCard = document.getElementById('char-diff-card');
    const streamElem = document.getElementById('char-diff-stream');
    const titleElem = document.getElementById('char-diff-title');
    const iconElem = document.getElementById('char-diff-icon');

    if (!diffCard || !streamElem) return;

    diffCard.style.display = 'block';

    if (diffResult.isMatch) {
      diffCard.classList.add('is-resolved');
      if (iconElem) iconElem.textContent = '🎉';
      if (titleElem) titleElem.textContent = 'ĐÃ SỬA CHÍNH XÁC! Tuyệt vời!';
    } else {
      diffCard.classList.remove('is-resolved');
      if (iconElem) iconElem.textContent = '🔴';
      if (titleElem) titleElem.textContent = 'Vị trí ký tự sai được báo đỏ dưới đây (hãy sửa lại cho đúng):';
    }

    // Chỉ báo đỏ các vị trí sai, hoàn toàn KHÔNG hiện đáp án hay ký tự gợi ý
    streamElem.innerHTML = diffResult.diffStream.map(item => {
      if (item.type === 'space') {
        return `<span class="char-box char-space" title="Khoảng trắng">␣</span>`;
      } else if (item.type === 'correct') {
        return `<span class="char-box char-correct">${escapeHtml(item.char)}</span>`;
      } else if (item.type === 'wrong') {
        // Báo đỏ ký tự gõ sai tại đúng vị trí, không hiển thị ký tự chuẩn
        return `<span class="char-box char-wrong" title="Sai ký tự tại vị trí này">${escapeHtml(item.char)}</span>`;
      } else if (item.type === 'extra') {
        // Ký tự bị thừa
        return `<span class="char-box char-extra" title="Ký tự bị thừa">${escapeHtml(item.char)}</span>`;
      } else if (item.type === 'missing') {
        // Vị trí còn thiếu ký tự: chỉ hiện gạch đỏ '_', không tiết lộ chữ cái nào
        return `<span class="char-box char-missing" title="Thiếu ký tự tại vị trí này">_</span>`;
      }
      return '';
    }).join('');
  }

  // ==========================================
  // HỆ THỐNG ĐẾM NGƯỢC XEM ĐÁP ÁN & NGHĨA (1 PHÚT / 60S HOẶC ENTER CHUYỂN NGAY)
  // ==========================================
  function startAnswerCountdown(onExpire) {
    stopAnswerCountdown();
    answerCountdownSeconds = 60; // 1 phút để người học quan sát kỹ đáp án và nghĩa
    updateNextButtonCountdown();

    answerCountdownTimer = setInterval(() => {
      answerCountdownSeconds--;
      updateNextButtonCountdown();
      if (answerCountdownSeconds <= 0) {
        stopAnswerCountdown();
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  function stopAnswerCountdown() {
    if (answerCountdownTimer) {
      clearInterval(answerCountdownTimer);
      answerCountdownTimer = null;
    }
  }

  function updateNextButtonCountdown() {
    const nextBtn = document.getElementById('next-check-btn');
    if (!nextBtn || !awaitingNextEnter) return;
    nextBtn.innerHTML = `<span>➔</span> Từ Tiếp Theo (Nhấn Enter hoặc tự chuyển sau <strong style="color: #fef08a;">${answerCountdownSeconds}s</strong>)`;
    nextBtn.className = 'btn btn-primary ready-next';
  }

  function startQuizCountdown(onExpire) {
    stopQuizCountdown();
    quizCountdownSeconds = 60;
    updateQuizNextButtonCountdown();

    quizCountdownTimer = setInterval(() => {
      quizCountdownSeconds--;
      updateQuizNextButtonCountdown();
      if (quizCountdownSeconds <= 0) {
        stopQuizCountdown();
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  function stopQuizCountdown() {
    if (quizCountdownTimer) {
      clearInterval(quizCountdownTimer);
      quizCountdownTimer = null;
    }
  }

  function updateQuizNextButtonCountdown() {
    const quizNextBtn = document.getElementById('quiz-next-btn');
    if (!quizNextBtn || !quizAwaitingNextEnter) return;
    quizNextBtn.innerHTML = `<span>➔</span> Câu Kế Tiếp (Nhấn Enter hoặc tự chuyển sau <strong style="color: #fef08a;">${quizCountdownSeconds}s</strong>)`;
    quizNextBtn.className = 'btn btn-primary ready-next';
  }

  function handleCheckSuccess(item, userText, card, input, stdFeedback, stdTitle, actionsDefault, actionsNext, wasCorrected = false) {
    stopAnswerCountdown();
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    checkAnswerSubmitted = true;
    isAwaitingCorrection = false;
    input.disabled = true;

    SFX.playSuccess();
    stats.totalCorrect += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;

    item.correctCount = (item.correctCount || 0) + 1;
    if (item.correctCount >= 2) item.mastered = true;

    input.classList.remove('wrong', 'needs-correction');
    input.classList.add('correct');
    if (card) {
      card.classList.remove('is-wrong', 'is-partial');
      card.classList.add('is-correct');
    }

    // Cập nhật card diff sang trạng thái hoàn thành
    const diffCard = document.getElementById('char-diff-card');
    if (diffCard && diffCard.style.display !== 'none') {
      const diffResult = computeCharDiff(input.value.trim(), item.word.trim());
      renderCharDiffStream(diffResult, item.word.trim());
    }

    if (stdFeedback) {
      stdFeedback.className = 'ai-eval-box active verdict-perfect';
      if (stdTitle) {
        stdTitle.innerHTML = wasCorrected
          ? `<span>🎉</span> XUẤT SẮC! ĐÃ SỬA ĐÚNG! (+1 streak)`
          : `<span>🎉</span> CHÍNH XÁC! (+1 streak)`;
      }
    }

    // Hiển thị đầy đủ đáp án chuẩn và nghĩa tiếng Việt chi tiết ở dưới
    const revealWord = document.getElementById('reveal-word');
    const revealPhonetic = document.getElementById('reveal-phonetic');
    const revealMeaning = document.getElementById('reveal-meaning');
    const revealExampleBox = document.getElementById('reveal-example-box');
    const revealExample = document.getElementById('reveal-example');
    const revealExMeaning = document.getElementById('reveal-ex-meaning');

    if (revealWord) revealWord.textContent = item.word;
    if (revealPhonetic) revealPhonetic.textContent = item.phonetic || '';
    if (revealMeaning) revealMeaning.textContent = item.meaning;
    if (revealExampleBox) {
      if (item.example) {
        revealExampleBox.style.display = 'block';
        if (revealExample) revealExample.textContent = `"${item.example}"`;
        if (revealExMeaning) revealExMeaning.textContent = item.exampleMeaning ? `(${item.exampleMeaning})` : '';
      } else {
        revealExampleBox.style.display = 'none';
      }
    }

    if (stats.currentStreak % 5 === 0) {
      Confetti.fire(60);
      showToast(`Chuỗi ${stats.currentStreak} từ đúng liên tiếp! 🔥`, 'success');
    } else if (wasCorrected) {
      showToast('Tuyệt vời! Bạn đã sửa đúng từ này 👏', 'success');
    }

    saveVocabulary();
    saveStats();
    updateHeaderStats();

    if (actionsDefault) actionsDefault.style.display = 'none';
    if (actionsNext) actionsNext.style.display = 'flex';

    awaitingNextEnter = true;
    userPressedEnterDuringSpeech = false;

    const nextBtn = document.getElementById('next-check-btn');
    if (nextBtn) {
      nextBtn.innerHTML = '<span class="speak-anim-icon">🔊</span> Đang đọc phát âm... (Đợi đọc xong hoặc nhấn Enter)';
      nextBtn.className = 'btn btn-primary is-speaking';
      nextBtn.focus();
    }

    // Phát âm từ tiếng Anh và sau khi đọc xong bắt đầu đếm ngược 1 phút (60s) hoặc nhấn Enter chuyển ngay
    speakWord(item.word, () => {
      if (!awaitingNextEnter) return;
      startAnswerCountdown(() => {
        if (!awaitingNextEnter) return;
        awaitingNextEnter = false;
        nextCheckWord();
      });

      if (userPressedEnterDuringSpeech) {
        stopAnswerCountdown();
        awaitingNextEnter = false;
        userPressedEnterDuringSpeech = false;
        nextCheckWord();
      }
    });
  }

  function handleCheckInputLive() {
    if (!isAwaitingCorrection) return;
    const item = checkQueue[checkIndex];
    if (!item) return;

    const input = document.getElementById('check-user-input');
    if (!input) return;

    const currentText = input.value.trim();
    const targetWord = item.word.trim();
    const diffResult = computeCharDiff(currentText, targetWord);

    // Cập nhật thời gian thực các ký tự đúng/sai đỏ
    renderCharDiffStream(diffResult, targetWord);

    // Nếu người dùng đã sửa hoàn toàn đúng!
    if (diffResult.isMatch) {
      const card = document.getElementById('test-card');
      const stdFeedback = document.getElementById('standard-feedback-box');
      const stdTitle = document.getElementById('std-feedback-title');
      const actionsDefault = document.getElementById('typing-actions-default');
      const actionsNext = document.getElementById('typing-actions-next');

      handleCheckSuccess(item, currentText, card, input, stdFeedback, stdTitle, actionsDefault, actionsNext, true);
    }
  }

  function handleRevealFix() {
    const item = checkQueue[checkIndex];
    if (!item) return;
    const input = document.getElementById('check-user-input');
    if (!input) return;
    input.value = item.word;
    input.focus();
    handleCheckInputLive();
    showToast(`Đã tự động điền từ chuẩn: "${item.word}"`, 'info');
  }

  async function submitCheckAnswer() {
    if (checkAnswerSubmitted) return;

    const input = document.getElementById('check-user-input');
    if (!input) return;

    const userText = input.value.trim();
    if (!userText) {
      showToast('Vui lòng gõ câu trả lời trước khi kiểm tra!', 'warning');
      input.focus();
      return;
    }

    const item = checkQueue[checkIndex];
    const card = document.getElementById('test-card');
    const actionsDefault = document.getElementById('typing-actions-default');
    const actionsNext = document.getElementById('typing-actions-next');
    const aiLoading = document.getElementById('ai-loading-indicator');

    stats.totalAnswered += 1;

    // === HƯỚNG 1: VI ➔ EN (Gõ từ tiếng Anh) ===
    if (currentStudyDirection === 'vi-en') {
      const targetWord = item.word.trim();
      const diffResult = computeCharDiff(userText, targetWord);

      const stdFeedback = document.getElementById('standard-feedback-box');
      const stdTitle = document.getElementById('std-feedback-title');
      const revealWord = document.getElementById('reveal-word');
      const revealPhonetic = document.getElementById('reveal-phonetic');

      if (revealWord) revealWord.textContent = item.word;
      if (revealPhonetic) revealPhonetic.textContent = item.phonetic || '';

      if (diffResult.isMatch) {
        // ĐÚNG HOÀN TOÀN
        handleCheckSuccess(item, userText, card, input, stdFeedback, stdTitle, actionsDefault, actionsNext, false);
      } else {
        // SAI - XỬ LÝ THEO CHẾ ĐỘ: SAI ĐÂU BÁO ĐỎ Ở ĐẤY & ĐỢI ĐẾN SỬA ĐÚNG
        if (settings.strictCorrection) {
          SFX.playError();
          stats.currentStreak = 0;
          item.incorrectCount = (item.incorrectCount || 0) + 1;
          item.mastered = false;

          input.classList.remove('correct');
          input.classList.add('wrong', 'needs-correction');
          if (card) {
            card.classList.remove('is-correct');
            card.classList.add('is-wrong');
          }

          // Hiển thị khung so sánh ký tự (Báo đỏ ký tự sai)
          isAwaitingCorrection = true;
          renderCharDiffStream(diffResult, targetWord);

          const submitBtn = document.getElementById('submit-check-btn');
          if (submitBtn) {
            submitBtn.innerHTML = '<span>✓</span> Sửa Xong & Kiểm Tra (Enter)';
          }

          // Giữ input mở và nhận focus để người học sửa lại
          input.disabled = false;
          input.focus();

          showToast('Vị trí sai đã được báo đỏ. Hãy sửa lại cho đúng nhé!', 'warning');
          saveVocabulary();
          saveStats();
          updateHeaderStats();
          return; // Dừng tại đây, giữ nguyên câu hỏi đợi người học sửa đúng!
        } else {
          // Chế độ không bắt buộc sửa: Khóa input và chuyển câu
          checkAnswerSubmitted = true;
          input.disabled = true;

          SFX.playError();
          stats.currentStreak = 0;
          item.incorrectCount = (item.incorrectCount || 0) + 1;
          item.mastered = false;

          input.classList.add('wrong');
          if (card) card.classList.add('is-wrong');
          if (stdFeedback) {
            stdFeedback.className = 'ai-eval-box active verdict-wrong';
            if (stdTitle) stdTitle.innerHTML = `<span>❌</span> CHƯA CHÍNH XÁC! Bạn đã gõ: "<strong>${escapeHtml(userText)}</strong>"`;
          }

          // Hiển thị đầy đủ đáp án chuẩn và nghĩa tiếng Việt chi tiết ở dưới
          const revealWord = document.getElementById('reveal-word');
          const revealPhonetic = document.getElementById('reveal-phonetic');
          const revealMeaning = document.getElementById('reveal-meaning');
          const revealExampleBox = document.getElementById('reveal-example-box');
          const revealExample = document.getElementById('reveal-example');
          const revealExMeaning = document.getElementById('reveal-ex-meaning');

          if (revealWord) revealWord.textContent = item.word;
          if (revealPhonetic) revealPhonetic.textContent = item.phonetic || '';
          if (revealMeaning) revealMeaning.textContent = item.meaning;
          if (revealExampleBox) {
            if (item.example) {
              revealExampleBox.style.display = 'block';
              if (revealExample) revealExample.textContent = `"${item.example}"`;
              if (revealExMeaning) revealExMeaning.textContent = item.exampleMeaning ? `(${item.exampleMeaning})` : '';
            } else {
              revealExampleBox.style.display = 'none';
            }
          }

          speakWord(item.word);
          saveVocabulary();
          saveStats();
          updateHeaderStats();

          if (actionsDefault) actionsDefault.style.display = 'none';
          if (actionsNext) actionsNext.style.display = 'flex';

          awaitingNextEnter = true;
          userPressedEnterDuringSpeech = false;

          const nextBtn = document.getElementById('next-check-btn');
          if (nextBtn) {
            nextBtn.innerHTML = '<span class="speak-anim-icon">🔊</span> Đang đọc phát âm... (Đợi đọc xong hoặc nhấn Enter)';
            nextBtn.className = 'btn btn-primary is-speaking';
            nextBtn.focus();
          }

          speakWord(item.word, () => {
            if (!awaitingNextEnter) return;
            startAnswerCountdown(() => {
              if (!awaitingNextEnter) return;
              awaitingNextEnter = false;
              nextCheckWord();
            });
            if (userPressedEnterDuringSpeech) {
              stopAnswerCountdown();
              awaitingNextEnter = false;
              userPressedEnterDuringSpeech = false;
              nextCheckWord();
            }
          });
        }
      }
    }
    // === HƯỚNG 2: EN ➔ VI (AI Semantic Meaning Checker) ===
    else {
      checkAnswerSubmitted = true;
      input.disabled = true;

      if (aiLoading) aiLoading.classList.add('active');

      const evalResult = await AIMeaningChecker.evaluateOnline(userText, item);

      if (aiLoading) aiLoading.classList.remove('active');

      const aiFeedback = document.getElementById('ai-feedback-box');
      const aiScore = document.getElementById('ai-score-text');
      const aiTitle = document.getElementById('ai-verdict-title');
      const aiExplanation = document.getElementById('ai-verdict-explanation');
      const aiSynonyms = document.getElementById('ai-suggested-synonyms');

      if (aiScore) aiScore.textContent = `Độ chính xác: ${evalResult.score}%`;
      if (aiTitle) aiTitle.textContent = evalResult.title;
      if (aiExplanation) aiExplanation.textContent = evalResult.explanation;
      if (aiSynonyms) aiSynonyms.textContent = evalResult.synonyms || item.meaning;

      if (evalResult.verdict === 'perfect') {
        SFX.playSuccess();
        stats.totalCorrect += 1;
        stats.currentStreak += 1;
        if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
        item.correctCount = (item.correctCount || 0) + 1;
        if (item.correctCount >= 2) item.mastered = true;

        input.classList.add('correct');
        if (card) card.classList.add('is-correct');
        if (aiFeedback) aiFeedback.className = 'ai-eval-box active verdict-perfect';
      } else if (evalResult.verdict === 'good') {
        SFX.playPartial();
        stats.totalCorrect += 0.5;
        input.classList.add('correct');
        if (card) card.classList.add('is-partial');
        if (aiFeedback) aiFeedback.className = 'ai-eval-box active verdict-good';
      } else {
        SFX.playError();
        stats.currentStreak = 0;
        item.incorrectCount = (item.incorrectCount || 0) + 1;
        item.mastered = false;

        input.classList.add('wrong');
        if (card) card.classList.add('is-wrong');
        if (aiFeedback) aiFeedback.className = 'ai-eval-box active verdict-wrong';
      }

      saveVocabulary();
      saveStats();
      updateHeaderStats();

      if (actionsDefault) actionsDefault.style.display = 'none';
      if (actionsNext) actionsNext.style.display = 'flex';

      awaitingNextEnter = true;
      userPressedEnterDuringSpeech = false;

      const nextBtn = document.getElementById('next-check-btn');
      if (nextBtn) {
        nextBtn.innerHTML = '<span class="speak-anim-icon">🔊</span> Đang đọc phát âm... (Đợi đọc xong hoặc nhấn Enter)';
        nextBtn.className = 'btn btn-primary is-speaking';
        nextBtn.focus();
      }

      speakWord(item.word, () => {
        if (!awaitingNextEnter) return;
        startAnswerCountdown(() => {
          if (!awaitingNextEnter) return;
          awaitingNextEnter = false;
          nextCheckWord();
        });
        if (userPressedEnterDuringSpeech) {
          stopAnswerCountdown();
          awaitingNextEnter = false;
          userPressedEnterDuringSpeech = false;
          nextCheckWord();
        }
      });
    }
  }

  function giveHint() {
    const item = checkQueue[checkIndex];
    if (!item) return;
    const input = document.getElementById('check-user-input');
    if (!input) return;

    if (currentStudyDirection === 'vi-en') {
      const word = item.word.trim();
      const firstLetter = word[0].toUpperCase();
      const lastLetter = word[word.length - 1].toUpperCase();
      showToast(`Gợi ý: Từ tiếng Anh có ${word.length} chữ cái, bắt đầu bằng "${firstLetter}" và kết thúc bằng "${lastLetter}"`, 'info');
    } else {
      const mainKeywords = item.meaning.split(/[,;\/]/)[0].trim();
      showToast(`Gợi ý từ khóa nghĩa: "${mainKeywords}"`, 'info');
    }
    input.focus();
  }

  function nextCheckWord() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    awaitingNextEnter = false;
    userPressedEnterDuringSpeech = false;
    stopSpeech();
    checkIndex++;
    renderCurrentCheckWord();
  }

  // ==========================================
  // MODE 2: TRẮC NGHIỆM 4 ĐÁP ÁN (QUIZ)
  // ==========================================
  function initQuizMode() {
    const activeVocab = getActiveVocabulary();
    if (activeVocab.length < 4) {
      showToast(`Chương này chỉ có ${activeVocab.length} từ. Cần ít nhất 4 từ để chơi trắc nghiệm!`, 'warning');
      return;
    }
    quizRoundIndex = 0;
    quizScore = 0;
    updateQuizScoreDisplay();
    generateQuizQuestion();
  }

  function updateQuizScoreDisplay() {
    const scoreElem = document.getElementById('quiz-score-text');
    const progressFill = document.getElementById('quiz-progress-fill');
    const progressText = document.getElementById('quiz-progress-text');
    const chapterBadge = document.getElementById('quiz-chapter-badge');

    if (scoreElem) scoreElem.textContent = `Điểm: ${quizScore}`;
    if (progressFill) progressFill.style.width = `${((quizRoundIndex + 1) / QUIZ_ROUND_TOTAL) * 100}%`;
    if (progressText) progressText.textContent = `Câu hỏi ${quizRoundIndex + 1} / ${QUIZ_ROUND_TOTAL}`;
    if (chapterBadge) chapterBadge.textContent = currentChapterId === 'all' ? 'Tất cả chương' : getChapterName(currentChapterId);
  }

  function generateQuizQuestion() {
    const activeVocab = getActiveVocabulary();
    if (quizRoundIndex >= QUIZ_ROUND_TOTAL) {
      showChapterCompleteModal();
      quizRoundIndex = 0;
      quizScore = 0;
      return;
    }

    quizAnswered = false;
    quizAwaitingNextEnter = false;
    quizPressedEnterDuringSpeech = false;
    stopSpeech();
    updateQuizScoreDisplay();

    const randomIndex = Math.floor(Math.random() * activeVocab.length);
    quizCurrentWord = activeVocab[randomIndex];

    // Lấy 3 distractors
    const otherWords = vocabulary.filter(v => v.id !== quizCurrentWord.id);
    const distractors = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);

    quizOptions = [
      { text: quizCurrentWord.meaning, isCorrect: true },
      { text: distractors[0].meaning, isCorrect: false },
      { text: distractors[1].meaning, isCorrect: false },
      { text: distractors[2].meaning, isCorrect: false }
    ].sort(() => Math.random() - 0.5);

    const wordDisplay = document.getElementById('quiz-current-word');
    const phoneticDisplay = document.getElementById('quiz-current-phonetic');
    const nextRow = document.getElementById('quiz-next-row');

    if (wordDisplay) wordDisplay.textContent = quizCurrentWord.word;
    if (phoneticDisplay) phoneticDisplay.textContent = quizCurrentWord.phonetic || '';
    if (nextRow) nextRow.style.display = 'none';

    const optionsContainer = document.getElementById('quiz-options-container');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';

    const optionKeys = ['A', 'B', 'C', 'D'];
    quizOptions.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <span class="option-key">${optionKeys[idx]}</span>
        <span>${opt.text}</span>
      `;
      btn.addEventListener('click', () => handleQuizSelect(btn, opt));
      optionsContainer.appendChild(btn);
    });

    // Chỉ tự động phát âm khi người dùng đã chọn chương học
    if (hasUserSelectedChapter && settings.soundEnabled && quizCurrentWord && quizCurrentWord.word) {
      speakWord(quizCurrentWord.word);
    }
  }

  function handleQuizSelect(clickedBtn, option) {
    if (quizAnswered) return;
    quizAnswered = true;

    initAudioContext();
    const optionsContainer = document.getElementById('quiz-options-container');
    const allButtons = optionsContainer.querySelectorAll('.option-btn');
    const nextRow = document.getElementById('quiz-next-row');

    allButtons.forEach(btn => btn.disabled = true);
    stats.totalAnswered += 1;

    if (option.isCorrect) {
      SFX.playSuccess();
      clickedBtn.classList.add('selected-correct');
      quizScore += 1;
      stats.totalCorrect += 1;
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;
      quizCurrentWord.correctCount = (quizCurrentWord.correctCount || 0) + 1;
      if (quizCurrentWord.correctCount >= 2) quizCurrentWord.mastered = true;
    } else {
      SFX.playError();
      clickedBtn.classList.add('selected-wrong');
      stats.currentStreak = 0;
      quizCurrentWord.incorrectCount = (quizCurrentWord.incorrectCount || 0) + 1;

      allButtons.forEach((btn, idx) => {
        if (quizOptions[idx].isCorrect) btn.classList.add('selected-correct');
      });
    }

    saveVocabulary();
    saveStats();
    updateQuizScoreDisplay();

    if (nextRow) nextRow.style.display = 'block';

    quizAwaitingNextEnter = true;
    quizPressedEnterDuringSpeech = false;

    const quizNextBtn = document.getElementById('quiz-next-btn');
    if (quizNextBtn) {
      quizNextBtn.innerHTML = '<span class="speak-anim-icon">🔊</span> Đang đọc phát âm... (Đợi đọc xong hoặc nhấn Enter)';
      quizNextBtn.className = 'btn btn-primary is-speaking';
      quizNextBtn.focus();
    }

    speakWord(quizCurrentWord.word, () => {
      if (!quizAwaitingNextEnter) return;
      startQuizCountdown(() => {
        if (!quizAwaitingNextEnter) return;
        quizAwaitingNextEnter = false;
        quizRoundIndex++;
        generateQuizQuestion();
      });
      if (quizPressedEnterDuringSpeech) {
        stopQuizCountdown();
        quizAwaitingNextEnter = false;
        quizPressedEnterDuringSpeech = false;
        quizRoundIndex++;
        generateQuizQuestion();
      }
    });
  }

  // ==========================================
  // MODE 3: FLASHCARD 3D
  // ==========================================
  function initFlashcardMode(shuffle = false) {
    const activeVocab = getActiveVocabulary();
    if (activeVocab.length === 0) return;

    if (shuffle || flashcardQueue.length === 0) {
      flashcardQueue = [...activeVocab];
      if (shuffle) flashcardQueue.sort(() => Math.random() - 0.5);
      flashcardIndex = 0;
    }

    renderCurrentFlashcard();
  }

  function renderCurrentFlashcard() {
    if (flashcardQueue.length === 0) return;
    if (flashcardIndex >= flashcardQueue.length) {
      showChapterCompleteModal();
      flashcardIndex = 0;
      return;
    }
    if (flashcardIndex < 0) flashcardIndex = flashcardQueue.length - 1;

    const item = flashcardQueue[flashcardIndex];
    if (!item) return;

    const card = document.getElementById('flashcard-element');
    if (card) {
      card.classList.remove('is-flipped');
      flashcardFlipped = false;
    }

    const progressFill = document.getElementById('card-progress-fill');
    const progressText = document.getElementById('card-progress-text');
    if (progressFill) progressFill.style.width = `${((flashcardIndex + 1) / flashcardQueue.length) * 100}%`;
    if (progressText) progressText.textContent = `Thẻ ${flashcardIndex + 1} / ${flashcardQueue.length}`;

    const chapName = getChapterName(item.chapterId);
    const frontChapter = document.getElementById('card-front-chapter');
    const frontPos = document.getElementById('card-front-pos');
    const frontWord = document.getElementById('card-front-word');
    const frontPhonetic = document.getElementById('card-front-phonetic');

    if (frontChapter) frontChapter.textContent = `📖 ${chapName}`;
    if (frontPos) frontPos.textContent = item.partOfSpeech || 'word';
    if (frontWord) frontWord.textContent = item.word;
    if (frontPhonetic) frontPhonetic.textContent = item.phonetic || '';

    const backChapter = document.getElementById('card-back-chapter');
    const backSubPhonetic = document.getElementById('card-back-sub-phonetic');
    const backMeaning = document.getElementById('card-back-meaning');
    const backExample = document.getElementById('card-back-example');
    const backExMeaning = document.getElementById('card-back-ex-meaning');

    if (backChapter) backChapter.textContent = `📖 ${chapName}`;
    if (backSubPhonetic) backSubPhonetic.textContent = `${item.word} ${item.phonetic ? item.phonetic : ''}`;
    if (backMeaning) backMeaning.textContent = item.meaning;
    if (backExample) backExample.textContent = item.example ? `"${item.example}"` : '';
    if (backExMeaning) backExMeaning.textContent = item.exampleMeaning || '';

    // Chỉ tự động phát âm khi người dùng đã chọn chương học
    if (hasUserSelectedChapter && settings.soundEnabled && item && item.word) {
      speakWord(item.word);
    }
  }

  function toggleFlipCard() {
    const card = document.getElementById('flashcard-element');
    if (!card) return;
    SFX.playFlip();
    card.classList.toggle('is-flipped');
    flashcardFlipped = card.classList.contains('is-flipped');
  }

  function markFlashcard(mastered) {
    const item = flashcardQueue[flashcardIndex];
    if (!item) return;

    item.mastered = mastered;
    if (mastered) {
      item.correctCount = (item.correctCount || 0) + 1;
      SFX.playSuccess();
      showToast(`Đã đánh dấu "${item.word}" là ĐÃ THUỘC! ✨`, 'success');
    } else {
      item.incorrectCount = (item.incorrectCount || 0) + 1;
      SFX.playError();
      showToast(`Đã đánh dấu "${item.word}" cần ôn lại!`, 'info');
    }

    saveVocabulary();
    flashcardIndex++;
    renderCurrentFlashcard();
  }

  // ==========================================
  // MODE 4: DANH SÁCH TỪ VỰNG & QUẢN LÝ
  // ==========================================
  function renderVocabularyList() {
    const container = document.getElementById('words-grid-container');
    const noWordsMsg = document.getElementById('no-words-msg');
    if (!container) return;

    const searchTerm = (document.getElementById('vocab-search')?.value || '').toLowerCase().trim();
    const chapterFilter = document.getElementById('filter-chapter')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    const filtered = vocabulary.filter(item => {
      const matchSearch =
        item.word.toLowerCase().includes(searchTerm) ||
        item.meaning.toLowerCase().includes(searchTerm) ||
        (item.example && item.example.toLowerCase().includes(searchTerm));

      const matchChapter = chapterFilter === 'all' || item.chapterId === chapterFilter;

      let matchStatus = true;
      if (statusFilter === 'mastered') matchStatus = item.mastered === true;
      if (statusFilter === 'learning') matchStatus = !item.mastered;

      return matchSearch && matchChapter && matchStatus;
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
      if (noWordsMsg) noWordsMsg.style.display = 'block';
      return;
    } else {
      if (noWordsMsg) noWordsMsg.style.display = 'none';
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'word-card';

      const chapName = getChapterName(item.chapterId);
      const statusBadge = item.mastered
        ? '<span class="card-badge-status mastered">✓ Đã thuộc</span>'
        : '<span class="card-badge-status learning">Đang học</span>';

      card.innerHTML = `
        <div>
          <div class="word-card-header">
            <div class="word-card-title">
              <span>${item.word}</span>
              <button class="btn btn-icon btn-secondary" style="width: 28px; height: 28px; font-size: 13px;" data-action="speak" data-word="${item.word}" title="Phát âm">
                🔊
              </button>
            </div>
            <span class="pos-tag">${item.partOfSpeech || 'n'}</span>
          </div>

          <div class="word-card-meaning" style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
            <span style="color: #ffffff; font-weight: 600;">${item.meaning}</span>
            ${item.phonetic ? `<span style="font-family: var(--font-mono); color: #38bdf8; font-size: 0.88rem; background: rgba(56, 189, 248, 0.12); padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.25); white-space: nowrap;">🗣️ ${item.phonetic}</span>` : ''}
          </div>

          ${item.synonyms && item.synonyms.length > 0 ? `
            <div style="font-size: 0.8rem; color: #a5b4fc; margin-bottom: 8px;">
              Đồng nghĩa: ${item.synonyms.join(', ')}
            </div>
          ` : ''}

          ${item.example ? `
            <div class="word-card-example">
              <div>"${item.example}"</div>
              ${item.exampleMeaning ? `<div style="color: var(--text-faint); margin-top: 4px; font-size: 0.8rem;">${item.exampleMeaning}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="word-card-footer">
          <div>
            ${statusBadge}
            <span style="font-size: 0.75rem; color: var(--primary-light); margin-left: 6px;">📖 ${chapName}</span>
          </div>
          <div class="card-btn-group">
            <button class="btn btn-icon btn-secondary" style="width: 32px; height: 32px;" data-action="edit" data-id="${item.id}" title="Chỉnh sửa từ này">
              ✏️
            </button>
            <button class="btn btn-icon btn-secondary" style="width: 32px; height: 32px; color: #fb7185;" data-action="delete" data-id="${item.id}" title="Xóa từ này">
              🗑️
            </button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    container.onclick = (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'speak') {
        const word = btn.dataset.word;
        if (word) speakWord(word);
      } else if (action === 'edit') {
        const id = btn.dataset.id;
        openWordModal(id);
      } else if (action === 'delete') {
        const id = btn.dataset.id;
        deleteWord(id);
      }
    };
  }

  function deleteWord(id) {
    const item = vocabulary.find(v => v.id === id);
    if (!item) return;

    if (confirm(`Bạn có chắc chắn muốn xóa từ "${item.word}" khỏi danh sách?`)) {
      vocabulary = vocabulary.filter(v => v.id !== id);
      checkQueue = checkQueue.filter(v => v.id !== id);
      flashcardQueue = flashcardQueue.filter(v => v.id !== id);

      saveVocabulary();
      renderVocabularyList();
      showToast(`Đã xóa từ "${item.word}"`, 'info');
    }
  }

  // ==========================================
  // MODAL 1: THÊM & SỬA TỪ VỰNG
  // ==========================================
  function openWordModal(editId = null) {
    const modal = document.getElementById('word-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('word-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('form-word-id').value = '';

    // Set default chapter in dropdown
    const formChapter = document.getElementById('form-chapter');
    if (formChapter) {
      formChapter.value = (currentChapterId !== 'all') ? currentChapterId : (chapters[0]?.id || 'chap-1');
    }

    if (editId) {
      const item = vocabulary.find(v => v.id === editId);
      if (item) {
        modalTitle.textContent = 'Chỉnh Sửa Từ Vựng';
        document.getElementById('form-word-id').value = item.id;
        document.getElementById('form-word').value = item.word;
        document.getElementById('form-pos').value = item.partOfSpeech || 'noun';
        document.getElementById('form-phonetic').value = item.phonetic || '';
        document.getElementById('form-chapter').value = item.chapterId || chapters[0]?.id;
        document.getElementById('form-topic').value = item.topic || 'daily';
        document.getElementById('form-meaning').value = item.meaning;
        document.getElementById('form-synonyms').value = (item.synonyms || []).join(', ');
        document.getElementById('form-example').value = item.example || '';
        document.getElementById('form-example-meaning').value = item.exampleMeaning || '';
      }
    } else {
      modalTitle.textContent = 'Thêm Từ Vựng Mới';
    }

    modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('form-word')?.focus();
    }, 100);
  }

  function closeWordModal() {
    const modal = document.getElementById('word-modal');
    if (modal) modal.classList.remove('active');
  }

  function handleWordFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('form-word-id').value;
    const chapterId = document.getElementById('form-chapter').value;
    const word = document.getElementById('form-word').value.trim();
    const partOfSpeech = document.getElementById('form-pos').value;
    const phonetic = document.getElementById('form-phonetic').value.trim();
    const topic = document.getElementById('form-topic').value;
    const meaning = document.getElementById('form-meaning').value.trim();
    const synonymsRaw = document.getElementById('form-synonyms').value.trim();
    const example = document.getElementById('form-example').value.trim();
    const exampleMeaning = document.getElementById('form-example-meaning').value.trim();

    const synonyms = synonymsRaw
      ? synonymsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (!word || !meaning) {
      showToast('Vui lòng điền Từ tiếng Anh và Nghĩa tiếng Việt!', 'warning');
      return;
    }

    if (id) {
      const index = vocabulary.findIndex(v => v.id === id);
      if (index !== -1) {
        vocabulary[index] = {
          ...vocabulary[index],
          chapterId,
          word,
          partOfSpeech,
          phonetic,
          topic,
          meaning,
          synonyms,
          example,
          exampleMeaning
        };
        showToast(`Đã cập nhật từ "${word}" thành công!`, 'success');
      }
    } else {
      const newVocab = {
        id: 'vocab-' + Date.now(),
        chapterId,
        word,
        partOfSpeech,
        phonetic,
        topic,
        meaning,
        synonyms,
        example,
        exampleMeaning,
        mastered: false,
        correctCount: 0,
        incorrectCount: 0
      };
      vocabulary.unshift(newVocab);
      showToast(`Đã thêm từ "${word}" vào chương! 🎉`, 'success');
      Confetti.fire(50);
    }

    saveVocabulary();
    closeWordModal();
    renderVocabularyList();
    renderChapterDropdowns();

    // Re-sync active queue
    checkQueue = [...getActiveVocabulary()];
    flashcardQueue = [...getActiveVocabulary()];
  }

  // ==========================================
  // MODAL 2: QUẢN LÝ CHƯƠNG (CHAPTERS)
  // ==========================================
  function openChapterModal() {
    const modal = document.getElementById('chapter-modal');
    if (!modal) return;
    renderChapterManageList();
    modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('new-chap-name')?.focus();
    }, 100);
  }

  function closeChapterModal() {
    const modal = document.getElementById('chapter-modal');
    if (modal) modal.classList.remove('active');
  }

  function renderChapterManageList() {
    const container = document.getElementById('chapters-manage-list');
    if (!container) return;
    container.innerHTML = '';

    chapters.forEach(ch => {
      const count = vocabulary.filter(v => v.chapterId === ch.id).length;
      const row = document.createElement('div');
      row.className = 'chapter-manage-item';
      row.innerHTML = `
        <div>
          <strong style="color: #ffffff; font-size: 0.95rem;">${ch.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${ch.description || 'Chưa có mô tả'}</div>
          <span style="font-size: 0.75rem; color: #38bdf8;">(${count} từ vựng)</span>
        </div>
        <div>
          ${chapters.length > 1 ? `
            <button class="btn btn-icon btn-secondary" style="color: #fb7185; width: 30px; height: 30px;" data-chap-del="${ch.id}" title="Xóa chương này">
              🗑️
            </button>
          ` : ''}
        </div>
      `;
      container.appendChild(row);
    });

    container.onclick = (e) => {
      const btn = e.target.closest('button[data-chap-del]');
      if (!btn) return;
      const chapId = btn.dataset.chapDel;
      deleteChapter(chapId);
    };
  }

  function handleNewChapterSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-chap-name').value.trim();
    const desc = document.getElementById('new-chap-desc').value.trim();

    if (!name) return;

    const newChapter = {
      id: 'chap-' + Date.now(),
      name,
      description: desc,
      color: '#6366f1'
    };

    chapters.push(newChapter);
    saveChapters();
    document.getElementById('new-chapter-form').reset();
    renderChapterManageList();
    showToast(`Đã tạo chương mới: "${name}"!`, 'success');

    // Chuyển sang chương mới tạo luôn
    currentChapterId = newChapter.id;
    const globalSelect = document.getElementById('global-chapter-select');
    if (globalSelect) globalSelect.value = currentChapterId;

    initCheckMode(true);
    initFlashcardMode(true);
  }

  function deleteChapter(chapId) {
    const chap = chapters.find(c => c.id === chapId);
    if (!chap) return;

    if (chapters.length <= 1) {
      showToast('Không thể xóa vì đây là chương duy nhất còn lại!', 'warning');
      return;
    }

    const wordsInChap = vocabulary.filter(v => v.chapterId === chapId).length;
    const confirmMsg = wordsInChap > 0
      ? `⚠️ CẢNH BÁO XÓA TOÀN BỘ:\n\nChương "${chap.name}" hiện có ${wordsInChap} từ vựng.\nNếu bạn xóa chương này, TOÀN BỘ ${wordsInChap} TỪ VỰNG sẽ bị XÓA HẾT LUÔN (không chuyển sang chương khác)!\n\nBạn có chắc chắn muốn xóa vĩnh viễn không?`
      : `Bạn có chắc chắn muốn xóa chương "${chap.name}"?`;

    if (confirm(confirmMsg)) {
      // 1. Xóa chương khỏi danh sách
      chapters = chapters.filter(c => c.id !== chapId);

      // 2. XÓA HẾT LUÔN toàn bộ từ vựng thuộc chương này
      vocabulary = vocabulary.filter(v => v.chapterId !== chapId);
      checkQueue = checkQueue.filter(v => v.chapterId !== chapId);
      flashcardQueue = flashcardQueue.filter(v => v.chapterId !== chapId);

      if (currentChapterId === chapId) {
        currentChapterId = chapters[0]?.id || 'all';
      }

      saveChapters();
      saveVocabulary();
      renderChapterManageList();
      renderChapterDropdowns();
      initCheckMode(true);
      initFlashcardMode(true);
      renderVocabularyList();
      showToast(`Đã xóa hoàn toàn chương "${chap.name}" cùng ${wordsInChap} từ vựng!`, 'info');
    }
  }

  // ==========================================
  // MODAL 3: CẤU HÌNH AI
  // ==========================================
  function openAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (!modal) return;
    const keyInput = document.getElementById('gemini-api-key');
    if (keyInput) keyInput.value = settings.geminiApiKey || '';
    modal.classList.add('active');
  }

  function closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) modal.classList.remove('active');
  }

  function handleSaveAISettings() {
    const keyInput = document.getElementById('gemini-api-key');
    if (keyInput) {
      settings.geminiApiKey = keyInput.value.trim();
      saveSettings();
      if (settings.geminiApiKey) {
        showToast('Đã lưu Google Gemini API Key thành công! AI sẽ chấm điểm nâng cao.', 'success');
      } else {
        showToast('Đang sử dụng Bộ phân tích ngữ nghĩa tích hợp sẵn (Offline).', 'info');
      }
      closeAISettingsModal();
    }
  }

  function handleClearApiKey() {
    settings.geminiApiKey = '';
    saveSettings();
    const keyInput = document.getElementById('gemini-api-key');
    if (keyInput) keyInput.value = '';
    showToast('Đã xóa API Key. Trở về bộ phân tích mặc định.', 'info');
  }

  // ==========================================
  // WIZARD: SMART SANITIZER & INTERACTIVE WORD PICKER
  // ==========================================
  const SAMPLE_BTVN_09 = `Công khai
Tiêu đề
Nhập
[Thêm sơ đồ](https://quizlet.com/upgrade?source=diagram_max_shapes)
Gợi ý
1
error code
/ˈerər koʊd/ : mã lỗi
2
road closure
/roʊd ˈkloʊʒər/ : việc đóng đường
3
commercial
/kəˈmɜːrʃl/ : thuộc thương mại; quảng cáo
4
notify
/ˈnoʊtɪfaɪ/ : thông báo
5
meet a deadline
/miːt ə ˈdedlaɪn/ : hoàn thành đúng hạn
6
business trip
/ˈbɪznəs trɪp/ : chuyến công tác
7
corporate
/ˈkɔːrpərət/ : thuộc công ty, tập đoàn
8
policy
/ˈpɑːləsi/ : chính sách; quy định
9
contract
/ˈkɑːntrækt/ : hợp đồng
10
renew
/rɪˈnuː/ : gia hạn; làm mới
11
colleague
/ˈkɑːliːɡ/ : đồng nghiệp
12
conduct
/kənˈdʌkt/ : tiến hành, thực hiện
13
calculate
/ˈkælkjuleɪt/ : tính toán
14
travel itinerary
/ˈtrævl aɪˈtɪnəreri/ : lịch trình chuyến đi
15
invitation
/ˌɪnvɪˈteɪʃən/ : lời mời
16
receive
/rɪˈsiːv/ : nhận
17
detail
/ˈdiːteɪl/ : chi tiết
18
assignment
/əˈsaɪnmənt/ : nhiệm vụ; bài tập được giao
19
reimbursement
/ˌriːɪmˈbɜːrsmənt/ : khoản hoàn trả chi phí
20
process
/ˈprɑːses/ : quy trình; xử lý
21
consult
/kənˈsʌlt/ : tham khảo; tư vấn
22
malfunction
/ˌmælˈfʌŋkʃən/ : sự trục trặc; hoạt động không đúng
23
revise
/rɪˈvaɪz/ : sửa đổi; chỉnh sửa
24
deadline extension
/ˈdedlaɪn ɪkˈstenʃən/ : gia hạn thời hạn
25
inconsistent
/ˌɪnkənˈsɪstənt/ : không nhất quán
26
increase
/ɪnˈkriːs/ : tăng; sự tăng lên
27
profit
/ˈprɑːfɪt/ : lợi nhuận
28
council
/ˈkaʊnsl/ : hội đồng
29
safety inspection
/ˈseɪfti ɪnˈspekʃən/ : kiểm tra an toàn
30
store clerk
/stɔːr klɜːrk/ : nhân viên cửa hàng
31
meeting minutes
/ˈmiːtɪŋ ˈmɪnɪts/ : biên bản cuộc họp
32
travel expense
/ˈtrævl ɪkˈspens/ : chi phí đi lại/công tác
33
procedure
/prəˈsiːdʒər/ : quy trình; thủ tục
34
activity
/ækˈtɪvəti/ : hoạt động
35
sum up
/sʌm ʌp/ : tóm tắt
36
valuable member
/ˈvæljuəbl ˈmembər/ : thành viên có giá trị/quan trọng
37
outstanding
/aʊtˈstændɪŋ/ : xuất sắc; nổi bật; chưa thanh toán
38
decision
/dɪˈsɪʒn/ : quyết định
39
badge
/bædʒ/ : thẻ; huy hiệu
40
new hire
/nuː haɪər/ : nhân viên mới tuyển
41
position
/pəˈzɪʃn/ : vị trí; chức vụ
42
take inventory
/teɪk ˈɪnvəntɔːri/ : kiểm kê hàng tồn kho
43
cardboard box
/ˈkɑːrdbɔːrd bɑːks/ : thùng carton
44
digital camera
/ˈdɪdʒɪtl ˈkæmərə/ : máy ảnh kỹ thuật số
45
battery
/ˈbætəri/ : pin; ắc quy
46
personal belonging
/ˈpɜːrsənl bɪˈlɔːŋɪŋ/ : đồ dùng, tài sản cá nhân`;

  let wizardParsedItems = [];

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isNoiseLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return true;
    // Số thứ tự đứng riêng 1 dòng (1, 2, 3...)
    if (/^\d+$/.test(trimmed)) return true;
    // Link Markdown hoặc URL [Thêm sơ đồ](...)
    if (/^\[.*?\]\(.*?\)$/i.test(trimmed)) return true;
    if (/^https?:\/\//i.test(trimmed)) return true;

    const lower = trimmed.toLowerCase();
    // Tiêu đề giao diện Quizlet hoặc nhãn rác
    const noiseWords = [
      'công khai', 'tiêu đề', 'nhập', 'gợi ý', 'thêm sơ đồ', 'thuật ngữ', 'định nghĩa',
      'chọn ngôn ngữ', 'sắp xếp', 'tùy chọn', 'lưu', 'tạo', 'thẻ ghi nhớ', 'ghi nhớ',
      'học', 'kiểm tra', 'ghép thẻ', 'flashcard', 'flashcards', 'share', 'terms',
      'thêm phần tối ưu và chọn từ vựng từ trên để thêm vào'
    ];
    if (noiseWords.includes(lower)) return true;
    if (lower.startsWith('thêm phần tối ưu') || lower.startsWith('[thêm sơ đồ]')) return true;
    return false;
  }

  function parseAndSanitizeText(rawText) {
    if (!rawText) return [];
    const rawLines = rawText.split(/\r?\n/);
    const cleanLines = rawLines.map(l => l.trim()).filter(l => !isNoiseLine(l));
    const results = [];

    let i = 0;
    while (i < cleanLines.length) {
      const line = cleanLines[i];

      // TH 1: Định dạng 2 dòng liên tiếp chuẩn Quizlet:
      // Dòng 1: error code
      // Dòng 2: /ˈerər koʊd/ : mã lỗi   hoặc   : mã lỗi
      if (i + 1 < cleanLines.length) {
        const nextLine = cleanLines[i + 1];
        const nextPhoneticMatch = nextLine.match(/^(\/.*?\/)\s*[:=\-–—]?\s*(.*)$/);
        if (nextPhoneticMatch) {
          results.push({
            word: line,
            phonetic: nextPhoneticMatch[1].trim(),
            meaning: nextPhoneticMatch[2].trim()
          });
          i += 2;
          continue;
        }
      }

      // TH 2: Dòng đơn chứa phiên âm: error code /ˈerər koʊd/ : mã lỗi
      const inlinePhoneticMatch = line.match(/^(.*?)\s+(\/.*?\/)\s*[:=\-–—]?\s*(.*)$/);
      if (inlinePhoneticMatch && inlinePhoneticMatch[1].trim()) {
        results.push({
          word: inlinePhoneticMatch[1].trim(),
          phonetic: inlinePhoneticMatch[2].trim(),
          meaning: inlinePhoneticMatch[3].trim()
        });
        i++;
        continue;
      }

      // TH 3: Phân cách bằng Tab (Định dạng Quizlet Export chuẩn)
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 3 && parts[1].startsWith('/') && parts[1].endsWith('/')) {
          results.push({ word: parts[0], phonetic: parts[1], meaning: parts.slice(2).join(' - ') });
        } else if (parts.length >= 2) {
          results.push({ word: parts[0], phonetic: '', meaning: parts.slice(1).join(' - ') });
        }
        i++;
        continue;
      }

      // TH 4: Phân cách bằng dấu gạch ngang, hai chấm, dấu bằng
      const delimMatch = line.match(/^(.*?)\s*[-–—:=]\s+(.*)$/);
      if (delimMatch && delimMatch[1].trim() && delimMatch[2].trim()) {
        results.push({ word: delimMatch[1].trim(), phonetic: '', meaning: delimMatch[2].trim() });
        i++;
        continue;
      }

      // TH 5: Định dạng 2 dòng liên tiếp (Dòng i là tiếng Anh, dòng i+1 là tiếng Việt)
      if (i + 1 < cleanLines.length) {
        results.push({ word: line, phonetic: '', meaning: cleanLines[i + 1] });
        i += 2;
        continue;
      }

      // TH 6: Dòng đơn lẻ (chỉ có từ tiếng Anh)
      if (line) {
        results.push({ word: line, phonetic: '', meaning: '' });
      }
      i++;
    }

    return results;
  }

  function updateWizardPreview() {
    const textarea = document.getElementById('wizard-raw-text');
    const pickerBox = document.getElementById('word-picker-box');
    if (!textarea || !pickerBox) return;

    const raw = textarea.value;
    const parsed = parseAndSanitizeText(raw);

    if (parsed.length > 0) {
      wizardParsedItems = parsed.map((item, idx) => ({
        id: 'wp-' + idx + '-' + Date.now(),
        selected: true,
        word: item.word,
        phonetic: item.phonetic,
        meaning: item.meaning
      }));
      pickerBox.style.display = 'block';
      renderWordPickerList();
    } else {
      wizardParsedItems = [];
      pickerBox.style.display = 'none';
      updatePickerCounters();
    }
  }

  function updatePickerCounters() {
    const selectedCount = wizardParsedItems.filter(item => item.selected).length;
    const totalCount = wizardParsedItems.length;

    const selElem = document.getElementById('picker-selected-count');
    const totalElem = document.getElementById('picker-total-count');
    const btnCount = document.getElementById('btn-count-display');
    const selectAllCheckbox = document.getElementById('picker-select-all');

    if (selElem) selElem.textContent = selectedCount;
    if (totalElem) totalElem.textContent = totalCount;
    if (btnCount) btnCount.textContent = selectedCount;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = totalCount > 0 && selectedCount === totalCount;
      selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }
  }

  // ==========================================
  // QUIZLET LINK IMPORTER & SMART PARSER
  // ==========================================
  async function fetchQuizletFromUrl(inputUrl) {
    if (!inputUrl) {
      showToast('Vui lòng nhập hoặc dán link Quizlet!', 'warning');
      document.getElementById('wizard-quizlet-url')?.focus();
      return;
    }

    const cleanUrl = inputUrl.trim();
    if (!cleanUrl.includes('quizlet.com')) {
      showToast('Link không đúng định dạng Quizlet! (Cần chứa quizlet.com)', 'warning');
      return;
    }

    const fetchBtn = document.getElementById('wizard-fetch-quizlet-btn');
    const origBtnText = fetchBtn ? fetchBtn.innerHTML : '⚡ Nạp Từ Link';
    if (fetchBtn) {
      fetchBtn.disabled = true;
      fetchBtn.innerHTML = '<span>⏳</span> Đang nạp...';
    }

    // 1. Nhận diện nếu link là bộ BTVN 09 hoặc chứa 1204911360
    if (cleanUrl.includes('1204911360') || cleanUrl.toLowerCase().includes('btvn-09')) {
      try {
        const res = await fetch('data/btvn_09_quizlet_set.json');
        if (res.ok) {
          const data = await res.json();
          if (data && data.vocabulary && data.vocabulary.length > 0) {
            applyLoadedQuizletItems(data.vocabulary, data.chapters?.[0]?.name || 'Chương: BTVN 09');
            showToast(`Đã nhận diện thành công ${data.vocabulary.length} từ vựng từ Quizlet! 🎉`, 'success');
            if (fetchBtn) {
              fetchBtn.disabled = false;
              fetchBtn.innerHTML = origBtnText;
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Cannot load local btvn_09 set', err);
      }
    }

    // 2. Thử fetch qua các proxy
    let fetchedHtml = '';
    const proxies = [
      `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          if (text && (text.includes('SetPageTerm') || text.includes('__NEXT_DATA__') || text.includes('termId'))) {
            fetchedHtml = text;
            break;
          }
        }
      } catch (e) {}
    }

    if (fetchedHtml) {
      const extracted = parseQuizletHtml(fetchedHtml);
      if (extracted.length > 0) {
        applyLoadedQuizletItems(extracted, 'Chương Quizlet Mới');
        showToast(`Đã nạp thành công ${extracted.length} từ vựng từ link Quizlet! 🎉`, 'success');
        if (fetchBtn) {
          fetchBtn.disabled = false;
          fetchBtn.innerHTML = origBtnText;
        }
        return;
      }
    }

    // 3. Nếu bị Cloudflare/PerimeterX chặn: mở modal hướng dẫn 1-click
    if (fetchBtn) {
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = origBtnText;
    }
    showQuizletHelperModal(cleanUrl);
  }

  function parseQuizletHtml(html) {
    const results = [];
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const state = nextData?.props?.pageProps?.dehydratedReduxStateKey;
        if (state) {
          const parsedState = typeof state === 'string' ? JSON.parse(state) : state;
          const terms = parsedState?.studiableItemDocuments || parsedState?.term || [];
          if (Array.isArray(terms)) {
            terms.forEach(t => {
              const word = t.word || t.term || t.cardSides?.[0]?.media?.[0]?.plainText;
              const def = t.definition || t.cardSides?.[1]?.media?.[0]?.plainText;
              if (word) {
                const phoneticMatch = (def || '').match(/^(\/.*?\/)\s*[:=\-–—]?\s*(.*)$/);
                results.push({
                  word: word.trim(),
                  phonetic: phoneticMatch ? phoneticMatch[1].trim() : '',
                  meaning: phoneticMatch ? phoneticMatch[2].trim() : (def || '').trim()
                });
              }
            });
          }
        }
      } catch (e) {}
    }

    if (results.length > 0) return results;

    const termRegex = /class="[^"]*SetPageTerm-wordText[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?class="[^"]*SetPageTerm-definitionText[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = termRegex.exec(html)) !== null) {
      const rawWord = m[1].replace(/<[^>]+>/g, '').trim();
      const rawDef = m[2].replace(/<[^>]+>/g, '').trim();
      if (rawWord) {
        const phoneticMatch = rawDef.match(/^(\/.*?\/)\s*[:=\-–—]?\s*(.*)$/);
        results.push({
          word: rawWord,
          phonetic: phoneticMatch ? phoneticMatch[1].trim() : '',
          meaning: phoneticMatch ? phoneticMatch[2].trim() : rawDef
        });
      }
    }
    return results;
  }

  function applyLoadedQuizletItems(items, chapterName) {
    if (!items || items.length === 0) return;

    const chapNameInput = document.getElementById('wizard-chapter-name');
    if (chapNameInput && (!chapNameInput.value || chapNameInput.value === 'Chương Mới')) {
      chapNameInput.value = chapterName || 'Chương Quizlet Mới';
    }

    wizardParsedItems = items.map((item, idx) => ({
      id: 'wp-' + idx + '-' + Date.now(),
      selected: true,
      word: item.word || '',
      phonetic: item.phonetic || '',
      meaning: item.meaning || ''
    }));

    const textarea = document.getElementById('wizard-raw-text');
    if (textarea) {
      textarea.value = items.map((it, idx) => {
        const phon = it.phonetic ? `${it.phonetic} : ` : '';
        return `${idx + 1}\n${it.word}\n${phon}${it.meaning}`;
      }).join('\n\n');
    }

    const pickerBox = document.getElementById('word-picker-box');
    if (pickerBox) pickerBox.style.display = 'block';
    renderWordPickerList();
    pickerBox?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showQuizletHelperModal(url) {
    const modal = document.getElementById('quizlet-guide-modal');
    const linkElem = document.getElementById('quizlet-guide-open-link');
    if (linkElem && url) {
      linkElem.href = url;
    }
    if (modal) modal.classList.add('active');
  }

  function closeQuizletHelperModal() {
    const modal = document.getElementById('quizlet-guide-modal');
    if (modal) modal.classList.remove('active');
  }

  async function pasteFromClipboardToWizard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast('Clipboard của bạn đang trống! Hãy sao chép văn bản từ Quizlet trước.', 'warning');
        return;
      }
      const textarea = document.getElementById('wizard-raw-text');
      if (textarea) {
        textarea.value = text;
        updateWizardPreview();
        closeQuizletHelperModal();
        showToast(`Đã nhận diện thành công ${wizardParsedItems.length} từ vựng từ Quizlet! 🎉`, 'success');
      }
    } catch (err) {
      showToast('Vui lòng bấm vào ô văn bản và nhấn Ctrl+V để dán!', 'warning');
      document.getElementById('wizard-raw-text')?.focus();
    }
  }

  function handleWizardFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (!content) return;

      if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          if (json.vocabulary && Array.isArray(json.vocabulary)) {
            applyLoadedQuizletItems(json.vocabulary, json.chapters?.[0]?.name || file.name.replace('.json', ''));
            showToast(`Đã nhận diện thành công ${json.vocabulary.length} từ từ file JSON! 🎉`, 'success');
            return;
          }
        } catch (err) {
          console.warn('Invalid json file', err);
        }
      }

      // File txt
      const textarea = document.getElementById('wizard-raw-text');
      if (textarea) {
        textarea.value = content;
        updateWizardPreview();
        showToast(`Đã tải và nhận diện từ file: ${file.name}! 🎉`, 'success');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function renderWordPickerList() {
    const container = document.getElementById('word-picker-list');
    if (!container) return;
    container.innerHTML = '';

    wizardParsedItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `word-picker-row ${item.selected ? 'is-selected' : ''}`;
      row.dataset.itemId = item.id;

      row.innerHTML = `
        <input type="checkbox" ${item.selected ? 'checked' : ''} data-action="toggle-select" title="Chọn từ này">
        <input type="text" class="picker-input" value="${escapeHtml(item.word)}" placeholder="Từ tiếng Anh" data-field="word" title="Sửa từ tiếng Anh">
        <input type="text" class="picker-input" value="${escapeHtml(item.phonetic)}" placeholder="/phiên âm/" data-field="phonetic" title="Sửa phiên âm IPA">
        <input type="text" class="picker-input" value="${escapeHtml(item.meaning)}" placeholder="Nghĩa tiếng Việt" data-field="meaning" title="Sửa nghĩa tiếng Việt">
        <button type="button" class="btn btn-icon btn-secondary" data-action="speak" title="Nghe phát âm" style="width: 28px; height: 28px; font-size: 0.8rem; padding: 0;">
          🔊
        </button>
      `;

      // Checkbox toggle
      const chk = row.querySelector('input[type="checkbox"]');
      chk.addEventListener('change', (e) => {
        item.selected = e.target.checked;
        row.classList.toggle('is-selected', item.selected);
        updatePickerCounters();
      });

      // Inline edits update in-memory state
      row.querySelector('input[data-field="word"]').addEventListener('input', (e) => {
        item.word = e.target.value.trim();
      });
      row.querySelector('input[data-field="phonetic"]').addEventListener('input', (e) => {
        item.phonetic = e.target.value.trim();
      });
      row.querySelector('input[data-field="meaning"]').addEventListener('input', (e) => {
        item.meaning = e.target.value.trim();
      });

      // Pronunciation audio preview
      row.querySelector('button[data-action="speak"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.word) SFX.speak(item.word);
      });

      container.appendChild(row);
    });

    updatePickerCounters();
  }

  function openWizardModal(targetType = 'new') {
    const modal = document.getElementById('wizard-modal');
    if (!modal) return;

    const radioNew = document.getElementById('target-new-chap');
    const radioCurr = document.getElementById('target-curr-chap');
    const newChapWrap = document.getElementById('wizard-new-chap-input-wrap');
    const targetCurrName = document.getElementById('wizard-target-curr-name');

    // Cập nhật tên chương hiện hành
    const currChap = chapters.find(c => c.id === currentChapterId) || chapters[0];
    if (targetCurrName && currChap) {
      targetCurrName.textContent = currChap.name;
    }

    if (targetType === 'current' && currChap) {
      if (radioCurr) radioCurr.checked = true;
      if (newChapWrap) newChapWrap.style.display = 'none';
    } else {
      if (radioNew) radioNew.checked = true;
      if (newChapWrap) newChapWrap.style.display = 'block';
    }

    modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('wizard-raw-text')?.focus();
    }, 100);
  }

  function closeWizardModal() {
    const modal = document.getElementById('wizard-modal');
    if (modal) modal.classList.remove('active');
  }

  function handleWizardSubmit(e) {
    e.preventDefault();

    const selectedItems = wizardParsedItems.filter(item => item.selected && item.word);
    if (selectedItems.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 từ vựng trong bảng trước khi nạp!', 'warning');
      return;
    }

    const targetType = document.querySelector('input[name="wizard-target-type"]:checked')?.value || 'new';
    let targetChapterId = null;
    let targetChapterName = '';

    if (targetType === 'new') {
      const chapNameInput = document.getElementById('wizard-chapter-name');
      targetChapterName = chapNameInput?.value.trim() || 'Chương Mới';
      const newChapter = {
        id: 'chap-' + Date.now(),
        name: targetChapterName,
        description: `Đã nạp ${selectedItems.length} từ vựng chọn lọc`,
        color: '#6366f1'
      };
      chapters.push(newChapter);
      saveChapters();
      targetChapterId = newChapter.id;
    } else {
      const curr = chapters.find(c => c.id === currentChapterId) || chapters[0];
      if (!curr) {
        showToast('Chưa có chương nào để thêm vào!', 'error');
        return;
      }
      targetChapterId = curr.id;
      targetChapterName = curr.name;
    }

    // Thêm các từ vựng đã chọn vào chương
    selectedItems.forEach((item, idx) => {
      const synonyms = item.meaning
        ? item.meaning.split(/[,;\/]/).map(s => s.trim()).filter(Boolean)
        : [];

      const newVocab = {
        id: 'vocab-' + Date.now() + '-' + idx,
        chapterId: targetChapterId,
        word: item.word,
        partOfSpeech: 'word',
        phonetic: item.phonetic || '',
        topic: 'academic',
        meaning: item.meaning,
        synonyms: synonyms,
        example: '',
        exampleMeaning: '',
        mastered: false,
        correctCount: 0,
        incorrectCount: 0
      };
      vocabulary.unshift(newVocab);
    });

    saveVocabulary();
    currentChapterId = targetChapterId;

    renderChapterDropdowns();
    renderVocabularyList();

    const globalSelect = document.getElementById('global-chapter-select');
    if (globalSelect) globalSelect.value = currentChapterId;

    closeWizardModal();
    initCheckMode(true);
    initFlashcardMode(true);
    switchTab('check-view');

    Confetti.fire(120);
    SFX.playSuccess();
    showToast(`Đã nạp thành công ${selectedItems.length} từ vựng vào "${targetChapterName}"! Bắt đầu học ngay 🚀`, 'success');
  }

  // ==========================================
  // IMPORT & EXPORT DỮ LIỆU
  // ==========================================
  function exportVocabularyJSON() {
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      chapters,
      vocabulary
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lexicraft-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã xuất file JSON toàn bộ chương & từ vựng!', 'success');
  }

  function importVocabularyJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.chapters && imported.vocabulary) {
          chapters = imported.chapters;
          vocabulary = imported.vocabulary;
        } else if (Array.isArray(imported)) {
          vocabulary = imported;
        } else {
          showToast('File JSON không hợp lệ.', 'error');
          return;
        }

        saveChapters();
        saveVocabulary();
        renderChapterDropdowns();
        renderVocabularyList();
        initCheckMode(true);
        initFlashcardMode(true);
        showToast(`Nhập dữ liệu thành công!`, 'success');
        Confetti.fire(70);
      } catch (err) {
        showToast('Lỗi đọc file JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function resetToDefault() {
    if (confirm('Khôi phục lại toàn bộ dữ liệu mẫu ban đầu (5 chương và 24 từ mẫu)?')) {
      chapters = JSON.parse(JSON.stringify(DEFAULT_CHAPTERS));
      vocabulary = JSON.parse(JSON.stringify(DEFAULT_VOCABULARY));
      currentChapterId = 'all';
      stats.currentStreak = 0;
      stats.totalAnswered = 0;
      stats.totalCorrect = 0;

      saveChapters();
      saveVocabulary();
      saveStats();
      renderChapterDropdowns();
      renderVocabularyList();
      initCheckMode(true);
      initFlashcardMode(true);
      showToast('Đã khôi phục dữ liệu mẫu thành công!', 'info');
    }
  }

  // ==========================================
  // MODE 5: STATS & ANALYTICS
  // ==========================================
  function renderStatsView() {
    const totalWords = vocabulary.length;
    const masteredWords = vocabulary.filter(v => v.mastered).length;
    const masteredPct = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;
    const accuracyPct = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 100;

    const totalElem = document.getElementById('stats-total-words');
    const masteredElem = document.getElementById('stats-mastered-words');
    const masteredPctElem = document.getElementById('stats-mastered-pct');
    const accuracyElem = document.getElementById('stats-accuracy-pct');
    const maxStreakElem = document.getElementById('stats-max-streak');

    if (totalElem) totalElem.textContent = totalWords;
    if (masteredElem) masteredElem.textContent = masteredWords;
    if (masteredPctElem) masteredPctElem.textContent = `${masteredPct}% hoàn thành`;
    if (accuracyElem) accuracyElem.textContent = `${accuracyPct}%`;
    if (maxStreakElem) maxStreakElem.textContent = stats.maxStreak;

    // Tiến độ chi tiết theo từng chương
    const breakdownContainer = document.getElementById('chapter-breakdown-list');
    if (!breakdownContainer) return;
    breakdownContainer.innerHTML = '';

    chapters.forEach(ch => {
      const chapWords = vocabulary.filter(v => v.chapterId === ch.id);
      const count = chapWords.length;
      const mastered = chapWords.filter(v => v.mastered).length;
      const pct = count > 0 ? Math.round((mastered / count) * 100) : 0;

      const row = document.createElement('div');
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 5px;">
          <span><strong style="color: #ffffff;">${ch.name}</strong> (${count} từ)</span>
          <span style="color: ${pct >= 70 ? '#34d399' : 'var(--text-muted)'}; font-weight: 600;">${mastered}/${count} đã thuộc (${pct}%)</span>
        </div>
        <div style="height: 9px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); border-radius: 99px; transition: width 0.4s ease;"></div>
        </div>
      `;
      breakdownContainer.appendChild(row);
    });
  }

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === tabId);
    });

    if (tabId === 'check-view') {
      const input = document.getElementById('check-user-input');
      if (input && !input.disabled) input.focus();
    } else if (tabId === 'quiz-view') {
      initQuizMode();
    } else if (tabId === 'flashcard-view') {
      initFlashcardMode();
    } else if (tabId === 'list-view') {
      renderVocabularyList();
    } else if (tabId === 'stats-view') {
      renderStatsView();
    }
  }

  // ==========================================
  // EVENT LISTENERS BINDING
  // ==========================================
  function setupEventListeners() {
    // 1. Tab switches
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 2. Global Chapter Selector
    document.getElementById('global-chapter-select')?.addEventListener('change', (e) => {
      selectChapterAndSpeak(e.target.value);
    });
    document.getElementById('global-chapter-select')?.addEventListener('input', (e) => {
      selectChapterAndSpeak(e.target.value);
    });

    // 3. Direction Toggle (Vi -> En vs En -> Vi AI)
    const btnViEn = document.getElementById('btn-mode-vi-en');
    const btnEnVi = document.getElementById('btn-mode-en-vi');

    btnViEn?.addEventListener('click', () => {
      currentStudyDirection = 'vi-en';
      btnViEn.classList.add('active');
      btnEnVi.classList.remove('active');
      renderCurrentCheckWord();
    });

    btnEnVi?.addEventListener('click', () => {
      currentStudyDirection = 'en-vi';
      btnEnVi.classList.add('active');
      btnViEn.classList.remove('active');
      renderCurrentCheckWord();
      showToast('Đã bật chế độ AI Semantic Grader kiểm tra nghĩa tiếng Việt! 🤖', 'info');
    });

    // 4. Sound Toggle & Chill BGM Toggle
    document.getElementById('toggle-sound-btn')?.addEventListener('click', () => {
      settings.soundEnabled = !settings.soundEnabled;
      saveSettings();
      updateHeaderStats();
      showToast(settings.soundEnabled ? 'Đã bật hiệu ứng âm thanh 🔊' : 'Đã tắt hiệu ứng âm thanh 🔇', 'info');
    });

    document.getElementById('header-chill-bgm-btn')?.addEventListener('click', (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      ChillBGM.toggle();
    });

    // Enter & Next handlers for Type-to-Check Mode
    function handleCheckEnter(e) {
      if (e) e.preventDefault();
      if (awaitingNextEnter) {
        stopAnswerCountdown();
        if (isSpeechSpeaking) {
          if (!userPressedEnterDuringSpeech) {
            userPressedEnterDuringSpeech = true;
            const nextBtn = document.getElementById('next-check-btn');
            if (nextBtn) {
              nextBtn.innerHTML = '<span>⏳</span> Đang đọc xong sẽ chuyển ngay... (Bấm Enter lần nữa để bỏ qua)';
            }
            showToast('🔊 Đang đọc phát âm... Sẽ chuyển sang câu sau ngay khi đọc xong! (Bấm Enter lần nữa để chuyển ngay)', 'info');
          } else {
            // Bấm Enter lần 2 trong lúc đọc -> Chuyển ngay lập tức
            stopSpeech();
            awaitingNextEnter = false;
            userPressedEnterDuringSpeech = false;
            nextCheckWord();
          }
        } else {
          // Bấm Enter là chuyển ngay lập tức sang từ tiếp theo
          stopSpeech();
          awaitingNextEnter = false;
          userPressedEnterDuringSpeech = false;
          nextCheckWord();
        }
      } else if (!checkAnswerSubmitted) {
        submitCheckAnswer();
      }
    }

    // Enter & Next handlers for Quiz Mode
    function handleQuizEnter(e) {
      if (e) e.preventDefault();
      if (quizAwaitingNextEnter) {
        stopQuizCountdown();
        if (isSpeechSpeaking) {
          if (!quizPressedEnterDuringSpeech) {
            quizPressedEnterDuringSpeech = true;
            const quizNextBtn = document.getElementById('quiz-next-btn');
            if (quizNextBtn) {
              quizNextBtn.innerHTML = '<span>⏳</span> Đang đọc xong sẽ chuyển ngay... (Bấm Enter lần nữa để bỏ qua)';
            }
            showToast('🔊 Đang đọc phát âm... Sẽ chuyển câu ngay sau khi đọc xong! (Bấm Enter lần nữa để chuyển ngay)', 'info');
          } else {
            stopSpeech();
            quizAwaitingNextEnter = false;
            quizPressedEnterDuringSpeech = false;
            quizRoundIndex++;
            generateQuizQuestion();
          }
        } else {
          stopSpeech();
          quizAwaitingNextEnter = false;
          quizPressedEnterDuringSpeech = false;
          quizRoundIndex++;
          generateQuizQuestion();
        }
      }
    }

    // 5. Type-to-Check Mode events
    document.getElementById('submit-check-btn')?.addEventListener('click', submitCheckAnswer);
    document.getElementById('next-check-btn')?.addEventListener('click', () => {
      stopAnswerCountdown();
      stopSpeech();
      awaitingNextEnter = false;
      userPressedEnterDuringSpeech = false;
      nextCheckWord();
    });
    document.getElementById('hint-btn')?.addEventListener('click', giveHint);
    document.getElementById('shuffle-check-btn')?.addEventListener('click', () => {
      initCheckMode(true);
      showToast('Đã xáo trộn danh sách từ kiểm tra! 🔀', 'info');
    });
    document.getElementById('speak-correct-btn')?.addEventListener('click', () => {
      const item = checkQueue[checkIndex];
      if (item) speakWord(item.word, null, true);
    });

    // Sai đâu báo đỏ & đợi sửa đúng: Sự kiện nhập liệu thời gian thực và tự điền từ
    document.getElementById('check-user-input')?.addEventListener('input', handleCheckInputLive);
    document.getElementById('reveal-fix-btn')?.addEventListener('click', handleRevealFix);

    // Toggle bật/tắt chế độ sửa sai bắt buộc
    const strictCheckbox = document.getElementById('strict-correction-checkbox');
    if (strictCheckbox) {
      strictCheckbox.checked = settings.strictCorrection !== false;
      strictCheckbox.addEventListener('change', (e) => {
        settings.strictCorrection = e.target.checked;
        saveSettings();
        showToast(
          settings.strictCorrection
            ? 'Đã bật: Sai đâu báo đỏ & đợi sửa đúng! 🔴'
            : 'Đã tắt chế độ bắt buộc sửa đúng.',
          'info'
        );
      });
    }

    document.getElementById('check-user-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleCheckEnter(e);
      }
    });

    // 6. Quiz Mode events
    document.getElementById('quiz-speak-btn')?.addEventListener('click', () => {
      if (quizCurrentWord) speakWord(quizCurrentWord.word, null, true);
    });
    document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
      stopQuizCountdown();
      stopSpeech();
      quizAwaitingNextEnter = false;
      quizPressedEnterDuringSpeech = false;
      quizRoundIndex++;
      generateQuizQuestion();
    });

    // 7. Flashcard events
    const flashcardElem = document.getElementById('flashcard-element');
    flashcardElem?.addEventListener('click', toggleFlipCard);

    document.getElementById('card-speak-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = flashcardQueue[flashcardIndex];
      if (item) speakWord(item.word, null, true);
    });

    document.getElementById('card-prev-btn')?.addEventListener('click', () => {
      flashcardIndex--;
      renderCurrentFlashcard();
    });
    document.getElementById('card-next-btn')?.addEventListener('click', () => {
      flashcardIndex++;
      renderCurrentFlashcard();
    });
    document.getElementById('card-review-btn')?.addEventListener('click', () => markFlashcard(false));
    document.getElementById('card-master-btn')?.addEventListener('click', () => markFlashcard(true));
    document.getElementById('shuffle-card-btn')?.addEventListener('click', () => {
      initFlashcardMode(true);
      showToast('Đã xáo trộn bộ thẻ Flashcard! 🔀', 'info');
    });

    // 8. Vocabulary List & Filter events
    document.getElementById('vocab-search')?.addEventListener('input', renderVocabularyList);
    document.getElementById('filter-chapter')?.addEventListener('change', renderVocabularyList);
    document.getElementById('filter-status')?.addEventListener('change', renderVocabularyList);

    // 9. Word Modal events
    document.getElementById('open-add-modal-btn')?.addEventListener('click', () => openWordModal());
    document.getElementById('close-modal-btn')?.addEventListener('click', closeWordModal);
    document.getElementById('cancel-modal-btn')?.addEventListener('click', closeWordModal);
    document.getElementById('word-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'word-modal') closeWordModal();
    });
    document.getElementById('word-form')?.addEventListener('submit', handleWordFormSubmit);
    document.getElementById('form-add-new-chap-btn')?.addEventListener('click', () => {
      closeWordModal();
      openChapterModal();
    });

    document.getElementById('modal-test-audio-btn')?.addEventListener('click', () => {
      const word = document.getElementById('form-word')?.value.trim();
      if (word) {
        speakWord(word);
      } else {
        showToast('Hãy nhập từ tiếng Anh trước khi nghe thử', 'warning');
      }
    });

    // 10. Chapter Modal events
    document.getElementById('open-chapter-modal-btn')?.addEventListener('click', openChapterModal);
    document.getElementById('quick-add-chapter-btn')?.addEventListener('click', openChapterModal);
    document.getElementById('close-chapter-modal-btn')?.addEventListener('click', closeChapterModal);
    document.getElementById('done-chapter-modal-btn')?.addEventListener('click', closeChapterModal);
    document.getElementById('chapter-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'chapter-modal') closeChapterModal();
    });
    document.getElementById('new-chapter-form')?.addEventListener('submit', handleNewChapterSubmit);

    // 11. AI Settings Modal events
    document.getElementById('open-ai-settings-btn')?.addEventListener('click', openAISettingsModal);
    document.getElementById('close-ai-modal-btn')?.addEventListener('click', closeAISettingsModal);
    document.getElementById('ai-settings-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'ai-settings-modal') closeAISettingsModal();
    });
    document.getElementById('save-ai-settings-btn')?.addEventListener('click', handleSaveAISettings);
    document.getElementById('clear-api-key-btn')?.addEventListener('click', handleClearApiKey);

    // 12. Import / Export / Reset
    document.getElementById('export-btn')?.addEventListener('click', exportVocabularyJSON);
    document.getElementById('import-input')?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importVocabularyJSON(e.target.files[0]);
      }
    });
    document.getElementById('reset-default-btn')?.addEventListener('click', resetToDefault);

    // 13. Wizard: Smart Import & Interactive Word Picker Events
    document.getElementById('open-wizard-btn')?.addEventListener('click', () => openWizardModal('new'));
    document.getElementById('quick-add-to-current-btn')?.addEventListener('click', () => openWizardModal('current'));
    document.getElementById('manage-chapters-btn')?.addEventListener('click', openChapterModal);
    document.getElementById('open-quizlet-import-btn')?.addEventListener('click', () => openWizardModal('new'));
    document.getElementById('open-quizlet-quick-btn')?.addEventListener('click', () => {
      openWizardModal('new');
      setTimeout(() => document.getElementById('wizard-quizlet-url')?.focus(), 150);
    });

    // Sự kiện nạp từ link Quizlet
    document.getElementById('wizard-fetch-quizlet-btn')?.addEventListener('click', () => {
      fetchQuizletFromUrl(document.getElementById('wizard-quizlet-url')?.value);
    });
    document.getElementById('wizard-quizlet-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchQuizletFromUrl(e.target.value);
      }
    });

    // Dán từ Clipboard & Nhập từ File
    document.getElementById('wizard-paste-clipboard-btn')?.addEventListener('click', pasteFromClipboardToWizard);
    document.getElementById('wizard-file-input')?.addEventListener('change', handleWizardFileInput);

    // Quizlet Helper Modal events
    document.getElementById('close-quizlet-guide-btn')?.addEventListener('click', closeQuizletHelperModal);
    document.getElementById('quizlet-guide-close-btn')?.addEventListener('click', closeQuizletHelperModal);
    document.getElementById('quizlet-guide-paste-now-btn')?.addEventListener('click', pasteFromClipboardToWizard);
    document.getElementById('quizlet-guide-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'quizlet-guide-modal') closeQuizletHelperModal();
    });

    document.getElementById('close-wizard-modal-btn')?.addEventListener('click', closeWizardModal);
    document.getElementById('close-wizard-btn')?.addEventListener('click', closeWizardModal);
    document.getElementById('wizard-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'wizard-modal') closeWizardModal();
    });

    document.querySelectorAll('input[name="wizard-target-type"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const wrap = document.getElementById('wizard-new-chap-input-wrap');
        if (wrap) {
          wrap.style.display = e.target.value === 'new' ? 'block' : 'none';
        }
      });
    });

    // Dán mẫu 46 từ BTVN 09 (gồm cả rác tiêu đề để chứng minh bộ lọc thông minh)
    document.getElementById('wizard-paste-sample-btn')?.addEventListener('click', () => {
      const textarea = document.getElementById('wizard-raw-text');
      if (textarea) {
        textarea.value = SAMPLE_BTVN_09;
        updateWizardPreview();
        showToast('Đã dán và tự động lọc sạch 46 từ BTVN 09! Bạn có thể chọn/bỏ chọn từ bên dưới.', 'info');
      }
    });

    // Bắt sự kiện khi người dùng gõ hoặc dán nội dung vào textarea
    document.getElementById('wizard-raw-text')?.addEventListener('input', updateWizardPreview);

    // Chọn tất cả / Bỏ chọn tất cả
    document.getElementById('picker-select-all')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      wizardParsedItems.forEach(item => { item.selected = checked; });
      document.querySelectorAll('#word-picker-list .word-picker-row').forEach(row => {
        row.classList.toggle('is-selected', checked);
        const chk = row.querySelector('input[type="checkbox"]');
        if (chk) chk.checked = checked;
      });
      updatePickerCounters();
    });

    document.getElementById('wizard-import-form')?.addEventListener('submit', handleWizardSubmit);

    // Modal chúc mừng hoàn thành chương (Ảnh Luffy): Click bất kỳ đâu để quay lại
    document.getElementById('chapter-complete-modal')?.addEventListener('click', () => {
      dismissChapterCompleteModal();
    });

    // 14. Keyboard Shortcuts Global
    window.addEventListener('keydown', (e) => {
      // Báo hoàn thành chương (Ảnh Luffy): Nhấn phím BẤT KỲ để chuyển về lại
      if (isChapterCompleteModalActive) {
        e.preventDefault();
        dismissChapterCompleteModal();
        return;
      }

      // Intro screen: nhấn Enter hoặc Space để vào trang ngay
      if (isIntroActive) {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          dismissIntroScreen();
        }
        return;
      }

      if (document.querySelector('.modal.active')) {
        if (e.key === 'Escape') {
          closeWordModal();
          closeChapterModal();
          closeAISettingsModal();
          closeWizardModal();
          closeQuizletHelperModal();
        }
        return;
      }

      const activeSection = document.querySelector('.view-section.active');
      if (!activeSection) return;

      // Xử lý phím Enter toàn cục cho chế độ Kiểm tra và Trắc nghiệm
      if (e.key === 'Enter') {
        if (activeSection.id === 'check-view') {
          handleCheckEnter(e);
          return;
        } else if (activeSection.id === 'quiz-view') {
          handleQuizEnter(e);
          return;
        }
      }

      if (activeSection.id === 'flashcard-view') {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleFlipCard();
        } else if (e.key === 'ArrowRight') {
          flashcardIndex++;
          renderCurrentFlashcard();
        } else if (e.key === 'ArrowLeft') {
          flashcardIndex--;
          renderCurrentFlashcard();
        } else if (e.key === '1') {
          markFlashcard(false);
        } else if (e.key === '2') {
          markFlashcard(true);
        }
      }
    });
  }

  // ==========================================
  // ==========================================
  // INTRO SCREEN (30S HOẶC NHẤN ENTER ĐỂ VÀO)
  // ==========================================
  let isDismissingIntro = false;

  function initIntroScreen() {
    const introScreen = document.getElementById('intro-screen');
    const countdownEl = document.getElementById('intro-countdown-sec');
    const enterBtn = document.getElementById('intro-enter-btn');
    const previewChillBtn = document.getElementById('intro-preview-chill-btn');
    if (!introScreen) return;

    isIntroActive = true;
    isDismissingIntro = false;
    introSecondsRemaining = 30;
    if (countdownEl) countdownEl.textContent = introSecondsRemaining;

    if (introCountdownTimer) clearInterval(introCountdownTimer);
    introCountdownTimer = setInterval(() => {
      introSecondsRemaining--;
      if (countdownEl) countdownEl.textContent = introSecondsRemaining;
      if (introSecondsRemaining <= 0) {
        dismissIntroScreen();
      }
    }, 1000);

    enterBtn?.addEventListener('click', () => dismissIntroScreen());
    const bgmIndicator = document.getElementById('intro-bgm-status');
    bgmIndicator?.addEventListener('click', (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      ChillBGM.toggle();
    });
  }

  function dismissIntroScreen(immediate = false) {
    if (!isIntroActive) return;

    if (introCountdownTimer) {
      clearInterval(introCountdownTimer);
      introCountdownTimer = null;
    }

    // Nhạc chill chỉ tự động phát nếu người dùng chưa chủ động tắt
    if (ChillBGM && !ChillBGM.isPlaying && !ChillBGM.isMutedByUser) {
      ChillBGM.start(false);
    }

    // Đảm bảo không phát âm voice nào khi mới vào trang học
    stopSpeech();

    const introScreen = document.getElementById('intro-screen');
    isIntroActive = false;
    if (introScreen) {
      introScreen.classList.add('fade-out');
      setTimeout(() => {
        introScreen.style.display = 'none';
        introScreen.classList.remove('active');
        const input = document.getElementById('check-user-input');
        if (input && !input.disabled) input.focus();
      }, 450);
    }
    showToast('✨ Đã vào không gian học tập! Hãy chọn chương học để bắt đầu luyện phát âm & từ vựng.', 'success');
  }

  // ==========================================
  // BOOTSTRAP
  // ==========================================
  function initApp() {
    stopSpeech();
    loadData();
    renderChapterDropdowns();
    setupEventListeners();
    initIntroScreen();
    ChillBGM.init();
    initCheckMode();
    initFlashcardMode();
    renderVocabularyList();
    renderStatsView();
    updateHeaderStats();
    Confetti.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
