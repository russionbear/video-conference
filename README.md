# video-conference
> socket.io + vue(setup) + webrtc

## function

基于p2p模式的多人聊天，当只有一人共享资源（音视频）时，等同于直播


## run
```shell
#服务器端
cd socketServer
npm install
npm run start
# 客户端
npm install
npm run serve

```


## 小动作

- 两个不共享视频或音频的端点之间不会有p2p连接，有也会自动断开
- 因为[RTCPeerConnection断线重连](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/close)限制，对所有RTCPeerConnection对象进行保存引用


## reference
[架构代码，感谢感谢](https://github.com/wxiaoshuang/webrtc)
[peerconnection](https://github.com/webrtc/samples/)
