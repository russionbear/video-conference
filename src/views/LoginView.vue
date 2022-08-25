<template>
  <div class="container">
    <el-form label-position="left" label-width="100px">
      <el-form-item label="room id">
        <el-input :maxlength="6" v-model="enter_key.roomId" />
      </el-form-item>
      <el-form-item label="room key">
        <el-input v-model="enter_key.roomKey" />
      </el-form-item>
      <el-form-item label="username">
        <el-input v-model="enter_key.username" :maxlength="16" />
      </el-form-item>
      <el-form-item label="pc configure">
        <el-input v-model="enter_key.peerConfig" type="textarea" />
      </el-form-item>
      <el-form-item label="socket url">
        <el-input v-model="enter_key.socketUrl" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handle_enter">enter</el-button>
      </el-form-item>
    </el-form>
    <div>多数问题刷新页面即可解决，用户名重复将导致登录失败，roomkey为空则默认直播模式</div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import { SET_ENTER_DATA } from "@/store/actions"
import { useRouter } from 'vue-router';
import { PeerConnection } from "@/config/ice"
import { SocketUrl } from "@/config/socket"


const store = useStore()
const router = useRouter()

const enter_key = reactive({
  roomId: 'test',
  roomKey: "",
  username: "bear",
  socketUrl: SocketUrl,
  peerConfig: JSON.stringify(PeerConnection, null, 4)
})


const handle_enter = () => {
  let peerConfig: Record<string, any>;
  try {
    if (enter_key.roomId.length === 0 || enter_key.username.length === 0) {
      throw new Error("");
    }
    peerConfig = JSON.parse(enter_key.peerConfig)
  } catch (error) {
    ElMessage({
      type: "info",
      message: "error"
    })
    return
  }

  // let pc = new RTCPeerConnection(PeerConnection)

  store.commit(SET_ENTER_DATA, { room_title: enter_key.roomId, room_key: enter_key.roomKey, username: enter_key.username, peerconfig: peerConfig })
  router.push({path: "/crf"})
}
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>