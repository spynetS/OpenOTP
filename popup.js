// Main popup logic
let accounts = [];
let updateInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadAccounts();
  setupEventListeners();
  startTimer();
});

// Load accounts from storage
async function loadAccounts() {
  const result = await browser.storage.local.get('accounts');
  accounts = result.accounts || [];
  renderAccounts();
}

// Save accounts to storage
async function saveAccounts() {
  await browser.storage.local.set({ accounts });
}

// Render accounts list
async function renderAccounts() {
  const accountsList = document.getElementById('accountsList');
  const emptyState = document.getElementById('emptyState');
  
  accountsList.innerHTML = '';
  
  if (accounts.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  for (const account of accounts) {
    const code = await TOTP.generate(account.secret);
    const accountDiv = createAccountElement(account, code);
    accountsList.appendChild(accountDiv);
  }
}

// Create account element
function createAccountElement(account, code) {
  const div = document.createElement('div');
  div.className = 'account-item';
  
  div.innerHTML = `
    <div class="account-header">
      <span class="account-name">${escapeHtml(account.name)}</span>
      <button class="delete-btn" data-id="${account.id}">×</button>
    </div>
    <div class="otp-code" data-code="${code}">${formatCode(code)}</div>
    <div class="copy-hint">Click to copy</div>
  `;
  
  // Add click to copy
  const codeElement = div.querySelector('.otp-code');
  const hintElement = div.querySelector('.copy-hint');
  
  codeElement.addEventListener('click', () => {
    copyToClipboard(code);
    hintElement.textContent = '✓ Copied!';
    hintElement.classList.add('copied');
    setTimeout(() => {
      hintElement.textContent = 'Click to copy';
      hintElement.classList.remove('copied');
    }, 2000);
  });
  
  // Add delete button
  const deleteBtn = div.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => deleteAccount(account.id));
  
  return div;
}

// Format code with space in middle
function formatCode(code) {
  if (code.length === 6) {
    return `${code.substr(0, 3)} ${code.substr(3)}`;
  }
  return code;
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('addAccountBtn').addEventListener('click', showAddAccountForm);
  document.getElementById('saveAccount').addEventListener('click', saveNewAccount);
  document.getElementById('cancelAdd').addEventListener('click', hideAddAccountForm);
}

// Show add account form
function showAddAccountForm() {
  document.getElementById('addAccountForm').classList.remove('hidden');
  document.getElementById('accountName').focus();
}

// Hide add account form
function hideAddAccountForm() {
  document.getElementById('addAccountForm').classList.add('hidden');
  document.getElementById('accountName').value = '';
  document.getElementById('secretKey').value = '';
}

// Save new account
async function saveNewAccount() {
  const name = document.getElementById('accountName').value.trim();
  const secret = document.getElementById('secretKey').value.trim().replace(/\s/g, '').toUpperCase();
  
  if (!name || !secret) {
    alert('Please fill in all fields');
    return;
  }
  
  // Validate secret
  try {
    const testCode = await TOTP.generate(secret);
    if (!testCode) {
      throw new Error('Invalid secret');
    }
  } catch (error) {
    alert('Invalid secret key. Please check and try again.');
    return;
  }
  
  const account = {
    id: Date.now().toString(),
    name,
    secret
  };
  
  accounts.push(account);
  await saveAccounts();
  await renderAccounts();
  hideAddAccountForm();
}

// Delete account
async function deleteAccount(id) {
  if (!confirm('Are you sure you want to delete this account?')) {
    return;
  }
  
  accounts = accounts.filter(a => a.id !== id);
  await saveAccounts();
  await renderAccounts();
}

// Start timer
function startTimer() {
  updateTimer();
  updateInterval = setInterval(updateTimer, 100);
}

// Update timer and refresh codes
async function updateTimer() {
  const remaining = TOTP.getRemainingSeconds();
  document.getElementById('timeLeft').textContent = `${remaining}s`;
  
  const progress = (remaining / 30) * 100;
  document.getElementById('timeBar').style.width = `${progress}%`;
  
  // Refresh codes when time is up
  if (remaining === 30) {
    await renderAccounts();
  }
}
