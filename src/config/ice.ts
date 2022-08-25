export const PeerConnection = {
    'iceServers': [
        {
            'urls': 'stun:stun.l.google.com:19302'
        },
        {
            'urls': 'turn:120.77.253.101:3478',
            'username': 'inter_user',
            'credential': 'power_turn'
        }
    ]
}