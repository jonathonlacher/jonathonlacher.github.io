let participants = [];
let rules = []; // Each rule is [personA, personB] - bidirectional exclusion
let forcedPairings = []; // Each pairing is [giver, receiver] - directional
let assignments = null;

const nameInput = document.getElementById('nameInput');
const participantList = document.getElementById('participantList');
const rulePersonA = document.getElementById('rulePersonA');
const rulePersonB = document.getElementById('rulePersonB');
const ruleList = document.getElementById('ruleList');
const forcedGiver = document.getElementById('forcedGiver');
const forcedReceiver = document.getElementById('forcedReceiver');
const forcedList = document.getElementById('forcedList');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const resultsCard = document.getElementById('resultsCard');
const resultsList = document.getElementById('resultsList');
const seedInput = document.getElementById('seedInput');
const permutationCount = document.getElementById('permutationCount');

function createSeededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }

  return function() {
    h |= 0;
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, random) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function saveToUrl() {
  try {
    const state = {
      p: participants,
      r: rules,
      f: forcedPairings,
      s: seedInput.value.trim()
    };
    const encoded = encodeURIComponent(JSON.stringify(state));
    history.replaceState(null, '', '#' + encoded);
  } catch (e) {
    // Sandboxed environment may block this
  }
}

function loadFromUrl() {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const state = JSON.parse(decodeURIComponent(hash));
    if (Array.isArray(state.p)) {
      participants = state.p.filter(p => typeof p === 'string');
    }
    if (Array.isArray(state.r)) {
      rules = state.r.filter(r =>
        Array.isArray(r) && r.length === 2 &&
        typeof r[0] === 'string' && typeof r[1] === 'string'
      );
    }
    if (Array.isArray(state.f)) {
      forcedPairings = state.f.filter(f =>
        Array.isArray(f) && f.length === 2 &&
        typeof f[0] === 'string' && typeof f[1] === 'string'
      );
    }
    if (typeof state.s === 'string') {
      seedInput.value = state.s;
    }
  } catch (e) {
    // Could not parse URL state or sandboxed
  }
}

loadFromUrl();

nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addParticipant();
});

seedInput.addEventListener('input', () => {
  saveToUrl();
  resultsCard.style.display = 'none';
  assignments = null;
});

seedInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && participants.length >= 3) generate();
});

