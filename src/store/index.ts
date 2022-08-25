import { createStore } from 'vuex'
import { SET_ENTER_DATA } from "./actions"

export default createStore({
  state: {
    // enter_key: null,
    room_title: '',
    room_key: "",
    username: "",
    peerconfig: null
  },
  getters: {
  },
  mutations: {
    [SET_ENTER_DATA] (state, {room_key, room_title, username, peerconfig}) {
      state.room_key = room_key
      state.room_title = room_title
      state.username = username
      state.peerconfig = peerconfig
    }
  },
  actions: {
  },
  modules: {
  }
})
