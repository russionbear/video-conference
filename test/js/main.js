/*
 *  Copyright (c) 2021 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const startButton = document.getElementById('startButton');
let change_state = 2;
const changeButton = document.getElementById('changeButton');
const hangupButton = document.getElementById('hangupButton');
hangupButton.disabled = true;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let pc;
let localStream;

const signaling = new BroadcastChannel('webrtc');
// signaling.onmessage = async e => {
//   if (!localStream) {
//     console.log('not ready yet');
//     return;
//   }
//   switch (e.data.type) {
//     case 'offer':
//       handleOffer(e.data);
//       break;
//     case 'answer':
//       handleAnswer(e.data);
//       break;
//     case 'candidate':
//       handleCandidate(e.data);
//       break;
//     case "change":
//       if (pc) {
//         await pc.close()
//         pc = undefined
//       }
//       makeCall();
//       break;
//     case 'ready':
//       // A second tab joined. This tab will initiate a call unless in a call already.
//       if (pc) {
//         console.log('already in call, ignoring', pc);
//         // return;

//       }
//       makeCall();
//       break;
//     case 'bye':
//       if (pc) {
//         hangup();
//       }
//       break;
//     default:
//       console.log('unhandled', e);
//       break;
//   }
// };


const handle_ice = async (e) => {
  if (!localStream) {
    console.log('not ready yet');
    return;
  }

  switch (e.data.type) {
    case 'offer':
      // 被动建立
      if (pc) {
        console.error('existing peerconnection', pc);
        return;
      }
      await createPeerConnection(false);
      await pc.setRemoteDescription(e.data); // e.data == offer
      console.log('offer', e.data)

      const answer = await pc.createAnswer();
      signaling.postMessage({ type: 'answer', sdp: answer.sdp });
      await pc.setLocalDescription(answer);
      // handleOffer(e.data);
      break;
    case 'answer':
      if (!pc) {
        console.error('no peerconnection');
        return;
      }
      await pc.setRemoteDescription(e.data);
      // handleAnswer(e.data);
      break;
    case 'candidate':
      if (!pc) {
        console.error('no peerconnection');
        return;
      }
      if (!e.data.candidate) {
        await pc.addIceCandidate(null);
      } else {
        await pc.addIceCandidate(e.data);
      }
      // handleCandidate(e.data);
      break;
    case "change":
      if (pc) {
        await pc.close()
        pc = undefined
      }
      makeCall();
      break;
    case 'ready':
      // A second tab joined. This tab will initiate a call unless in a call already.
      if (pc) {
        console.log('already in call, ignoring', pc);
        // return;

      }
      // 主动建立 (服务端)
      // makeCall();
      await createPeerConnection(true);
      const offer = await pc.createOffer();
      signaling.postMessage({ type: 'offer', sdp: offer.sdp });
      await pc.setLocalDescription(offer);

      break;
    case 'bye':
      if (pc) {
        if (pc) {
          pc.close();
          pc = null;
        }
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        startButton.disabled = false;
        hangupButton.disabled = true;
      }
      break;
    default:
      console.log('unhandled', e);
      break;
  }
}

signaling.onmessage = handle_ice

let fff = true
changeButton.onclick = async () => {
  // change_state = (change_state + 1) % 3;

  // if(pc){
  //   await pc.close()
  //   pc = undefined
  // }

  // localStream = await navigator.mediaDevices.getUserMedia({audio: change_state>0, video: change_state>1});
  // // localVideo.srcObject = localStream;

  // startButton.disabled = true;
  // hangupButton.disabled = false;

  // signaling.postMessage({type: 'change'});


  // localStream
  localStream.getVideoTracks().forEach(item => item.enabled = fff)
  fff = !fff;
}

startButton.onclick = async () => {
  if(window.location.search.length===0){
    console.log(window.location)
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  }else{
    console.log("video share")
    localStream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: true})
  }

  // localVideo.srcObject = localStream;


  startButton.disabled = true;
  hangupButton.disabled = false;

  signaling.postMessage({ type: 'ready' });
};

hangupButton.onclick = async () => {
  hangup();
  signaling.postMessage({ type: 'bye' });
};

async function hangup() {
  if (pc) {
    pc.close();
    pc = null;
  }
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
};

function createPeerConnection(is_server) {
  pc = new RTCPeerConnection();
  pc.onicecandidate = e => {
    const message = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    signaling.postMessage(message);
  };
  if (change_state !== 0) {
    // pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  }
  if(is_server){
    console.log("server")
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }
  // just rest
}

async function makeCall() {
  await createPeerConnection();

  const offer = await pc.createOffer();
  signaling.postMessage({ type: 'offer', sdp: offer.sdp });
  await pc.setLocalDescription(offer);
}

async function handleOffer(offer) {
  if (pc) {
    console.error('existing peerconnection', pc);
    return;
  }
  await createPeerConnection();
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  signaling.postMessage({ type: 'answer', sdp: answer.sdp });
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  if (!candidate.candidate) {
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}