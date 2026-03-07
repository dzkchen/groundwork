#!/usr/bin/env node
/**
 * Generate a keypair for FEE_PAYER_PRIVATE_KEY. Run from app/groundwork:
 *   node scripts/gen-fee-payer.js
 * Then add the output to .env.local and fund the printed address with a little SOL (devnet faucet or mainnet).
 */
const { Keypair } = require("@solana/web3.js");

const kp = Keypair.generate();
const arr = Array.from(kp.secretKey);

console.log("\nAdd this to .env.local (and to Vercel env for production):\n");
console.log("FEE_PAYER_PRIVATE_KEY=" + JSON.stringify(arr));
console.log("\nFund this address with a little SOL (fee payer pays tx fees for users):\n");
console.log(kp.publicKey.toBase58());
console.log("");
