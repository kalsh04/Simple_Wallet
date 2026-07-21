const { ethers } = window;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendBtn = document.getElementById('sendBtn');
const estimateBtn = document.getElementById('estimateBtn');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');

const userAddress = document.getElementById('userAddress');
const userBalance = document.getElementById('userBalance');
const toAddress = document.getElementById('toAddress');
const sendAmount = document.getElementById('sendAmount');
const sendStatus = document.getElementById('sendStatus');
const txList = document.getElementById('txList');
const networkName = document.getElementById('networkName');
const networkWarning = document.getElementById('networkWarning');
const gasEstimate = document.getElementById('gasEstimate');
const gasFee = document.getElementById('gasFee');
const totalCost = document.getElementById('totalCost');

const connectSection = document.getElementById('connect-section');
const accountSection = document.getElementById('account-section');
const sendSection = document.getElementById('send-section');
const historySection = document.getElementById('history-section');

let provider;
let signer;
let currentAccount = null;
let transactions = [];

const STORAGE_KEY = 'simple_wallet_tx_history_v1';

connectBtn.addEventListener('click', async () => {
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask not found! Please install MetaMask.');
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        await loadWalletInfo();
        await detectNetwork();
        await loadTransactionHistoryForCurrentAccount();

        connectSection.classList.add('hidden');
        accountSection.classList.remove('hidden');
        sendSection.classList.remove('hidden');
        historySection.classList.remove('hidden');
    } catch (error) {
        alert('Connection failed: ' + error.message);
    }
});

async function detectNetwork() {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    if (chainId === 11155111) {
        networkName.textContent = 'Sepolia Testnet ✅';
        networkName.style.color = '#10B981';
        networkWarning.textContent = '✅ You are on the correct network!';
        networkWarning.className = 'success';
    } else if (chainId === 1) {
        networkName.textContent = 'Ethereum Mainnet ⚠️';
        networkName.style.color = '#EF4444';
        networkWarning.textContent = '⚠️ WARNING: You are on Mainnet! Switch to Sepolia to avoid spending real money!';
        networkWarning.className = 'error';
    } else {
        networkName.textContent = 'Unknown Network (Chain ID: ' + chainId + ')';
        networkName.style.color = '#F59E0B';
        networkWarning.textContent = '⚠️ Unknown network detected!';
        networkWarning.className = 'error';
    }
}

async function loadWalletInfo() {
    const address = await signer.getAddress();
    currentAccount = address;

    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.utils.formatEther(balance);

    userAddress.textContent = address;
    userBalance.textContent = parseFloat(balanceInEth).toFixed(4);
}

copyBtn.addEventListener('click', () => {
    const address = userAddress.textContent;
    navigator.clipboard.writeText(address);
    copyBtn.textContent = '✅ Copied!';

    setTimeout(() => {
        copyBtn.textContent = '📋 Copy';
    }, 2000);
});

refreshBtn.addEventListener('click', async () => {
    userBalance.textContent = 'Refreshing...';

    await loadWalletInfo();
    await loadTransactionHistoryForCurrentAccount();

    refreshBtn.textContent = '✅ Refreshed!';

    setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh Balance';
    }, 2000);
});

estimateBtn.addEventListener('click', async () => {
    const to = toAddress.value;
    const amount = sendAmount.value;

    if (!to || !amount) {
        sendStatus.textContent = '❌ Fill in address and amount first!';
        sendStatus.className = 'error';
        return;
    }

    try {
        sendStatus.textContent = '⏳ Estimating gas...';

        const gasEstimated = await provider.estimateGas({
            to: to,
            value: ethers.utils.parseEther(amount)
        });

        const gasPrice = await provider.getGasPrice();
        const gasCost = gasEstimated.mul(gasPrice);
        const gasCostInEth = ethers.utils.formatEther(gasCost);
        const amountInEth = parseFloat(amount);
        const totalInEth = amountInEth + parseFloat(gasCostInEth);

        gasFee.textContent = parseFloat(gasCostInEth).toFixed(6);
        totalCost.textContent = totalInEth.toFixed(6);

        gasEstimate.classList.remove('hidden');
        sendStatus.textContent = '';
    } catch (error) {
        sendStatus.textContent = '❌ Estimation failed: ' + error.message;
        sendStatus.className = 'error';
    }
});