function showMessage(msg) {
  const existing = document.getElementById('tempMessage');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'tempMessage';
  div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;z-index:1000;font-size:14px;';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

function addParticipant() {
  const name = nameInput.value.trim();
  if (!name) return;

  if (participants.some(p => p.toLowerCase() === name.toLowerCase())) {
    showMessage('This name already exists!');
    return;
  }

  participants.push(name);
  nameInput.value = '';
  nameInput.focus();
  updateUI();
}

function removeParticipant(index) {
  const removed = participants[index];
  participants.splice(index, 1);

  rules = rules.filter(r => r[0] !== removed && r[1] !== removed);
  forcedPairings = forcedPairings.filter(f => f[0] !== removed && f[1] !== removed);

  updateUI();
}

function addRule() {
  const a = rulePersonA.value;
  const b = rulePersonB.value;

  if (!a || !b) {
    showMessage('Please select both people');
    return;
  }

  if (a === b) {
    showMessage('Please select two different people');
    return;
  }

  const exists = rules.some(r =>
    (r[0] === a && r[1] === b) || (r[0] === b && r[1] === a)
  );

  if (exists) {
    showMessage('This rule already exists');
    return;
  }

  const conflictsWithForced = forcedPairings.some(f =>
    (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a)
  );
  if (conflictsWithForced) {
    showMessage('This conflicts with a forced pairing');
    return;
  }

  rules.push([a, b]);
  rulePersonA.value = '';
  rulePersonB.value = '';
  updateUI();
}

function removeRule(index) {
  rules.splice(index, 1);
  updateUI();
}

function addForcedPairing() {
  const giver = forcedGiver.value;
  const receiver = forcedReceiver.value;

  if (!giver || !receiver) {
    showMessage('Please select both giver and receiver');
    return;
  }

  if (giver === receiver) {
    showMessage('Giver and receiver must be different');
    return;
  }

  if (forcedPairings.some(f => f[0] === giver)) {
    showMessage(`${giver} already has a forced pairing`);
    return;
  }

  if (forcedPairings.some(f => f[1] === receiver)) {
    showMessage(`Someone is already forced to give to ${receiver}`);
    return;
  }

  const conflictsWithExclusion = rules.some(r =>
    (r[0] === giver && r[1] === receiver) || (r[0] === receiver && r[1] === giver)
  );
  if (conflictsWithExclusion) {
    showMessage('This conflicts with an exclusion rule');
    return;
  }

  forcedPairings.push([giver, receiver]);
  forcedGiver.value = '';
  forcedReceiver.value = '';
  updateUI();
}

function removeForcedPairing(index) {
  forcedPairings.splice(index, 1);
  updateUI();
}

function updateUI() {
  if (participants.length === 0) {
    participantList.innerHTML = '<span class="empty-state">No participants yet</span>';
  } else {
    participantList.innerHTML = participants.map((p, i) => `
      <span class="tag">
        ${escapeHtml(p)}
        <button class="tag-remove" onclick="removeParticipant(${i})">×</button>
      </span>
    `).join('');
  }

  const options = '<option value="">Select...</option>' +
    participants.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  rulePersonA.innerHTML = options;
  rulePersonB.innerHTML = options;
  forcedGiver.innerHTML = options;
  forcedReceiver.innerHTML = options;

  if (rules.length === 0) {
    ruleList.innerHTML = '<span class="empty-state">No rules yet</span>';
  } else {
    ruleList.innerHTML = rules.map((r, i) => `
      <span class="tag rule-tag">
        ${escapeHtml(r[0])} ↔ ${escapeHtml(r[1])}
        <button class="tag-remove" onclick="removeRule(${i})">×</button>
      </span>
    `).join('');
  }

  if (forcedPairings.length === 0) {
    forcedList.innerHTML = '<span class="empty-state">No forced pairings yet</span>';
  } else {
    forcedList.innerHTML = forcedPairings.map((f, i) => `
      <span class="tag forced-tag">
        ${escapeHtml(f[0])} → ${escapeHtml(f[1])}
        <button class="tag-remove" onclick="removeForcedPairing(${i})">×</button>
      </span>
    `).join('');
  }

  generateBtn.disabled = participants.length < 3;

  if (participants.length >= 3) {
    const permResult = countValidPermutations(participants, rules, forcedPairings);
    permutationCount.innerHTML = formatPermutationCount(permResult);
    generateBtn.disabled = permResult.count === 0;
  } else {
    permutationCount.innerHTML = '<span class="muted-message">Add at least 3 participants</span>';
  }

  copyBtn.style.display = participants.length > 0 ? 'block' : 'none';

  resultsCard.style.display = 'none';
  assignments = null;

  saveToUrl();
}

function generate() {
  const seed = seedInput.value.trim();
  if (!seed) {
    showMessage('Please enter a seed phrase');
    return;
  }

  saveToUrl();

  const result = generateSecretSanta(participants, rules, forcedPairings, seed);

  if (!result.success) {
    resultsList.innerHTML = `<div class="error-message">${result.error}</div>`;
    resultsCard.style.display = 'block';
    return;
  }

  assignments = result.assignments;
  resultsList.innerHTML = `
    <div class="seed-banner">
      🔒 Seed: <strong>${escapeHtml(seed)}</strong>
    </div>
  ` + assignments.map(([giver, receiver]) => `
    <div class="result-item">
      <span class="result-giver">${escapeHtml(giver)}</span>
      <span class="result-arrow">→</span>
      <span class="result-receiver">${escapeHtml(receiver)}</span>
    </div>
  `).join('');

  resultsCard.style.display = 'block';
  resultsCard.scrollIntoView({ behavior: 'smooth' });
}

function countValidPermutations(people, exclusions, forced) {
  const n = people.length;
  if (n < 3) return { count: 0, capped: false };

  const excluded = new Set();
  for (const [a, b] of exclusions) {
    excluded.add(`${a}|${b}`);
    excluded.add(`${b}|${a}`);
  }

  const forcedGiverToReceiver = new Map();
  const forcedReceiverToGiver = new Map();
  for (const [giver, receiver] of forced) {
    forcedGiverToReceiver.set(giver, receiver);
    forcedReceiverToGiver.set(receiver, giver);
  }

  function canGiveTo(giver, receiver) {
    if (giver === receiver) return false;
    if (excluded.has(`${giver}|${receiver}`)) return false;

    if (forcedGiverToReceiver.has(giver)) {
      return forcedGiverToReceiver.get(giver) === receiver;
    }

    if (forcedReceiverToGiver.has(receiver)) {
      return forcedReceiverToGiver.get(receiver) === giver;
    }

    return true;
  }

  let count = 0;
  const maxCount = 100000;

  function countAssignments(giverIndex, availableReceivers) {
    if (count >= maxCount) return;

    if (giverIndex === n) {
      count++;
      return;
    }

    const giver = people[giverIndex];

    for (const receiver of availableReceivers) {
      if (canGiveTo(giver, receiver)) {
        const remaining = availableReceivers.filter(r => r !== receiver);
        countAssignments(giverIndex + 1, remaining);
      }
    }
  }

  countAssignments(0, [...people]);
  return count >= maxCount ? { count, capped: true } : { count, capped: false };
}

function formatPermutationCount(result) {
  if (result.count === 0) {
    return '<span style="color: #c41e3a;">No valid arrangements possible</span>';
  }
  if (result.count === 1) {
    return '<span style="color: #e67e22;">Only <strong>1</strong> possible arrangement</span>';
  }
  if (result.capped) {
    return `<span style="color: #27ae60;"><strong>${result.count.toLocaleString()}+</strong> possible arrangements</span>`;
  }
  if (result.count <= 10) {
    return `<span style="color: #e67e22;"><strong>${result.count}</strong> possible arrangements</span>`;
  }
  return `<span style="color: #27ae60;"><strong>${result.count.toLocaleString()}</strong> possible arrangements</span>`;
}

function generateSecretSanta(people, exclusions, forced, seed) {
  const n = people.length;

  const canonicalSeed = seed + '|' + [...people].sort().join(',');
  const random = createSeededRandom(canonicalSeed);

  const excluded = new Set();
  for (const [a, b] of exclusions) {
    excluded.add(`${a}|${b}`);
    excluded.add(`${b}|${a}`);
  }

  const forcedGiverToReceiver = new Map();
  const forcedReceiverToGiver = new Map();
  for (const [giver, receiver] of forced) {
    forcedGiverToReceiver.set(giver, receiver);
    forcedReceiverToGiver.set(receiver, giver);
  }

  function canGiveTo(giver, receiver) {
    if (giver === receiver) return false;
    if (excluded.has(`${giver}|${receiver}`)) return false;

    if (forcedGiverToReceiver.has(giver)) {
      return forcedGiverToReceiver.get(giver) === receiver;
    }

    if (forcedReceiverToGiver.has(receiver)) {
      return forcedReceiverToGiver.get(receiver) === giver;
    }

    return true;
  }

  function tryAssign(giverIndex, receivers, assignmentsList, rand) {
    if (giverIndex === n) {
      return true;
    }

    const giver = people[giverIndex];

    const availableReceivers = seededShuffle(receivers, rand);

    for (const receiver of availableReceivers) {
      if (canGiveTo(giver, receiver)) {
        const newReceivers = receivers.filter(r => r !== receiver);
        assignmentsList.push([giver, receiver]);

        if (tryAssign(giverIndex + 1, newReceivers, assignmentsList, rand)) {
          return true;
        }

        assignmentsList.pop();
      }
    }

    return false;
  }

  const shuffledPeople = seededShuffle(people, random);
  const assignmentsList = [];

  if (tryAssign(0, shuffledPeople, assignmentsList, random)) {
    assignmentsList.sort((a, b) =>
      people.indexOf(a[0]) - people.indexOf(b[0])
    );
    return { success: true, assignments: assignmentsList };
  }

  return {
    success: false,
    error: "Couldn't find valid assignments. Try removing some exclusion rules or forced pairings - the current constraints might make it impossible to match everyone."
  };
}

function copyLink() {
  const url = window.location.href;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      copyBtn.textContent = '✓ Link Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '🔗 Copy Link to This Setup';
        copyBtn.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy() {
  showMessage('Link updated in address bar - copy from there!');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

updateUI();
