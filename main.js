// ─── Config ───────────────────────────────────────────────────────────────────
// Replace this with your deployed Cloudflare Worker URL after setup
const WORKER_URL = 'YOUR_CLOUDFLARE_WORKER_URL';

// ─── State ────────────────────────────────────────────────────────────────────
let chatOpen = false;
let isTyping = false;
const history = []; // { role: 'user'|'assistant', content: string }

// ─── Chat Toggle ──────────────────────────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  const win  = document.getElementById('chatWindow');
  const hint = document.getElementById('chatHint');

  if (chatOpen) {
    win.classList.add('open');
    hint.classList.add('gone');
    document.getElementById('chatInput').focus();
    setAvatarMood('happy');
    setTimeout(() => setAvatarMood('normal'), 1200);
  } else {
    win.classList.remove('open');
    setAvatarMood('normal');
  }
}

// ─── Key Handler ──────────────────────────────────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  if (isTyping) return;

  const input = document.getElementById('chatInput');
  const btn   = document.getElementById('sendBtn');
  const text  = input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  input.value = '';
  btn.disabled = true;
  isTyping = true;

  // Avatar reacts
  setAvatarMood('thinking');
  document.getElementById('chatStatus').textContent = 'Thinking...';

  const typing = addTyping();

  // Keep last 6 exchanges (12 messages) for context
  const recentHistory = history.slice(-12);

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: recentHistory }),
    });

    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    typing.remove();
    const reply = data.reply || "I'm not sure about that. Feel free to reach out to Noah directly at Noahbooner@gmail.com!";
    addMessage(reply, 'ai');

    // Save to history
    history.push({ role: 'user', content: text });
    history.push({ role: 'assistant', content: reply });

    setAvatarMood('happy');
    setTimeout(() => setAvatarMood('normal'), 1000);

  } catch (err) {
    typing.remove();
    addMessage("Hmm, couldn't connect right now. Try reaching Noah directly at Noahbooner@gmail.com!", 'ai');
    setAvatarMood('normal');
  }

  document.getElementById('chatStatus').textContent = 'Online';
  btn.disabled = false;
  isTyping = false;
  input.focus();
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
function addMessage(text, role) {
  const msgs = document.getElementById('chatMessages');
  const div  = document.createElement('div');
  div.className = `message message-${role}`;
  const p = document.createElement('p');
  p.textContent = text;
  div.appendChild(p);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addTyping() {
  const msgs = document.getElementById('chatMessages');
  const div  = document.createElement('div');
  div.className = 'message message-ai typing';
  div.innerHTML = '<p><span class="dot"></span><span class="dot"></span><span class="dot"></span></p>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

// ─── Avatar Mood ──────────────────────────────────────────────────────────────
function setAvatarMood(mood) {
  const face = document.getElementById('avatarFace');
  if (!face) return;

  const mouthNormal   = face.querySelector('.mouth-normal');
  const mouthThinking = face.querySelector('.mouth-thinking');
  const mouthExcited  = face.querySelector('.mouth-excited');
  const browL         = face.querySelector('.brow-l');
  const browR         = face.querySelector('.brow-r');
  const btn           = document.getElementById('avatarBtn');

  // Reset
  mouthNormal.setAttribute('opacity', '0');
  mouthThinking.setAttribute('opacity', '0');
  mouthExcited.setAttribute('opacity', '0');
  browL.setAttribute('opacity', '0');
  browR.setAttribute('opacity', '0');

  if (mood === 'normal') {
    mouthNormal.setAttribute('opacity', '1');
  } else if (mood === 'thinking') {
    mouthThinking.setAttribute('opacity', '1');
    browL.setAttribute('opacity', '1');
    browR.setAttribute('opacity', '1');
  } else if (mood === 'happy') {
    mouthExcited.setAttribute('opacity', '1');
    btn.classList.remove('excited');
    // Force reflow so animation restarts
    void btn.offsetWidth;
    btn.classList.add('excited');
    btn.addEventListener('animationend', () => btn.classList.remove('excited'), { once: true });
  }
}

// ─── Scroll Animations ────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  }),
  { threshold: 0.12 }
);

document.querySelectorAll(
  '.timeline-item, .skill-category, .contact-card, .about-text, .detail-item'
).forEach((el, i) => {
  el.classList.add('fade-in');
  el.style.transitionDelay = `${i * 0.06}s`;
  observer.observe(el);
});

// ─── Typewriter ───────────────────────────────────────────────────────────────
function typewriter(targetId, text, speed = 55) {
  const el = document.getElementById(targetId);
  if (!el) return;
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, speed + Math.random() * 30);
    }
  };
  setTimeout(tick, 900);
}

