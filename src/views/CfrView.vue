<template>
  <div class="container">
    <!-- <audio ref="audio_ref"></audio> -->
    <el-scrollbar>
      <ul class="infinite-list video-list" :style="{ columns: IS_PHONE ? 1 : 3 }">
        <video v-for="item in remote_video" :key="item.socketId"
          :hidden="item.stream === null || item.stream.getVideoTracks().length === 0" :width="video_layout.videoW"
          :height="video_layout.videoH" :ref="set_dom_ref" :data-ref="item.socketId" @click="handle_autoplay" autoplay
          controls :title="clients[item.socketId].username"></video>
        <video :width="video_layout.videoW" :height="video_layout.videoH" v-if="local_video.localStream !== null"
          :hidden="local_video.localStream.getVideoTracks().length === 0" :ref="set_dom_ref" data-ref="" autoplay muted
          controls title="self"></video>
      </ul>
    </el-scrollbar>
  </div>

  <div class="message">
    <header>{{ message_view.room_title }}</header>
    <el-tabs v-model="message_view.state" class="demo-tabs">
      <el-tab-pane label="chat" name="chat">
        <el-scrollbar :height="message_view.scroll_height + 'px'">
          <ul class="infinite-list">
            <li v-for="i in message_view.messages" :key="i.time" class="infinite-list-item">
              {{ i.from }}：{{ i.msg }}
            </li>
          </ul>
        </el-scrollbar>
      </el-tab-pane>
      <el-tab-pane label="clients" name="clients">
        <el-scrollbar :height="message_view.scroll_height + 'px'">
          <ul class="infinite-list">
            <li v-for="i of clients" :key="i.socketId" class="infinite-list-item">{{ i.username }}</li>
          </ul>
        </el-scrollbar>
      </el-tab-pane>
    </el-tabs>
  </div>

  <el-input class="opra" v-model="opra_bar.message" placeholder="send message">
    <template #prepend>

      <el-button type="primary" @click="share_dialog.show = true">setting</el-button>
      <!-- <el-space>

        <el-button type="primary" @click="share_dialog.show = true">setting</el-button>
        <el-button type="primary" @click="handle_mirror">mirror</el-button>
      </el-space> -->
      <!-- <el-button type="primary" @click="handle_show_set">set</el-button> -->
    </template>
    <template #append>
      <el-button type="primary" @click="handle_send">send</el-button>
    </template>
  </el-input>

  <el-dialog v-model="share_dialog.show" title="share setting">
    <el-switch v-model="share_dialog.v_audio_open" class="ml-2" inline-prompt
      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949" active-text="audio" inactive-text="" />
    <el-switch v-model="share_dialog.v_video_open" class="ml-2" inline-prompt
      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949" active-text="video" inactive-text="" />
    <el-switch :disabled="!share_dialog.v_video_open" v-model="share_dialog.v_is_share" class="ml-2" inline-prompt
      style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949" active-text="share"
      inactive-text="camera" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handle_share_close">Cancel</el-button>
        <el-button type="primary" @click="handle_share_sure">Confirm</el-button>
      </span>
    </template>
  </el-dialog>
  <!-- <el-dialog v-model="big_dialog.show" :title="big_dialog.title" :fullscreen="true">
    <video :ref="set_dom_ref" data-ref="big-share" autoplay muted></video>
  </el-dialog> -->
</template>

<script lang="ts" setup>

import io from '@/plugins/io';
import { onMounted, reactive, Ref, ref } from 'vue';
// import { PeerConnection } from '@/config/ice';
import { SocketUrl } from "@/config/socket"
import { useRouter } from 'vue-router';
import { IS_PHONE } from "@/config/platform"
import store from '@/store';
import { ElMessage } from 'element-plus';

// import { ElMessage } from 'element-plus';

const PeerConnection = ref(undefined)
const router = useRouter()
// const refresh = ref(true)


const video_layout = reactive({
  videoH: 400,
  videoW: 400
})

const pc_cache = reactive<Record<string, RTCPeerConnection>>({})

const clients = ref<
  Record<string, {
    username: string, socketId: string, video: boolean, audio: boolean
  }>
>({})


const set_dom_ref = (el: HTMLVideoElement) => {
  if (!el) {
    return
  }
  let user_id = el.dataset['ref'] as string

  if (user_id === "big-share") {
    share_dialog.ref = el
    el.srcObject = share_dialog.stream
    return
  }
  else if (user_id === '') {
    local_video.ref = el
    el.srcObject = local_video.localStream
  }

  let pc_node = remote_video.find(item => item.socketId === user_id)
  if (pc_node === undefined) {
    return
  }

  pc_node.ref = el
  el.srcObject = pc_node.stream
  el.play()
}

