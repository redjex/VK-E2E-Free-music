// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tokenAPI', {
    saveToken: (token) => ipcRenderer.invoke('save-token', token),
    loadToken: () => ipcRenderer.invoke('load-token'),
    deleteToken: () => ipcRenderer.invoke('delete-token'),
    openAuth: () => ipcRenderer.send('open-auth')
});

contextBridge.exposeInMainWorld('vkAPI', {
    getUserId: (token) => ipcRenderer.invoke('vk-get-user-id', token),
    getAudio: (token, userId) => ipcRenderer.invoke('vk-get-audio', token, userId),
    getRecommendations: (token) => ipcRenderer.invoke('vk-get-recommendations', token),
    searchAudio: (token, query) => ipcRenderer.invoke('vk-search-audio', token, query),
    addAudio: (token, ownerId, audioId) => ipcRenderer.invoke('vk-add-audio', token, ownerId, audioId),
    deleteAudio: (token, ownerId, audioId) => ipcRenderer.invoke('vk-delete-audio', token, ownerId, audioId)
});