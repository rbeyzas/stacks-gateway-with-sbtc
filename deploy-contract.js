#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const {
  makeContractDeploy,
  broadcastTransaction,
  getAddressFromPrivateKey,
  TransactionVersion,
  AnchorMode,
} = require('@stacks/transactions');
const fs = require('fs');
const path = require('path');

// Configuration
const NETWORK = process.env.STACKS_NETWORK || 'testnet';
const PRIVATE_KEY = process.env.STACKS_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ STACKS_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Network setup
const networkConfig =
  NETWORK === 'mainnet'
    ? {
        url: 'https://api.stacks.co',
        network: 'mainnet',
        transactionVersion: 0x00,
        coreApiUrl: 'https://api.stacks.co',
      }
    : {
        url: 'https://api.testnet.stacks.co',
        network: 'testnet',
        transactionVersion: 0x80,
        coreApiUrl: 'https://api.testnet.stacks.co',
      };

// Get contract source
const contractPath = path.join(__dirname, 'contracts', 'custom-sbtc-token.clar');
const contractSource = fs.readFileSync(contractPath, 'utf8');

// Get deployer address - use the address from keychain generation
const deployerAddress = 'ST21XV7WHC8WT5NKD6ZEWWSD9P2RG6BPXS2JGHYKP'; // From keychain generation

console.log(`🚀 Deploying custom sBTC token contract...`);
console.log(`📡 Network: ${NETWORK}`);
console.log(`👤 Deployer: ${deployerAddress}`);

async function deployContract() {
  try {
    // Create contract deployment transaction
    const txOptions = {
      contractName: 'custom-sbtc-token',
      codeBody: contractSource,
      senderKey: PRIVATE_KEY,
      network: networkConfig,
      anchorMode: AnchorMode.Any,
    };

    const transaction = await makeContractDeploy(txOptions);

    console.log(`📝 Transaction created: ${transaction.txid()}`);

    // Broadcast transaction
    const result = await broadcastTransaction(transaction, networkConfig);

    if (result.error) {
      console.error('❌ Deployment failed:', result.error);
      process.exit(1);
    }

    console.log('✅ Contract deployment successful!');
    console.log(`🔗 Transaction ID: ${result.txid}`);
    console.log(`📍 Contract Address: ${deployerAddress}.custom-sbtc-token`);
    console.log(`🌐 Explorer: https://explorer.stacks.co/txid/${result.txid}?chain=${NETWORK}`);

    // Save contract address to .env file
    const envContent = `# Custom sBTC Token Contract
CUSTOM_SBTC_TOKEN_CONTRACT=${deployerAddress}.custom-sbtc-token
CUSTOM_SBTC_DEPLOYER=${deployerAddress}
CUSTOM_SBTC_TXID=${result.txid}
`;

    fs.appendFileSync('.env', envContent);
    console.log('💾 Contract address saved to .env file');
  } catch (error) {
    console.error('❌ Deployment error:', error);
    process.exit(1);
  }
}

deployContract();