sendBtn.addEventListener('click', async () => {
    const to = toAddress.value;
    const amount = sendAmount.value;

    if (!to || !amount) {
        sendStatus.textContent = '❌ Please fill in all fields!';
        sendStatus.className = 'error';
        return;
    }

    try {
        sendStatus.textContent = '⏳ Submitting to mempool...';
        sendStatus.className = '';

        const tx = await signer.sendTransaction({
            to: to,
            value: ethers.utils.parseEther(amount)
        });

        sendStatus.textContent = '⏳ Transaction in mempool... Waiting for validators...';

        await tx.wait();

        const amountValue = parseFloat(amount).toFixed(6);
        addTransactionRecord(currentAccount, to, amountValue, tx.hash, 'confirmed');

        sendStatus.textContent = '✅ Transaction confirmed by validators!';
        sendStatus.className = 'success';

        await loadWalletInfo();
        await loadTransactionHistoryForCurrentAccount();

        gasEstimate.classList.add('hidden');

        toAddress.value = '';
        sendAmount.value = '';
    } catch (error) {
        sendStatus.textContent = '❌ Failed: ' + error.message;
        sendStatus.className = 'error';
    }
});

function getStoredHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveStoredHistory(history) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function normalizeAddress(address) {
    return (address || '').toLowerCase();
}

function getHistoryForAddress(address) {
    const history = getStoredHistory();
    return history[normalizeAddress(address)] || [];
}

function addTransactionRecord(fromAddress, toAddress, amount, hash, status = 'confirmed') {
    const history = getStoredHistory();

    const senderEntry = {
        hash,
        from: normalizeAddress(fromAddress),
        to: normalizeAddress(toAddress),
        amount,
        direction: 'sent',
        status,
        time: new Date().toLocaleString()
    };

    const receiverEntry = {
        hash,
        from: normalizeAddress(fromAddress),
        to: normalizeAddress(toAddress),
        amount,
        direction: 'received',
        status,
        time: new Date().toLocaleString()
    };

    const senderKey = normalizeAddress(fromAddress);
    const receiverKey = normalizeAddress(toAddress);

    history[senderKey] = [senderEntry, ...(history[senderKey] || [])].slice(0, 20);
    history[receiverKey] = [receiverEntry, ...(history[receiverKey] || [])].slice(0, 20);

    saveStoredHistory(history);

    if (currentAccount && normalizeAddress(currentAccount) === senderKey) {
        transactions = history[senderKey];
    } else if (currentAccount && normalizeAddress(currentAccount) === receiverKey) {
        transactions = history[receiverKey];
    } else {
        transactions = [];
    }

    updateTransactionList();
}

async function loadTransactionHistoryForCurrentAccount() {
    if (!currentAccount) {
        transactions = [];
        updateTransactionList();
        return;
    }

    transactions = getHistoryForAddress(currentAccount);
    updateTransactionList();
}

function updateTransactionList() {
    if (transactions.length === 0) {
        txList.innerHTML = 'No transactions yet';
        return;
    }

    txList.innerHTML = transactions.map((tx) => `
        <div class="tx-item">
            <p>${tx.direction === 'received' ? '📥 Received' : '📤 Sent'} <strong>${tx.amount} ETH</strong></p>
            <p>${tx.direction === 'received' ? 'From' : 'To'}: ${tx.direction === 'received' ? tx.from : tx.to}</p>
            <p>Hash: ${tx.hash.substring(0, 20)}...</p>
            <p>Status: ${tx.status}</p>
            <p>Time: ${tx.time}</p>
            <a href="https://sepolia.etherscan.io/tx/${tx.hash}" target="_blank" style="color: #A78BFA;">
                View on Etherscan 🔗
            </a>
        </div>
    `).join('');
}

disconnectBtn.addEventListener('click', () => {
    provider = null;
    signer = null;
    currentAccount = null;
    transactions = [];

    userAddress.textContent = '-';
    userBalance.textContent = '-';
    txList.innerHTML = 'No transactions yet';
    sendStatus.textContent = '';
    networkName.textContent = 'Not Connected';
    networkWarning.textContent = '';
    gasEstimate.classList.add('hidden');

    connectSection.classList.remove('hidden');
    accountSection.classList.add('hidden');
    sendSection.classList.add('hidden');
    historySection.classList.add('hidden');
});

window.ethereum?.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
        disconnectBtn.click();
    } else {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        await loadWalletInfo();
        await detectNetwork();
        await loadTransactionHistoryForCurrentAccount();
    }
});

window.ethereum?.on('chainChanged', async () => {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    await detectNetwork();
    await loadWalletInfo();
    await loadTransactionHistoryForCurrentAccount();
});