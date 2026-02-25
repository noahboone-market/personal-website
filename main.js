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

// ─── Init ─────────────────────────────────────────────────────────────────────
// Hide hint bubble after 6 seconds
setTimeout(() => {
  const hint = document.getElementById('chatHint');
  if (hint && !chatOpen) {
    hint.style.opacity = '0';
    hint.style.transition = 'opacity 0.5s';
    setTimeout(() => hint.classList.add('gone'), 500);
  }
}, 6000);