// ─── Nav shadow on scroll ─────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('.nav').classList.toggle('scrolled', window.scrollY > 20);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
typewriter('typewriter', 'AI Marketing Intern @ Domo');

// Hide hint bubble after 6 seconds
setTimeout(() => {
  const hint = document.getElementById('chatHint');
  if (hint && !chatOpen) {
    hint.style.opacity = '0';
    hint.style.transition = 'opacity 0.5s';
    setTimeout(() => hint.classList.add('gone'), 500);
  }
}, 6000);

// ─── AI Network Animation ─────────────────────────────────────────────────────
const canvas = document.getElementById('ai-network-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  
  // Settings
  const config = {
    particleCount: 70,
    maxDistance: 130, // Distance to connect particles
    colors: ['#0EA5E9', '#38BDF8', '#8B5CF6', '#D946EF'], // Cyan, Light Blue, Purple, Magenta
    mouseRadius: 180 // Distance mouse connects to particles
  };
  
  // Mouse position
  let mouse = {
    x: null,
    y: null
  };
  
  // Track mouse on hero section (canvas captures it)
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  
  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });
  
  // Resize canvas
  function resize() {
    width = canvas.parentElement.offsetWidth;
    height = canvas.parentElement.offsetHeight;
    canvas.width = width;
    canvas.height = height;
  }
  
  window.addEventListener('resize', () => {
    resize();
    initParticles(); // Re-distribute particles
  });
  
  // Particle class
  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
      this.radius = Math.random() * 2 + 1.5;
      this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
    }
    
    update() {
      // Move
      this.x += this.vx;
      this.y += this.vy;
      
      // Bounce off walls
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
      
      // Prevent particles completely escaping occasionally
      if (this.x < -50) this.x = width;
      if (this.x > width + 50) this.x = 0;
      if (this.y < -50) this.y = height;
      if (this.y > height + 50) this.y = 0;
    }
    
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      // Add subtle glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
    }
  }
  
  function initParticles() {
    particles = [];
    // Calculate density based on screen volume
    const area = width * height;
    const count = Math.min(Math.max(Math.floor(area / 15000), 30), 120);
    
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }
  
  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // Disable shadow for lines performance
    ctx.shadowBlur = 0;
    
    // Connect particles
    for (let i = 0; i < particles.length; i++) {
      let p1 = particles[i];
      p1.update();
      p1.draw();
      
      for (let j = i + 1; j < particles.length; j++) {
        let p2 = particles[j];
        
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < config.maxDistance) {
          // Opacity based on distance
          let opacity = 1 - (dist / config.maxDistance);
          
          // Gradient line between particles
          let gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          
          // Hex to rgba helper
          const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
          };
          
          gradient.addColorStop(0, hexToRgba(p1.color, opacity * 0.5));
          gradient.addColorStop(1, hexToRgba(p2.color, opacity * 0.5));
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      // Connect to mouse
      if (mouse.x !== null) {
        let dx = p1.x - mouse.x;
        let dy = p1.y - mouse.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < config.mouseRadius) {
          let opacity = 1 - (dist / config.mouseRadius);
          
          // Push particles slightly away from mouse
          if (dist < 40) {
            p1.x += dx * 0.05;
            p1.y += dy * 0.05;
          }
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = \`rgba(14, 165, 233, \${opacity * 0.4})\`; // Cyan line to mouse
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  // Start
  resize();
  initParticles();
  animate();
}