const handle_autoplay = () => {
  for (let i of remote_video) {
    if (i.ref !== null && i.ref.paused) {
      i.ref.play()
    }
  }
}

interface RemoteNoteProps {
  stream: MediaStream | null,
  ref: HTMLAudioElement | null,
  socketId: string, pc: RTCPeerConnection
}

const remote_video = reactive<Array<RemoteNoteProps>>([])


const local_video = reactive<{
  localStream: MediaStream | null,
  ref: null | HTMLVideoElement,
  video_mode: "camera" | "share"
}>({
  ref: null,
  localStream: null,
  video_mode: "camera"
})


//----------------------sahre setting-------------------

const share_dialog = reactive<{
  ref: HTMLVideoElement | null,
  stream: MediaStream | null,
  show: boolean,
  video_open: boolean,
  audio_open: boolean,
  is_share: boolean,
  v_video_open: boolean,
  v_audio_open: boolean,
  v_is_share: boolean
}>({
  ref: null,
  stream: null,
  show: false,
  video_open: false,
  audio_open: false,
  is_share: false,
  v_video_open: false,
  v_audio_open: false,
  v_is_share: false
})

const handle_share_close = () => {
  share_dialog.show = false
  share_dialog.v_audio_open = share_dialog.audio_open
  share_dialog.v_video_open = share_dialog.video_open
  share_dialog.v_is_share = share_dialog.is_share
}

const handle_share_sure = async () => {
  // if(!share_dialog.v_audio_open&&!share_dialog.v_video_open){
  //   // ElMessage({
  //   //   type: "info",
  //   //   message: "error"
  //   // })
  //   handle_share_close()
  //   return
  // }

  if (share_dialog.audio_open === share_dialog.v_audio_open &&
    share_dialog.video_open === share_dialog.v_video_open &&
    share_dialog.is_share === share_dialog.v_is_share) {
    handle_share_close()
    return
  }

  if (local_video.localStream !== null) {
    // local_video.localStream.

    local_video.localStream.getTracks().forEach(track => track.stop());
    local_video.localStream = null
  }
  if (!share_dialog.v_audio_open && !share_dialog.v_video_open) {

  } else {
    let devices: MediaStream
    if (share_dialog.v_is_share) {
      devices = await window.navigator.mediaDevices.getDisplayMedia({
        video: share_dialog.v_video_open,
        audio: share_dialog.v_audio_open
      })
    } else {
      devices = await window.navigator.mediaDevices.getUserMedia({
        video: share_dialog.v_video_open,
        audio: share_dialog.v_audio_open
      })
    }

    // console.log("stream", devices)
    if (!!devices) {
      console.log("got steram")
      local_video.localStream = devices
      local_video.video_mode = share_dialog.v_is_share ? "share" : "camera"
      // if (dom_ref_dict[''].ref !== null) {
      //   dom_ref_dict[''].ref.focus()
      // }

      // if(remote_video.findIndex(item=>item.socketId===""))
      // dom_ref_dict[''] = {
      //   ref: null,
      //   stream: devices
      // }
    }

  }


  share_dialog.audio_open = share_dialog.v_audio_open
  share_dialog.video_open = share_dialog.v_video_open
  share_dialog.is_share = share_dialog.v_is_share

  share_dialog.show = false

  socket.value.emit("ready", { video: share_dialog.v_video_open, audio: share_dialog.v_audio_open })

}

const pull_connection = async (userInfo: any, socketId?: string) => {

  console.log(userInfo, 'userInfo')
  if (socketId === undefined) {
    for (let i in userInfo) {
      if (userInfo[i].username === opra_bar.username) {
        continue
      }

      if (!userInfo[i].video && !userInfo[i].audio && local_video.localStream === null) {
        console.log(userInfo[i], 'failed')
        continue
      }

      socket.value.emit("ice", { from: opra_bar.socketId, to: userInfo[i].socketId, data: { type: "change" } })
    }
  } else {
    // not self
    if (socketId === opra_bar.socketId) {
      throw new Error("oh no");
    }

    socket.value.emit("ice", { from: opra_bar.socketId, to: socketId, data: { type: "change" } })
  }
}

// --------------------big video---------------------

