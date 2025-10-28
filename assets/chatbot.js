const box = document.getElementById('chatbox');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');

function addMsg(text, who) {
  const d = document.createElement('div');
  d.className = `msg ${who}`;
  d.textContent = text;
  box.appendChild(d);
  box.scrollTop = box.scrollHeight;
}

async function send() {
  const text = (input.value || "").trim();
  if (!text) return;
  addMsg(text, 'user'); input.value = '';
  try {
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await r.json();
    addMsg(data.reply || data.error || 'No reply.', 'bot');
  } catch (e) {
    addMsg('Cannot connect to server.', 'bot');
  }
}

sendBtn.addEventListener('click', send);
input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
