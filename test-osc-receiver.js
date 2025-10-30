#!/usr/bin/env node

/**
 * OSC Receiver Test Script
 * 
 * Run this to test if OSC messages are being sent correctly
 * This listens on port 8000 and prints received OSC messages
 * 
 * Usage: node test-osc-receiver.js
 */

const osc = require('osc');

console.log('╔════════════════════════════════════════╗');
console.log('║   OSC Receiver Test                    ║');
console.log('╚════════════════════════════════════════╝\n');

const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 8000,
    metadata: true
});

let messageCount = 0;
let lastPrintTime = Date.now();
let messagesPerSecond = 0;

udpPort.on('ready', () => {
    console.log('✅ OSC Receiver ready');
    console.log(`📡 Listening on port 8000`);
    console.log(`⏱️  Waiting for messages...\n`);
    console.log('───────────────────────────────────────\n');
});

udpPort.on('message', (oscMsg) => {
    messageCount++;
    
    // Print every 100th message to avoid spam
    if (messageCount % 100 === 0) {
        const now = Date.now();
        const elapsed = (now - lastPrintTime) / 1000;
        messagesPerSecond = Math.round(100 / elapsed);
        lastPrintTime = now;
        
        console.log(`📨 Message #${messageCount}`);
        console.log(`   Address: ${oscMsg.address}`);
        console.log(`   Args: ${oscMsg.args.map(a => a.value.toFixed(3)).join(', ')}`);
        console.log(`   Rate: ~${messagesPerSecond} msg/sec\n`);
    }
    
    // Print summary every 1000 messages
    if (messageCount % 1000 === 0) {
        console.log('───────────────────────────────────────');
        console.log(`✨ Total messages received: ${messageCount}`);
        console.log('───────────────────────────────────────\n');
    }
});

udpPort.on('error', (err) => {
    console.error('❌ Error:', err);
});

udpPort.open();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n───────────────────────────────────────');
    console.log(`📊 Final Stats:`);
    console.log(`   Total messages: ${messageCount}`);
    console.log(`   Average rate: ${messagesPerSecond} msg/sec`);
    console.log('───────────────────────────────────────');
    console.log('\n👋 OSC Receiver stopped');
    udpPort.close();
    process.exit(0);
});

console.log('💡 Tip: Start the Electron app and begin tracking');
console.log('💡 Press Ctrl+C to stop this receiver\n');
