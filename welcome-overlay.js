/**
 * SPARKALS TASKS — FIRST LOGIN WELCOME OVERLAY
 * 3-slide intro shown only on first login, never again.
 * Add this file to your GitHub repository as: welcome-overlay.js
 * Then add this line to dashboard.html just before </body>:
 * <script src="welcome-overlay.js"></script>
 */

(function () {
  // Only show if never seen before on this device
  const SEEN_KEY = "sparkals_welcome_seen_v1";
  if (localStorage.getItem(SEEN_KEY)) return;

  // ── STYLES ──
  const style = document.createElement("style");
  style.textContent = `
    #spk-welcome-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: #0f0f1a;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: 'DM Sans', sans-serif;
      animation: spkFadeIn 0.5s ease;
    }
    @keyframes spkFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes spkFadeOut { from { opacity: 1; } to { opacity: 0; } }

    #spk-welcome-overlay.closing {
      animation: spkFadeOut 0.4s ease forwards;
    }

    .spk-slide {
      display: none; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 40px 32px; text-align: center;
      max-width: 400px; width: 100%;
      animation: spkSlideIn 0.4s ease;
    }
    @keyframes spkSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .spk-slide.active { display: flex; }

    .spk-slide-icon {
      width: 90px; height: 90px; border-radius: 22px;
      display: flex; align-items: center; justify-content: center;
      font-size: 42px; margin-bottom: 28px;
      background: #1a1a2e; border: 1px solid #2e2e50;
    }
    .spk-slide-icon img {
      width: 60px; height: 60px; border-radius: 12px; object-fit: contain;
    }

    .spk-slide-tag {
      font-size: 10px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: #7c6af7;
      font-family: 'Space Mono', monospace;
      margin-bottom: 12px;
    }
    .spk-slide-title {
      font-size: 22px; font-weight: 700; color: #f0f0f8;
      line-height: 1.3; margin-bottom: 14px;
    }
    .spk-slide-body {
      font-size: 14px; color: #9090b8; line-height: 1.7;
      margin-bottom: 32px;
    }

    /* Feature list inside slides */
    .spk-feature-list {
      width: 100%; background: #1a1a2e; border: 1px solid #2e2e50;
      border-radius: 12px; padding: 16px 20px;
      display: flex; flex-direction: column; gap: 12px;
      margin-bottom: 32px; text-align: left;
    }
    .spk-feature-row {
      display: flex; align-items: flex-start; gap: 12px;
    }
    .spk-feature-icon {
      font-size: 18px; flex-shrink: 0; margin-top: 1px;
    }
    .spk-feature-text strong {
      display: block; font-size: 13px; font-weight: 600;
      color: #f0f0f8; margin-bottom: 2px;
    }
    .spk-feature-text span {
      font-size: 12px; color: #9090b8;
    }

    /* Dots */
    .spk-dots {
      display: flex; gap: 8px; margin-bottom: 28px;
    }
    .spk-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #2e2e50; transition: all 0.3s;
    }
    .spk-dot.active {
      background: #7c6af7; width: 20px; border-radius: 3px;
    }

    /* Buttons */
    .spk-btn-row {
      display: flex; gap: 10px; width: 100%;
    }
    .spk-btn {
      flex: 1; padding: 13px 20px; border-radius: 10px;
      border: none; cursor: pointer; font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 600; transition: all 0.2s;
    }
    .spk-btn-primary {
      background: #7c6af7; color: #fff;
    }
    .spk-btn-primary:hover { background: #6a58e0; }
    .spk-btn-ghost {
      background: #1a1a2e; color: #9090b8;
      border: 1px solid #2e2e50;
    }
    .spk-btn-ghost:hover { background: #2e2e50; color: #f0f0f8; }
    .spk-btn-full { flex: unset; width: 100%; }

    /* Skip link */
    .spk-skip {
      position: absolute; top: 20px; right: 20px;
      background: none; border: none; color: #6060a0;
      font-family: 'DM Sans', sans-serif; font-size: 13px;
      cursor: pointer; padding: 6px 10px; border-radius: 6px;
      transition: color 0.2s;
    }
    .spk-skip:hover { color: #9090b8; }

    /* Progress bar at top */
    .spk-progress-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: #1a1a2e;
    }
    .spk-progress-fill {
      height: 100%; background: #7c6af7;
      border-radius: 0 2px 2px 0;
      transition: width 0.4s ease;
    }

    @media(max-width: 400px) {
      .spk-slide { padding: 30px 20px; }
      .spk-slide-title { font-size: 19px; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──
  const overlay = document.createElement("div");
  overlay.id = "spk-welcome-overlay";
  overlay.innerHTML = `
    <div class="spk-progress-bar">
      <div class="spk-progress-fill" id="spkProgressFill" style="width:33%"></div>
    </div>

    <button class="spk-skip" onclick="spkSkip()">Skip →</button>

    <!-- SLIDE 1: WELCOME -->
    <div class="spk-slide active" id="spkSlide1">
      <div class="spk-slide-icon">
        <img src="/icons/logo%20copfy.png" alt="Sparkals" onerror="this.parentElement.textContent='💎'"/>
      </div>
      <div class="spk-slide-tag">Welcome</div>
      <div class="spk-slide-title">Welcome to<br/>Sparkals Tasks</div>
      <div class="spk-slide-body">
        Your complete work management platform.<br/>
        Tasks, attendance, communication and reports — all in one place.
      </div>
      <div class="spk-dots">
        <div class="spk-dot active" id="spkDot1"></div>
        <div class="spk-dot" id="spkDot2"></div>
        <div class="spk-dot" id="spkDot3"></div>
      </div>
      <div class="spk-btn-row">
        <button class="spk-btn spk-btn-primary" onclick="spkNext()">Get Started →</button>
      </div>
    </div>

    <!-- SLIDE 2: FEATURES -->
    <div class="spk-slide" id="spkSlide2">
      <div class="spk-slide-tag">How It Works</div>
      <div class="spk-slide-title">Everything you need,<br/>in one tap</div>
      <div class="spk-feature-list">
        <div class="spk-feature-row">
          <div class="spk-feature-icon">🕐</div>
          <div class="spk-feature-text">
            <strong>Clock In &amp; Out</strong>
            <span>Mark your attendance daily from the home screen</span>
          </div>
        </div>
        <div class="spk-feature-row">
          <div class="spk-feature-icon">✅</div>
          <div class="spk-feature-text">
            <strong>Tasks</strong>
            <span>View assigned tasks, update stages and add comments</span>
          </div>
        </div>
        <div class="spk-feature-row">
          <div class="spk-feature-icon">💬</div>
          <div class="spk-feature-text">
            <strong>Team Chat</strong>
            <span>Communicate with your department and the full team</span>
          </div>
        </div>
        <div class="spk-feature-row">
          <div class="spk-feature-icon">🏖️</div>
          <div class="spk-feature-text">
            <strong>Leave Requests</strong>
            <span>Apply for leave and track approval status</span>
          </div>
        </div>
      </div>
      <div class="spk-dots">
        <div class="spk-dot" id="spkDot1b"></div>
        <div class="spk-dot active" id="spkDot2b"></div>
        <div class="spk-dot" id="spkDot3b"></div>
      </div>
      <div class="spk-btn-row">
        <button class="spk-btn spk-btn-ghost" onclick="spkPrev()">← Back</button>
        <button class="spk-btn spk-btn-primary" onclick="spkNext()">Next →</button>
      </div>
    </div>

    <!-- SLIDE 3: NOTIFICATIONS + START -->
    <div class="spk-slide" id="spkSlide3">
      <div class="spk-slide-icon" style="font-size:40px;">🔔</div>
      <div class="spk-slide-tag">Stay Informed</div>
      <div class="spk-slide-title">Enable notifications<br/>to stay on track</div>
      <div class="spk-slide-body">
        Get instant alerts when tasks are assigned, deadlines approach, or your leave is approved — even when the app is closed.
      </div>
      <div class="spk-feature-list">
        <div class="spk-feature-row">
          <div class="spk-feature-icon">📋</div>
          <div class="spk-feature-text">
            <strong>Task assigned to you</strong>
            <span>Instant notification with task name and deadline</span>
          </div>
        </div>
        <div class="spk-feature-row">
          <div class="spk-feature-icon">⏰</div>
          <div class="spk-feature-text">
            <strong>Deadline reminders</strong>
            <span>Alerts 24 hours and 2 hours before due</span>
          </div>
        </div>
        <div class="spk-feature-row">
          <div class="spk-feature-icon">✅</div>
          <div class="spk-feature-text">
            <strong>Leave decisions</strong>
            <span>Know immediately when your leave is approved or rejected</span>
          </div>
        </div>
      </div>
      <div class="spk-dots">
        <div class="spk-dot" id="spkDot1c"></div>
        <div class="spk-dot" id="spkDot2c"></div>
        <div class="spk-dot active" id="spkDot3c"></div>
      </div>
      <div class="spk-btn-row">
        <button class="spk-btn spk-btn-ghost" onclick="spkPrev()">← Back</button>
        <button class="spk-btn spk-btn-primary spk-btn-full" onclick="spkFinish()">Enter Sparkals Tasks</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── STATE ──
  let currentSlide = 1;
  const totalSlides = 3;

  function updateProgress() {
    const pct = (currentSlide / totalSlides) * 100;
    document.getElementById("spkProgressFill").style.width = pct + "%";
  }

  // ── NAVIGATION ──
  window.spkNext = function () {
    if (currentSlide >= totalSlides) { spkFinish(); return; }
    document.getElementById("spkSlide" + currentSlide).classList.remove("active");
    currentSlide++;
    document.getElementById("spkSlide" + currentSlide).classList.add("active");
    updateProgress();
  };

  window.spkPrev = function () {
    if (currentSlide <= 1) return;
    document.getElementById("spkSlide" + currentSlide).classList.remove("active");
    currentSlide--;
    document.getElementById("spkSlide" + currentSlide).classList.add("active");
    updateProgress();
  };

  window.spkSkip = function () {
    spkFinish();
  };

  window.spkFinish = function () {
    localStorage.setItem(SEEN_KEY, "1");
    const el = document.getElementById("spk-welcome-overlay");
    el.classList.add("closing");
    setTimeout(() => el.remove(), 400);
    // Trigger push permission after welcome
    setTimeout(() => {
      if (typeof requestPushPermission === "function") {
        requestPushPermission();
      }
    }, 800);
  };

  updateProgress();
})();
