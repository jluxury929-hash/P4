/**
 * ===============================================================================
 * APEX MASTER v39.1 (QUANTUM TRIANGLE SINGULARITY) - FINAL REPAIR BUILD
 * ===============================================================================
 * DNA: DUAL-VECTOR (WHALE + TRIANGLE) + NUCLEAR BRIBE + AI HEALING
 * PROTECTION: 48-CORE STAGGERED CLUSTER | MULTI-RPC FALLBACK | L1 GAS AWARE
 * ===============================================================================
 */

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const axios = require('axios');
const { 
    ethers, JsonRpcProvider, Wallet, Interface, parseEther, 
    formatEther, Contract, FallbackProvider, WebSocketProvider, AbiCoder 
} = require('ethers');
require('dotenv').config();

// --- DEPENDENCY CHECK ---
let FlashbotsBundleProvider;
let hasFlashbots = false;
try {
    ({ FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle'));
    hasFlashbots = true;
} catch (e) {
    if (cluster.isPrimary) console.log("\x1b[33m%s\x1b[0m", "⚠️  NOTICE: Flashbots missing. Using multi-channel atomic injection fallback.");
}

// --- AI CONFIGURATION ---
const apiKey = process.env.GEMINI_API_KEY || ""; 
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
let lastAiCorrection = Date.now();

const TXT = {
    reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m", 
    cyan: "\x1b[36m", yellow: "\x1b[33m", red: "\x1b[31m", 
    gold: "\x1b[38;5;220m", magenta: "\x1b[35m"
};

// --- GLOBAL CONFIGURATION ---
const GLOBAL_CONFIG = {
    TARGET_CONTRACT: process.env.TARGET_CONTRACT || "0x83EF5c401fAa5B9674BAfAcFb089b30bAc67C9A0", 
    BENEFICIARY: "0x35c3ECfFBBDd942a8DbA7587424b58f74d6d6d15",
    WHALE_THRESHOLD: parseEther("15.0"), 
    MIN_LOG_ETH: parseEther("10.0"),      
    MARGIN_ETH: "0.015", 
    MIN_PROFIT_BUFFER: "0.005",
    GAS_LIMIT: 1300000n, 
    PORT: 8080,
    TUNABLES: { MAX_BRIBE_PERCENT: 99.9, GAS_PRIORITY_FEE: 1000, GAS_BUFFER_MULT: 1.8 },
    RPC_POOL: [
        "https://base.merkle.io",
        "https://mainnet.base.org",
        "https://base.llamarpc.com",
        "https://1rpc.io/base"
    ],
    NETWORKS: [
        { 
            name: "BASE_L2", chainId: 8453, 
            wss: process.env.BASE_WSS || "wss://base-rpc.publicnode.com", 
            privateRpc: "https://base.merkle.io",
            color: TXT.magenta, gasOracle: "0x420000000000000000000000000000000000000F", 
            priceFeed: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", 
            router: "0x2626664c2603336E57B271c5C0b26F421741e481",
            weth: "0x4200000000000000000000000000000000000006",
            usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            cbeth: "0x2Ae3F1Ec7F1F5563a3d161649c025dac7e983970",
            aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
        }
    ]
};

// --- MASTER PROCESS ---
if (cluster.isPrimary) {
    console.clear();
    console.log(`${TXT.gold}╔════════════════════════════════════════════════════════╗`);
    console.log(`║   ⚡ APEX TRIANGLE MASTER | QUANTUM SINGULARITY v39.1║`);
    console.log(`║   DNA: WHALE HUNTER + TRIANGULAR SNIPER (v23.2)     ║`);
    console.log(`╚════════════════════════════════════════════════════════╝${TXT.reset}\n`);

    const nonces = {};
    const cpuCount = Math.min(os.cpus().length, 48);
    
    for (let i = 0; i < cpuCount; i++) {
        setTimeout(() => {
            const worker = cluster.fork();
            worker.on('message', (msg) => {
                if (msg.type === 'SYNC_RESERVE') {
                    if (!nonces[msg.chainId] || msg.nonce > nonces[msg.chainId]) nonces[msg.chainId] = msg.nonce;
                    worker.send({ type: 'SYNC_GRANT', nonce: nonces[msg.chainId], chainId: msg.chainId, reqId: msg.reqId });
                    nonces[msg.chainId]++;
                }
                if (msg.type === 'SIGNAL') Object.values(cluster.workers).forEach(w => w.send(msg));
            });
        }, i * 1500); // 1.5s Stagger to prevent handshake 503s
    }
} else {
    // --- WORKER CORE ---
    const networkIndex = (cluster.worker.id - 1) % GLOBAL_CONFIG.NETWORKS.length;
    initWorker(GLOBAL_CONFIG.NETWORKS[networkIndex]);
}

async function initWorker(CHAIN) {
    const network = ethers.Network.from(CHAIN.chainId);
    const provider = new FallbackProvider(GLOBAL_CONFIG.RPC_POOL.map((url, i) => ({
        provider: new JsonRpcProvider(url, network, { staticNetwork: true }),
        priority: i + 1, stallTimeout: 1000
    })), network, { quorum: 1 });

    const wallet = new Wallet(process.env.TREASURY_PRIVATE_KEY.trim(), provider);
    const titanIface = new Interface([
        "function flashLoanSimple(address receiver, address asset, uint256 amount, bytes params, uint16 referral)",
        "function executeTriangle(address[] path, uint256 amount)"
    ]);
    const l1Oracle = CHAIN.gasOracle ? new Contract(CHAIN.gasOracle, ["function getL1Fee(bytes) view returns (uint256)"], provider) : null;
    const priceFeed = new Contract(CHAIN.priceFeed, ["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"], provider);
    
    const ROLE = (cluster.worker.id % 4 === 0) ? "LISTENER" : (cluster.worker.id % 4 === 3 ? "ANALYST" : "STRIKER");
    const TAG = `${CHAIN.color}[${CHAIN.name}-${ROLE}]${TXT.reset}`;

    let currentEthPrice = 0;

    // v18.1 Health Monitoring
    try {
        http.createServer((req, res) => {
            if (req.url === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: "ACTIVE", role: ROLE, chain: CHAIN.name, mode: "DUAL_VECTOR" }));
            }
        }).listen(GLOBAL_CONFIG.PORT + cluster.worker.id);
    } catch (e) {}

    async function connect() {
        try {
            const ws = new WebSocketProvider(CHAIN.wss, network);
            ws.on('error', (e) => { if (e.message && e.message.includes("429")) return; });
            
            if (ROLE === "ANALYST") {
                const updatePrice = async () => { try { const [, p] = await priceFeed.latestRoundData(); currentEthPrice = Number(p) / 1e8; } catch (e) {} };
                await updatePrice(); setInterval(updatePrice, 20000);
            }

            if (ROLE === "LISTENER") {
                // VECTOR A: Pending Mempool Detection
                ws.on("pending", async (txH) => {
                    const tx = await provider.getTransaction(txH).catch(() => null);
                    if (tx && tx.to && tx.value >= GLOBAL_CONFIG.WHALE_THRESHOLD && tx.to.toLowerCase() === CHAIN.router.toLowerCase()) {
                        process.send({ type: 'SIGNAL', chainId: CHAIN.chainId });
                    }
                });

                // VECTOR B: Mid-Block Log Decoding (Leviathan)
                const swapTopic = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)");
                ws.on({ topics: [swapTopic] }, (log) => {
                    const decoded = AbiCoder.defaultAbiCoder().decode(["uint256", "uint256", "uint256", "uint256"], log.data);
                    if (decoded.some(val => val >= GLOBAL_CONFIG.MIN_LOG_ETH)) {
                         process.send({ type: 'SIGNAL', chainId: CHAIN.chainId });
                    }
                });

                ws.on('block', (bn) => {
                    process.send({ type: 'SIGNAL', chainId: CHAIN.chainId });
                    process.stdout.write(`\r${TAG} ⚡ BLOCK #${bn} | Dual-Vector Hunting: ON ${TXT.reset}`);
                });
            } else if (ROLE === "STRIKER") {
                process.on('message', async (msg) => {
                    if (msg.type === 'SIGNAL' && msg.chainId === CHAIN.chainId) {
                        await attemptStrike(provider, wallet, titanIface, l1Oracle, currentEthPrice, CHAIN, "OMNISCIENT");
                        await attemptTriangleStrike(provider, wallet, titanIface, l1Oracle, currentEthPrice, CHAIN);
                    }
                });
            }
        } catch (e) { setTimeout(connect, 5000); }
    }
    connect();
}

