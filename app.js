// GET ETHERS FROM WINDOW
const { ethers } = window;

// GET ALL HTML ELEMENTS
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

// SECTIONS
const connectSection = document.getElementById('connect-section');
const accountSection = document.getElementById('account-section');
const sendSection = document.getElementById('send-section');
const historySection = document.getElementById('history-section');

// STORE PROVIDER AND SIGNER
let provider;
let signer;
let transactions = [];

// ─── CONNECT WALLET ───────────────────────────────────────
connectBtn.addEventListener('click', async () => {

    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        alert('MetaMask not found! Please install MetaMask.');
        return;
    }

    try {
        // Ask MetaMask to connect
        // This makes the MetaMask popup appear!
        await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        // Create provider
        // Provider = our connection to the blockchain
        // Like a phone line to Sepolia network
        provider = new ethers.providers.Web3Provider(window.ethereum);

        // Get signer
        // Signer = account that signs transactions
        // Uses private key (MetaMask does this securely)
        signer = provider.getSigner();

        // Load wallet info
        await loadWalletInfo();

        // Detect network
        await detectNetwork();

        // Show all sections
        connectSection.classList.add('hidden');
        accountSection.classList.remove('hidden');
        sendSection.classList.remove('hidden');
        historySection.classList.remove('hidden');

    } catch (error) {
        alert('Connection failed: ' + error.message);
    }
});

// ─── DETECT NETWORK ───────────────────────────────────────
async function detectNetwork() {

    // Get the network from blockchain
    // This queries the network's Chain ID
    // Remember: every blockchain has a unique Chain ID!
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // Check which network we're on
    // using Chain IDs we learned about!
    if (chainId === 11155111) {
        // Sepolia Chain ID = 11155111
        networkName.textContent = 'Sepolia Testnet ✅';
        networkName.style.color = '#10B981';
        networkWarning.textContent = 
        '✅ You are on the correct network!';
        networkWarning.className = 'success';

    } else if (chainId === 1) {
        // Ethereum Mainnet Chain ID = 1
        networkName.textContent = 'Ethereum Mainnet ⚠️';
        networkName.style.color = '#EF4444';
        networkWarning.textContent = 
        '⚠️ WARNING: You are on Mainnet! ' +
        'Switch to Sepolia to avoid spending real money!';
        networkWarning.className = 'error';

    } else {
        // Unknown network
        networkName.textContent = 
        'Unknown Network (Chain ID: ' + chainId + ')';
        networkName.style.color = '#F59E0B';
        networkWarning.textContent = 
        '⚠️ Unknown network detected!';
        networkWarning.className = 'error';
    }
}

// ─── LOAD WALLET INFO ─────────────────────────────────────
async function loadWalletInfo() {

    // Get wallet address
    // Reads the PUBLIC address from MetaMask
    const address = await signer.getAddress();

    // Get balance FROM the blockchain
    // This queries ALL nodes asking:
    // "how much ETH does this address have?"
    const balance = await provider.getBalance(address);

    // Convert from Wei to ETH
    // Remember: 1 ETH = 1,000,000,000,000,000,000 Wei
    const balanceInEth = ethers.utils.formatEther(balance);

    // Show on webpage
    userAddress.textContent = address;
    userBalance.textContent = 
    parseFloat(balanceInEth).toFixed(4);
}

// ─── COPY ADDRESS ─────────────────────────────────────────
copyBtn.addEventListener('click', () => {

    // Get address text
    const address = userAddress.textContent;

    // Copy to clipboard
    // Built-in browser feature
    navigator.clipboard.writeText(address);

    // Show feedback
    copyBtn.textContent = '✅ Copied!';

    // Reset after 2 seconds
    setTimeout(() => {
        copyBtn.textContent = '📋 Copy';
    }, 2000);
});

// ─── REFRESH BALANCE ──────────────────────────────────────
refreshBtn.addEventListener('click', async () => {

    // Show refreshing message
    userBalance.textContent = 'Refreshing...';

    // Query blockchain again for latest balance
    // This sends a fresh request to Sepolia nodes
    await loadWalletInfo();

    // Show feedback
    refreshBtn.textContent = '✅ Refreshed!';

    // Reset after 2 seconds
    setTimeout(() => {
        refreshBtn.textContent = '🔄 Refresh Balance';
    }, 2000);
});

