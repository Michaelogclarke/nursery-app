const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  rooms: {
    getAll:                () => ipcRenderer.invoke('rooms:getAll'),
    getWithOccupancy:      () => ipcRenderer.invoke('rooms:getWithOccupancy'),
    getCalendarOccupancy:  (start, end) => ipcRenderer.invoke('rooms:getCalendarOccupancy', start, end),
  },
  rota: {
    getByDate:         (date)                    => ipcRenderer.invoke('rota:getByDate', date),
    getAvailableStaff: (date, shift)             => ipcRenderer.invoke('rota:getAvailableStaff', date, shift),
    assign:            (staffId, roomId, date, shift) => ipcRenderer.invoke('rota:assign', staffId, roomId, date, shift),
    unassign:          (entryId)                 => ipcRenderer.invoke('rota:unassign', entryId),
  },
  staff: {
    getAll:     ()         => ipcRenderer.invoke('staff:getAll'),
    getById:    (id)       => ipcRenderer.invoke('staff:getById', id),
    add:        (data)     => ipcRenderer.invoke('staff:add', data),
    update:     (id, data) => ipcRenderer.invoke('staff:update', id, data),
    deactivate: (id)       => ipcRenderer.invoke('staff:deactivate', id),
  },
  attendance: {
    getByDate: (date)        => ipcRenderer.invoke('attendance:getByDate', date),
    checkIn:   (childId, date) => ipcRenderer.invoke('attendance:checkIn', childId, date),
    checkOut:  (childId, date) => ipcRenderer.invoke('attendance:checkOut', childId, date),
  },
  children: {
    getAll:              ()                 => ipcRenderer.invoke('children:getAll'),
    getById:             (id)               => ipcRenderer.invoke('children:getById', id),
    add:                 (data)             => ipcRenderer.invoke('children:add', data),
    update:              (id, data)         => ipcRenderer.invoke('children:update', id, data),
    deactivate:          (id)               => ipcRenderer.invoke('children:deactivate', id),
    checkRoomCapacity:   (roomId, childId)  => ipcRenderer.invoke('children:checkRoomCapacity', roomId, childId),
    getAutoRoom:         (dob)              => ipcRenderer.invoke('children:getAutoRoom', dob),
    getGraceEligible:    ()                 => ipcRenderer.invoke('children:getGraceEligible'),
    moveToRoom:          (childId, roomId)  => ipcRenderer.invoke('children:moveToRoom', childId, roomId),
  },
})
