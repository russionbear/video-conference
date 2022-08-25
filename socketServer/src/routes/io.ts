import { Server } from "socket.io"


// const clients: Record<string,any> = {}
// const rooms: Record<string,any> = {}

interface UserInfoProps {
  socketId: string,
  username: string,
  roomTitle: string,
  video: boolean,
  audio: boolean
}

const USER_INFO: Record<string, UserInfoProps> = {}
const ROOM_INFO: Record<string, { key: string, ownername: string }> = {}

export const routesIo = (io: Server) => {
  io.on('connection', function (socket) {
    let query = socket.handshake.query
    let username = query.username
    let roomTitle = query.roomTitle
    let roomKey = query.roomKey

    if (Object.keys(USER_INFO).find(item => USER_INFO[item].username === username) !== undefined) {
      socket.disconnect(true)
      return
    }

    if (ROOM_INFO[roomTitle] === undefined) {
      ROOM_INFO[roomTitle] = {
        key: roomKey,
        ownername: username
      }
    } else if (ROOM_INFO[roomTitle].key !== roomKey || roomTitle === '' || username === '') {
      socket.disconnect(true)
      return
    }

    socket.join(roomTitle)
    USER_INFO[socket.id] = {
      socketId: socket.id,
      username,
      roomTitle,
      video: false,
      audio: false
    }

    socket.emit('joined', { ...USER_INFO, "": socket.id })
    socket.broadcast.to(roomTitle).emit('clients', USER_INFO)

    socket.on("ready", ({ from, video, audio }) => {
      USER_INFO[socket.id].video = video
      USER_INFO[socket.id].audio = audio
      io.sockets.in(roomTitle).emit('clients', USER_INFO)
      socket.broadcast.to(roomTitle).emit("ready", { userInfo: USER_INFO, updateSocketId: from })
    })

    socket.on("ice", (e: { from: string, to: string, data: any }) => {
      if (ROOM_INFO[roomTitle] !== undefined && e.from != ROOM_INFO[roomTitle].ownername &&
        e.to != ROOM_INFO[roomTitle].ownername) {
          return
      }
      socket.to(e.to).emit("ice", e)
    })

    // io.sockets.in(room).emit('clients', clients)
    socket.on('message', function (data) {
      data.time = (new Date).getTime() / 1000
      // socket.broadcast.to(roomTitle).emit('message', data) // expect self
      io.sockets.in(roomTitle).emit('message', data)
    })

    socket.on('disconnect', function () {
      delete USER_INFO[socket.id]
      // USER_INFO[socket.id] = undefined
      if (!Object.keys(USER_INFO).some(item => USER_INFO[item].roomTitle === roomTitle)) {
        delete ROOM_INFO[roomTitle]
      } else {
        io.sockets.in(roomTitle).emit('ready', { userInfo: USER_INFO, updateSocketId: socket.id, leave: true })
      }
    })

  })
}
