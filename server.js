const { ethers, Wallet, WebSocketProvider, JsonRpcProvider, Contract, Interface } = require('ethers');
require('dotenv').config();

// 🔧 1. ENHANCED CONFIGURATION
const CONFIG = {
    CHAIN_ID: 8453,
    TARGET_CONTRACT: "0x83EF5c401fAa5B9674BAfAcFb089b30bAc67C9A0",
    
    // ⚡ DUAL-LANE INFRASTRUCTURE
    WSS_URL: process.env.WSS_URL,          // For lightning-fast Listening
    RPC_URL: "https://mainnet.base.org",   // For stable Execution (Prevents 401/Closed errors)
    
    // 🏦 TRIANGLE NODES & ASSETS
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    CBETH: "0x2Ae3F1Ec7F1F5563a3d161649c025dac7e983970",
    
    // 🔮 ORACLES (The "Intelligence")
    GAS_ORACLE: "0x420000000000000000000000000000000000000F", // Base L1 Gas Oracle
    CHAINLINK_ETH_USD: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70", // Real-time Price
    
    // ⚙️ PERFORMANCE STRATEGY
    GAS_LIMIT: 1300000n, 
    PRIORITY_BRIBE: 15n, // 15% Tip to validators to be FIRST
    MARGIN_ETH: process.env.MARGIN_ETH || "0.015"
};

let currentEthPrice = 0;

async function startSniper() {
    console.log(`\n☠️ STARTING APEX OMNISCIENT [${new Date().toLocaleTimeString()}]`);

    // A. KEY SANITIZER (Fixes "Invalid Private Key" Error)
    const rawKey = process.env.TREASURY_PRIVATE_KEY;
    if (!rawKey) { console.error("❌ ERROR: Key missing from .env"); process.exit(1); }
    const cleanKey = rawKey.trim();

    try {
        // B. DUAL-PROVIDER SETUP
        const httpProvider = new JsonRpcProvider(CONFIG.RPC_URL);
        const wsProvider = new WebSocketProvider(CONFIG.WSS_URL);
        const signer = new Wallet(cleanKey, httpProvider);
        await wsProvider.ready;

        // C. ABIs & INTERFACES
        const gasOracle = new Contract(CONFIG.GAS_ORACLE, ["function getL1Fee(bytes) view returns (uint256)"], httpProvider);
        const ethPriceFeed = new Contract(CONFIG.CHAINLINK_ETH_USD, ["function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)"], httpProvider);
        const titanIface = new Interface(["function executeTriangle(address[],uint256)"]);

        console.log(`✅ TITAN ONLINE | SIGNER: ${signer.address}`);

        // D. PRICE TRACKER (Updates every block automatically)
        wsProvider.on("block", async (num) => {
            try {
                const [, priceData] = await ethPriceFeed.latestRoundData();
                currentEthPrice = Number(priceData) / 1e8;
                process.stdout.write(`\r⛓️ BLOCK: ${num} | ETH: $${currentEthPrice.toFixed(2)} | Sniper Scanning... `);
            } catch (e) { /* silent */ }
        });

        // E. TRIANGULAR SNIPER LOOP
        const swapTopic = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)");
        wsProvider.on({ topics: [swapTopic] }, async (log) => {
            try {
                // 1. DYNAMIC LOAN SCALING
                const balance = await httpProvider.getBalance(signer.address);
                const loanAmount = balance > ethers.parseEther("0.1") ? ethers.parseEther("100") : ethers.parseEther("25");

                const paths = [
                    [CONFIG.WETH, CONFIG.USDC, CONFIG.CBETH, CONFIG.WETH],
                    [CONFIG.WETH, CONFIG.CBETH, CONFIG.USDC, CONFIG.WETH]
                ];

                for (const path of paths) {
                    const strikeData = titanIface.encodeFunctionData("executeTriangle", [path, loanAmount]);

                    // 2. OMNISCIENT COST CALCULATION (L1 Data Fee + L2 Gas + Aave 0.05%)
                    const [simulation, l1Fee, feeData] = await Promise.all([
                        httpProvider.call({ to: CONFIG.TARGET_CONTRACT, data: strikeData, from: signer.address }).catch(() => null),
                        gasOracle.getL1Fee(strikeData).catch(() => 0n),
                        httpProvider.getFeeData()
                    ]);

                    if (!simulation) continue;

                    // Aave V3 Fee: 0.05%
                    const aaveFee = (loanAmount * 5n) / 10000n;
                    const aggressivePriority = (feeData.maxPriorityFeePerGas * (100n + CONFIG.PRIORITY_BRIBE)) / 100n;
                    const totalCost = (CONFIG.GAS_LIMIT * feeData.maxFeePerGas) + l1Fee + aaveFee;
                    const netProfit = BigInt(simulation) - totalCost;

                    // 3. STRIKE DECISION
                    if (netProfit > ethers.parseEther(CONFIG.MARGIN_ETH)) {
                        const profitUSD = parseFloat(ethers.formatEther(netProfit)) * currentEthPrice;
                        console.log(`\n💎 TRIANGLE HIT! Net: ${ethers.formatEther(netProfit)} ETH (~$${profitUSD.toFixed(2)})`);
                        
                        const tx = await signer.sendTransaction({
                            to: CONFIG.TARGET_CONTRACT,
                            data: strikeData,
                            gasLimit: CONFIG.GAS_LIMIT,
                            maxFeePerGas: feeData.maxFeePerGas,
                            maxPriorityFeePerGas: aggressivePriority, // Bribe to be FIRST
                            type: 2
                        });
                        console.log(`🚀 STRIKE FIRED: ${tx.hash}`);
                        break; 
                    }
                }
            } catch (e) {}
        });

        // F. IMMORTALITY PROTOCOL
        wsProvider.websocket.onclose = () => {
            console.warn("\n⚠️ CONNECTION LOST. REBOOTING...");
            process.exit(1); // PM2 will restart instantly
        };

    } catch (err) {
        console.error("❌ STARTUP ERROR:", err.message);
        setTimeout(startSniper, 1000);
    }
}

startSniper();