// ─── ESTIMATE GAS FEE ─────────────────────────────────────
estimateBtn.addEventListener('click', async () => {

    const to = toAddress.value;
    const amount = sendAmount.value;

    // Validate inputs
    if (!to || !amount) {
        sendStatus.textContent = 
        '❌ Fill in address and amount first!';
        sendStatus.className = 'error';
        return;
    }

    try {
        sendStatus.textContent = '⏳ Estimating gas...';

        // ESTIMATE GAS
        // This asks the blockchain:
        // "how much gas will this transaction need?"
        // Remember: Gas = computational work needed!
        const gasEstimated = await provider.estimateGas({
            to: to,
            value: ethers.utils.parseEther(amount)
        });

        // GET CURRENT GAS PRICE
        // This checks current network demand
        // Remember: Gas Price changes with network congestion!
        const gasPrice = await provider.getGasPrice();

        // CALCULATE TOTAL GAS FEE
        // Remember our formula: Gas Used × Gas Price = Fee!
        const gasCost = gasEstimated.mul(gasPrice);

        // Convert to ETH for display
        const gasCostInEth = ethers.utils.formatEther(gasCost);
        const amountInEth = parseFloat(amount);
        const totalInEth = 
        amountInEth + parseFloat(gasCostInEth);

        // Show the estimate
        gasFee.textContent = 
        parseFloat(gasCostInEth).toFixed(6);
        totalCost.textContent = totalInEth.toFixed(6);

        // Show gas estimate box
        gasEstimate.classList.remove('hidden');
        sendStatus.textContent = '';

    } catch (error) {
        sendStatus.textContent = 
        '❌ Estimation failed: ' + error.message;
        sendStatus.className = 'error';
    }
});

// ─── SEND ETH ─────────────────────────────────────────────
sendBtn.addEventListener('click', async () => {

    const to = toAddress.value;
    const amount = sendAmount.value;

    if (!to || !amount) {
        sendStatus.textContent = 
        '❌ Please fill in all fields!';
        sendStatus.className = 'error';
        return;
    }

    try {
        // Show pending status
        sendStatus.textContent = 
        '⏳ Submitting to mempool...';
        sendStatus.className = '';

        // CREATE AND SIGN TRANSACTION
        // signer.sendTransaction:
        // 1. Creates the transaction
        // 2. Signs it with your PRIVATE KEY
        // 3. Sends it to the mempool
        // 4. Validators pick it up and confirm!
        const tx = await signer.sendTransaction({
            to: to,
            value: ethers.utils.parseEther(amount)
        });

        // Transaction is in mempool!
        sendStatus.textContent = 
        '⏳ Transaction in mempool... ' +
        'Waiting for validators...';

        // WAIT FOR CONFIRMATION
        // Validators on Sepolia are processing it!
        // Remember: validators pick highest gas fee first!
        await tx.wait();

        // Confirmed! 🎉
        sendStatus.textContent = 
        '✅ Transaction confirmed by validators!';
        sendStatus.className = 'success';

        // Add to history
        addTransaction(to, amount, tx.hash);

        // Update balance
        // Balance changed on blockchain
        // so we read it again!
        await loadWalletInfo();

        // Hide gas estimate box
        gasEstimate.classList.add('hidden');

        // Clear inputs
        toAddress.value = '';
        sendAmount.value = '';

    } catch (error) {
        sendStatus.textContent = 
        '❌ Failed: ' + error.message;
        sendStatus.className = 'error';
    }
});

// ─── ADD TRANSACTION TO HISTORY ───────────────────────────
function addTransaction(to, amount, hash) {

    // Add to transactions array
    transactions.unshift({
        to: to,
        amount: amount,
        hash: hash,
        time: new Date().toLocaleString()
    });

    // Update display
    updateTransactionList();
}

// ─── UPDATE TRANSACTION LIST ──────────────────────────────
function updateTransactionList() {

    if (transactions.length === 0) {
        txList.innerHTML = 'No transactions yet';
        return;
    }

    txList.innerHTML = transactions.map(tx => `
        <div class="tx-item">
            <p>📤 Sent <strong>${tx.amount} ETH</strong></p>
            <p>To: ${tx.to}</p>
            <p>Hash: ${tx.hash.substring(0, 20)}...</p>
            <p>Time: ${tx.time}</p>
            <a href="https://sepolia.etherscan.io/tx/${tx.hash}"
               target="_blank"
               style="color: #A78BFA;">
               View on Etherscan 🔗
            </a>
        </div>
    `).join('');
}

// ─── DISCONNECT WALLET ────────────────────────────────────
disconnectBtn.addEventListener('click', () => {

    // Reset everything
    provider = null;
    signer = null;
    transactions = [];
    userAddress.textContent = '-';
    userBalance.textContent = '-';
    txList.innerHTML = 'No transactions yet';
    sendStatus.textContent = '';
    networkName.textContent = 'Not Connected';
    networkWarning.textContent = '';
    gasEstimate.classList.add('hidden');

    // Show connect section
    connectSection.classList.remove('hidden');
    accountSection.classList.add('hidden');
    sendSection.classList.add('hidden');
    historySection.classList.add('hidden');
});

// ─── AUTO DETECT ACCOUNT/NETWORK CHANGE ──────────────────
// Listens for account changes in MetaMask
window.ethereum?.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
        disconnectBtn.click();
    } else {
        // Reload everything with new account
        provider = 
        new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        await loadWalletInfo();
        await detectNetwork();
    }
});

// Listens for network changes in MetaMask
window.ethereum?.on('chainChanged', async () => {
    // Reload provider when network changes
    provider = 
    new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    await detectNetwork();
    await loadWalletInfo();
});