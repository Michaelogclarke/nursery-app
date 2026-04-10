const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  rooms: {
    getAll:            () => ipcRenderer.invoke('rooms:getAll'),
    getWithOccupancy:  () => ipcRenderer.invoke('rooms:getWithOccupancy'),
  },
  attendance: {
    getByDate: (date)        => ipcRenderer.invoke('attendance:getByDate', date),
    checkIn:   (childId, date) => ipcRenderer.invoke('attendance:checkIn', childId, date),
    checkOut:  (childId, date) => ipcRenderer.invoke('attendance:checkOut', childId, date),
  },
  children: {
    getAll:      ()        => ipcRenderer.invoke('children:getAll'),
    getById:     (id)      => ipcRenderer.invoke('children:getById', id),
    add:         (data)    => ipcRenderer.invoke('children:add', data),
    update:      (id, data)=> ipcRenderer.invoke('children:update', id, data),
    deactivate:  (id)      => ipcRenderer.invoke('children:deactivate', id),
  },
})
