const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  rooms: {
    getAll: () => ipcRenderer.invoke('rooms:getAll'),
  },
  children: {
    getAll:      ()        => ipcRenderer.invoke('children:getAll'),
    getById:     (id)      => ipcRenderer.invoke('children:getById', id),
    add:         (data)    => ipcRenderer.invoke('children:add', data),
    update:      (id, data)=> ipcRenderer.invoke('children:update', id, data),
    deactivate:  (id)      => ipcRenderer.invoke('children:deactivate', id),
  },
})
