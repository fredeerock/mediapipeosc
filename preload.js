const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  sendOSC: (data) => {
    ipcRenderer.send('send-osc', data);
  },
  
  updateOSCConfig: (config) => {
    ipcRenderer.send('update-osc-config', config);
  },
  
  getOSCConfig: () => {
    ipcRenderer.send('get-osc-config');
  },
  
  onOSCConfig: (callback) => {
    ipcRenderer.on('osc-config', (event, config) => callback(config));
  },
  
  onOSCConfigUpdated: (callback) => {
    ipcRenderer.on('osc-config-updated', (event, config) => callback(config));
  }
});