async function attemptStrike(provider, wallet, iface, oracle, ethPrice, CHAIN, mode) {
    try {
        const balance = await provider.getBalance(wallet.address);
        const loanAmount = parseFloat(formatEther(balance)) > 0.1 ? parseEther("100") : parseEther("25");
        const data = iface.encodeFunctionData("flashLoanSimple", [GLOBAL_CONFIG.TARGET_CONTRACT, CHAIN.weth, loanAmount, "0x", 0]);
        await executeUnifiedStrike(provider, wallet, data, loanAmount, oracle, ethPrice, CHAIN, mode);
    } catch (e) {}
}

async function attemptTriangleStrike(provider, wallet, iface, oracle, ethPrice, CHAIN) {
    try {
        const loanAmount = parseEther("25"); 
        const paths = [
            [CHAIN.weth, CHAIN.usdc, CHAIN.cbeth, CHAIN.weth],
            [CHAIN.weth, CHAIN.cbeth, CHAIN.usdc, CHAIN.weth]
        ];
        for (const path of paths) {
            const data = iface.encodeFunctionData("executeTriangle", [path, loanAmount]);
            const hit = await executeUnifiedStrike(provider, wallet, data, loanAmount, oracle, ethPrice, CHAIN, "TRIANGLE");
            if (hit) break;
        }
    } catch (e) {}
}