// const big_dialog = reactive<{
//   show: boolean,
//   user_id?: string,
//   title: string,
//   // ref: Ref<HTMLVideoElement | null>
// }>({
//   show: false,
//   title: "",
//   // ref: ref<HTMLVideoElement | null>(null)
// })

// const handle_big_video = (user_id: string) => {
//   let pc_node = remote_video.find(item=>item.socketId===user_id) as RemoteNoteProps

//   share_dialog.stream = pc_node.stream
//   if(share_dialog.ref!==null){
//     share_dialog.ref.srcObject = pc_node.stream;
//   }

// }

// const handle_mirror = () => {
//   if (local_video.localStream === null) {
//     console.log("local stream was not open")
//     return
//   }
//   big_dialog.show = true
//   // value.srcObject = local_video.localStream
//   dom_ref_dict[''] = {
//     ref: null,
//     stream: local_video.localStream,
//     type: "video"
//   }
// }

// const handle_mirror_close = () => {

// }

// local_video_setting.localStream.

const message_view = reactive<{
  messages: Array<{ time?: number, msg: string, from?: string }>,
  // clients: Array<{ username: string, share_video?: boolean, user_id: string }>,
  scroll_height: number,
  scroll_to_top: number,
  opacity: number,
  state: string,
  room_title: string
}>({
  room_title: "",
  messages: [],
  scroll_height: 600, state: "chat", opacity: 0.7,
  scroll_to_top: 0
})

const opra_bar = reactive({ message: "", username: "bear", socketId: '' })

const socket = ref<any>()


const pushMessage = (msg: { from?: string, msg: string, time?: number, username?: string }) => {
  if (msg.from === undefined) {
    msg.from = msg.username
  }
  if (msg.time === undefined) {
    msg.time = (new Date).getTime()
  }
  message_view.messages.push(msg)
}

const handle_send = () => {
  if (!opra_bar.message) {
    return
  }
  let data = { msg: opra_bar.message, username: opra_bar.username, time: (new Date).getTime() }
  socket.value.emit('message', data)
  // pushMessage({ ...data, from: data.username })
  opra_bar.message = ""
}


// const sendPcMessage = (PcMessage: any) => {
//   let from = { userId: socket.value.id, username: opra_bar.username }
//   let to = to_pc_message.value
//   socket.value.emit('pc message', { from, to, pcMsg: PcMessage })
// }
// const createPeerConnection = (isCreatedOffer, data) => {
//   let other = isCreatedOffer ? data.to : data.from // 对方
//   // if (!this.peerList[other.userId]) {
//   let pc = new RTCPeerConnection(PeerConnection)
//   pc.from = data.from
//   pc.to = data.to
//   pc.isSelf = isCreatedOffer // 是否是自己发起
//   pc.other = isCreatedOffer ? data.to : data.from // 对方
//   this.peerList[other.userId] = pc
//   this.biPeersList.push(pc)
//   this.createConnect(isCreatedOffer, pc)
//   // }
// }

// const createConnect = (isCreatedOffer: Boolean, pc: RTCPeerConnection) => {
//   pc.addEventListener('icecandidate', (event: any) => {
//     console.log('icecandidate event:', event)
//     if (event.candidate) {
//       sendPcMessage({
//         type: 'candidate',
//         label: event.candidate.sdpMLineIndex,
//         id: event.candidate.sdpMid,
//         candidate: event.candidate.candidate
//       })
//     } else {
//       console.log('End of candidates.')
//     }
//   })
//   if (this.localStream) {
//     pc.addStream((this.localStream))
//   } else {
//     this.startAction(this.addStreamToLocalPc(pc))
//   }
//   pc.addEventListener('addstream', (event) => {
//     console.log('addstream')
//     this.handleRemoteMediaStreamAdded(pc, event)
//   })
//   pc.addEventListener('removestream', (event) => {
//     return this.handleRemoteStreamRemoved(pc, event)
//   })
//   // 创建offer,生成本地会话描述,如果是视频接收方，不需要生成offer
//   if (isCreatedOffer) {
//     pc.createOffer(this.offerOptions).then((description) => this.createdOfferSuccess(pc, description)).catch(this.logError)
//   }
// },


// const createdAnswerSuccess = (pc, description) => {
//       pc.setLocalDescription(description).then(() => {
//         this.sendPcMessage(pc.localDescription)
//         this.setLocalDescriptionSuccess(description, 'answer')
//         console.log('local answer psd set.')
//       }).catch(()=>console.log("set session Description error"))
//     }

