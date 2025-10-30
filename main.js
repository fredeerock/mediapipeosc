const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const osc = require('osc');

let mainWindow;
let udpPort;

// OSC Configuration
const OSC_CONFIG = {
  localAddress: '0.0.0.0',
  localPort: 57121,
  remoteAddress: '127.0.0.1',
  remotePort: 8000,
  metadata: true
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

function setupOSC() {
  udpPort = new osc.UDPPort({
    localAddress: OSC_CONFIG.localAddress,
    localPort: OSC_CONFIG.localPort,
    remoteAddress: OSC_CONFIG.remoteAddress,
    remotePort: OSC_CONFIG.remotePort,
    metadata: true
  });

  udpPort.on('ready', () => {
    console.log(`OSC ready. Listening on port ${OSC_CONFIG.localPort}`);
    console.log(`Sending to ${OSC_CONFIG.remoteAddress}:${OSC_CONFIG.remotePort}`);
  });

  udpPort.on('error', (err) => {
    console.error('OSC Error:', err);
  });

  udpPort.open();
}

// Handle OSC messages from renderer process
ipcMain.on('send-osc', (event, { address, args }) => {
  if (udpPort) {
    udpPort.send({
      address: address,
      args: args
    });
  }
});

// Handle OSC configuration updates
ipcMain.on('update-osc-config', (event, config) => {
  OSC_CONFIG.remoteAddress = config.remoteAddress || OSC_CONFIG.remoteAddress;
  OSC_CONFIG.remotePort = config.remotePort || OSC_CONFIG.remotePort;
  
  if (udpPort) {
    udpPort.close();
  }
  setupOSC();
  
  event.reply('osc-config-updated', OSC_CONFIG);
});

// Get current OSC configuration
ipcMain.on('get-osc-config', (event) => {
  event.reply('osc-config', OSC_CONFIG);
});

app.whenReady().then(() => {
  createWindow();
  setupOSC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (udpPort) {
    udpPort.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