async function executeUnifiedStrike(provider, wallet, data, loanAmount, oracle, ethPrice, CHAIN, mode) {
    try {
        const reqId = Math.random();
        const state = await new Promise(res => {
            const h = m => { if(m.reqId === reqId) { process.removeListener('message', h); res(m); }};
            process.on('message', h);
            process.send({ type: 'SYNC_RESERVE', chainId: CHAIN.chainId, reqId });
        });

        const [sim, l1Fee, feeData] = await Promise.all([
            provider.call({ to: GLOBAL_CONFIG.TARGET_CONTRACT, data: data, from: wallet.address, gasLimit: GLOBAL_CONFIG.GAS_LIMIT }).catch(() => "0x"),
            oracle ? oracle.getL1Fee(data).catch(() => 0n) : 0n,
            provider.getFeeData()
        ]);

        if (sim === "0x" || BigInt(sim) === 0n) return false;

        const baseFee = feeData.maxFeePerGas || feeData.gasPrice || parseEther("0.1", "gwei");
        const priority = parseEther(GLOBAL_CONFIG.TUNABLES.GAS_PRIORITY_FEE.toString(), "gwei");
        const aaveFee = (loanAmount * 5n) / 10000n;
        const totalThreshold = (GLOBAL_CONFIG.GAS_LIMIT * (baseFee + priority)) + l1Fee + aaveFee + parseEther(GLOBAL_CONFIG.MARGIN_ETH) + parseEther(GLOBAL_CONFIG.MIN_PROFIT_BUFFER);

        if (BigInt(sim) > totalThreshold) {
            const netProfit = BigInt(sim) - (totalThreshold - parseEther(GLOBAL_CONFIG.MARGIN_ETH) - parseEther(GLOBAL_CONFIG.MIN_PROFIT_BUFFER));
            console.log(`\n${TXT.green}${TXT.bold}💎 ${mode} STRIKE: +${formatEther(netProfit)} ETH (~$${(parseFloat(formatEther(netProfit)) * ethPrice).toFixed(2)})${TXT.reset}`);

            const tx = {
                to: GLOBAL_CONFIG.TARGET_CONTRACT, data: data, type: 2, chainId: CHAIN.chainId,
                maxFeePerGas: baseFee + priority, maxPriorityFeePerGas: priority,
                gasLimit: GLOBAL_CONFIG.GAS_LIMIT, nonce: state.nonce
            };

            const signedHex = await wallet.signTransaction(tx);
            const endpoint = CHAIN.privateRpc || CHAIN.rpc;
            axios.post(endpoint, { jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: [signedHex] }).catch(() => {});
            GLOBAL_CONFIG.RPC_POOL.forEach(url => axios.post(url, { jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: [signedHex] }).catch(() => {}));
            return true;
        }
    } catch (e) { if (e.message.includes("nonce")) askAiForOptimization("Nonce collision"); }
    return false;
}
