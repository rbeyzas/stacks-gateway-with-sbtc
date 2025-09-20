#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env file to get deployed contract address
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Extract contract address from .env
const contractMatch = envContent.match(/CUSTOM_SBTC_TOKEN_CONTRACT=(.+)/);
if (!contractMatch) {
  console.error('❌ Contract address not found in .env file');
  console.log('Please deploy contract first with: npm run deploy:testnet');
  process.exit(1);
}

const contractAddress = contractMatch[1];
console.log(`📍 Using contract address: ${contractAddress}`);

// Update StacksService.ts
const stacksServicePath = path.join(__dirname, 'backend/src/services/StacksService.ts');
let stacksServiceContent = fs.readFileSync(stacksServicePath, 'utf8');

// Update testnet contract address
stacksServiceContent = stacksServiceContent.replace(
  /'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT\.sbtc-token'/g,
  `'${contractAddress}'`,
);

fs.writeFileSync(stacksServicePath, stacksServiceContent);
console.log('✅ Updated StacksService.ts with new contract address');

// Update widget contract address
const widgetPath = path.join(__dirname, 'widget/src/components/WalletConnector.ts');
let widgetContent = fs.readFileSync(widgetPath, 'utf8');

// Extract just the address part (without .contract-name)
const [address, contractName] = contractAddress.split('.');
widgetContent = widgetContent.replace(
  /const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';/g,
  `const contractAddress = '${address}';`,
);

fs.writeFileSync(widgetPath, widgetContent);
console.log('✅ Updated WalletConnector.ts with new contract address');

// Update Clar files
const escrowPath = path.join(__dirname, 'contracts/stacksgate-escrow.clar');
let escrowContent = fs.readFileSync(escrowPath, 'utf8');

escrowContent = escrowContent.replace(
  /\(define-constant SBTC_TOKEN 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT\.sbtc-token\)/g,
  `(define-constant SBTC_TOKEN '${contractAddress})`,
);

fs.writeFileSync(escrowPath, escrowContent);
console.log('✅ Updated stacksgate-escrow.clar with new contract address');

const paymentPath = path.join(__dirname, 'contracts/stacksgate-payment.clar');
let paymentContent = fs.readFileSync(paymentPath, 'utf8');

paymentContent = paymentContent.replace(
  /\(define-constant SBTC_TOKEN 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT\.sbtc-token\)/g,
  `(define-constant SBTC_TOKEN '${contractAddress})`,
);

fs.writeFileSync(paymentPath, paymentContent);
console.log('✅ Updated stacksgate-payment.clar with new contract address');

console.log('\n🎉 All files updated successfully!');
console.log(`📍 Your custom sBTC contract: ${contractAddress}`);
console.log('🔗 Check it on Stacks Explorer: https://explorer.stacks.co/');