// const logError = (err: any) => {
//   if (!err) return
//   if (typeof err === 'string') {
//     console.warn(err)
//   } else {
//     console.warn(err.toString(), err)
//   }
// }

// // A和B建立连接，A和C建立连接，收到的B和C的消息需要进行区分
// const signalingMessageCallback = (message: any) => {
//   let otherId = message.from.userId // 对方的id
//   let pc = clients[otherId].pc
//   // let pc = this.peerList[otherId]
//   message = message.pcMsg
//   if (message.type === 'offer') {
//     console.log('signalingMessageCallback offer', message)
//     pc.setRemoteDescription(new RTCSessionDescription(message)).then(() => {
//       pc.createAnswer()
//         .then((description) => this.createdAnswerSuccess(pc, description))
//         .catch(()=>console.log("set session Description error"))
//     }).catch(logError)
//   } else if (message.type === 'answer') {
//     console.log('收到了answer')
//     console.log('pc', pc)
//     pc.setRemoteDescription(new RTCSessionDescription(message), function () {
//     }, logError)
//   } else if (message.type === 'candidate') {
//     let candidate = new RTCIceCandidate({
//       sdpMLineIndex: message.label,
//       candidate: message.candidate
//     })
//     pc.addIceCandidate(candidate).catch(err => {
//       console.log('addIceCandidate-error', err)
//     })
//   }
// }

const createPeerConnection = (user_id: string) => {
  // console.log(clients.value, user_id)

  // if (!clients.value[user_id].audio && !clients.value[user_id].video) {
  //   return false
  // }

  // let pc_node: RemoteNoteProps|undefined = remote_video.find(item=>item.socketId===user_id)
  if (remote_video.findIndex(item => item.socketId === user_id) !== -1) {
    return false
  }

  // if (remote_video[user_id]) {
  //   return false
  // }

  let pc: RTCPeerConnection;
  let username = clients.value[user_id].username

  if (pc_cache[username] === undefined) {
    pc = new RTCPeerConnection(PeerConnection.value);
  } else {
    pc = pc_cache[username]
  }

  let pc_node: RemoteNoteProps = {
    stream: null,
    ref: null,
    pc,
    socketId: user_id
  }

  remote_video.push(pc_node)
  // remote_video[user_id] = pc
  // dom_ref_dict[user_id] = {
  //   ref: null,
  //   stream: user_id === opra_bar.socketId ? local_video.localStream : null
  //   // stream: null,
  //   // type: "video"
  // }

  pc.onicecandidate = e => {
    console.log("on ice ")
    const message: any = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    socket.value.emit("ice", { to: user_id, from: opra_bar.socketId, data: message })
    // signaling.postMessage(message);
  };

  pc.ontrack = (e) => {
    console.log("on track")
    pc_node = remote_video.find(item => item.socketId === user_id) as RemoteNoteProps
    // pc_nod
    pc_node.stream = e.streams[0]
    let value = pc_node.ref

    if (value !== null) {
      console.log("add", value.hidden, value.srcObject, e.streams)
      value.srcObject = e.streams[0]
      // refresh.value = !refresh.value
      // value.focus()
    }

  }
  if (local_video.localStream !== null) {
    console.log("fsdfsd stream local")
    local_video.localStream.getTracks().forEach(track => pc.addTrack(track, local_video.localStream as MediaStream));
  }

  return true
}

const close_pc = (socketId: string) => {
  let pc_node_index = remote_video.findIndex(item => item.socketId === socketId)
  if (pc_node_index === -1) {
    return
  }
  remote_video[pc_node_index].pc.close()
  remote_video.splice(pc_node_index, 1)

  console.log(socketId, 'close')
}

const handle_ice = async (e: { from: string, to: string, data: any }) => {
  // if (!localStream) {
  //   console.log('not ready yet');
  //   return;
  // }

  // let pc = (clients[e.user_id] === undefined?undefined:clients[e.user_id].pc)
  // let client = clients[e.user_id]
  // let remote_note = remote_video[e.user_id]

  let pc_node = remote_video.find(item => item.socketId === e.from)
  let offer: RTCSessionDescriptionInit

  switch (e.data.type) {
    case 'offer':
      // 被动建立, 接收   server
      if (!createPeerConnection(e.from)) {
        console.error('existing peerconnection', e.from);
        // return;
      }

      pc_node = remote_video.find(item => item.socketId === e.from) as RemoteNoteProps

      await pc_node.pc.setRemoteDescription(e.data); // e.data == offer
      // console.log('offer', e.data)

      const answer = await pc_node.pc.createAnswer();
      socket.value.emit("ice", { to: e.from, from: opra_bar.socketId, data: { type: 'answer', sdp: answer.sdp } })
      // signaling.postMessage({ type: 'answer', sdp: answer.sdp });
      await pc_node.pc.setLocalDescription(answer);
      // handleOffer(e.data);
      break;
    case 'answer':
      // client
      if (pc_node === undefined) {
        console.error('no peerconnection');
        return;
      }
      await pc_node.pc.setRemoteDescription(e.data);
      // handleAnswer(e.data);
      break;
    case 'candidate':
      if (pc_node === undefined) {
        console.error('no peerconnection');
        return;
      }
      if (!e.data.candidate) {
        await pc_node.pc.addIceCandidate();
      } else {
        await pc_node.pc.addIceCandidate(e.data);
      }
      // handleCandidate(e.data);
      break;
    case "change":
      // client
      if (pc_node) {
        close_pc(e.from)
      }
      let rlt = createPeerConnection(e.from);
      pc_node = remote_video.find(item => item.socketId === e.from) as RemoteNoteProps
      console.log(remote_video, 'fsdfsdf', pc_node.pc, e.from, rlt)
      offer = await pc_node.pc.createOffer();
      socket.value.emit("ice", { to: e.from, from: opra_bar.socketId, data: { type: 'offer', sdp: offer.sdp } })
      // signaling.postMessage({ type: 'offer', sdp: offer.sdp });
      await pc_node.pc.setLocalDescription(offer);
      break;
    default:
      console.log('unhandled', e);
      break;
  }
}

onMounted(async () => {

  // let username = router.currentRoute.value.query['username'] as string
  // let room_title = "room title"
  // let room_key = ""
  let username = store.state.username
  let room_title = store.state.room_title
  let room_key = store.state.room_key
  // @ts-ignore
  PeerConnection.value = store.state.peerconfig

  opra_bar.username = username
  message_view.room_title = room_title

  socket.value = io.connect(SocketUrl, { query: { username, roomTitle: room_title, roomKey: room_key } })
  
  setTimeout(() => {
    if (Object.keys(clients.value).length === 0) {
      ElMessage({
        type: "error",
        message: "登录信息错误"
      })
    }
  }, 7000);

  socket.value.on('joined', (data: any) => {
    opra_bar.socketId = data['']
    socket.value.emit("message", { from: opra_bar.username, msg: "hi" })
    if (Object.keys(data).length > 1) {
      // update_connection()
      pull_connection(data)
    }
    delete data['']
    clients.value = data
  })

  socket.value.on('clients', (data: any) => {
    console.log('clients', data)
    clients.value = data
  })

  socket.value.on('message', (data: any) => {
    pushMessage(data)
  })

  socket.value.on('ice', (data: any) => {
    console.log('客户端收到了pc的消息', data)
    // signalingMessageCallback(data)
    handle_ice(data)
  })

  socket.value.on("ready", (data: { userInfo: any, updateSocketId: string, leave?: boolean }) => {
    clients.value = data.userInfo
    // if (!data.userInfo[data.updateSocketId].audio && !data.userInfo[data.updateSocketId].video) {
    close_pc(data.updateSocketId)
    // console.log()
    // }else{
    // if (data.userInfo[data.updateSocketId] !== undefined) {
    // if(data.userInfo[data.updateSocketId]===undefined){
    //   return
    // }
    if (data['leave'] !== undefined) {
      return
    }
    pull_connection(data.userInfo, data.updateSocketId)
    // }
    // }
  })

})

</script>

<style scoped>
.container>* {
  width: 100%;
}

.video-list {
  columns: 3;
}

.message {
  width: 250px;
  position: fixed;
  right: 0;
  bottom: 50px;
  top: 0;
  opacity: 0.6;
}

.infinite-list {
  padding: 0;
  margin: 0;
  list-style: none;
  text-align: left;
}

.infinite-list-item {
  word-break: break-all;
  text-align: left;
}

.infinite-list .infinite-list-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50px;
  background: var(--el-color-primary-light-9);
  margin: 10px;
  color: var(--el-color-primary);
}

.infinite-list .infinite-list-item+.list-item {
  margin-top: 10px;
}


.opra {
  position: fixed;
  /* display: flex; */
  left: 10px;
  bottom: 0;
  right: 10px;
}
</style>
