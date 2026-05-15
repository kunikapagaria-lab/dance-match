import { useEffect, useRef, useState } from 'react';
import socket from '../socket.js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function useWebRTC({ players, playerId, enabled }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef      = useRef({});
  const localStreamRef = useRef(null);

  useEffect(() => {
    if (!enabled || !playerId || players.length < 2) return;
    let cancelled = false;

    function createPC(peerId) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current?.getTracks().forEach(track =>
        pc.addTrack(track, localStreamRef.current)
      );

      pc.ontrack = ({ streams: [stream] }) => {
        if (!cancelled) setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('webrtc_ice_candidate', { to: peerId, candidate });
      };

      peersRef.current[peerId] = pc;
      return pc;
    }

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
      } catch (e) {
        console.warn('WebRTC: could not get local stream', e);
        return;
      }

      const others = players.filter(p => p.id !== playerId);
      for (const peer of others) {
        const pc = createPC(peer.id);
        // Smaller socket ID initiates to avoid both sides creating offers
        if (playerId < peer.id) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', { to: peer.id, offer });
        }
      }
    }

    const onOffer = async ({ from, offer }) => {
      if (!peersRef.current[from]) createPC(from);
      const pc = peersRef.current[from];
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIce = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      }
    };

    socket.on('webrtc_offer',         onOffer);
    socket.on('webrtc_answer',        onAnswer);
    socket.on('webrtc_ice_candidate', onIce);

    init();

    return () => {
      cancelled = true;
      socket.off('webrtc_offer',         onOffer);
      socket.off('webrtc_answer',        onAnswer);
      socket.off('webrtc_ice_candidate', onIce);
      Object.values(peersRef.current).forEach(pc => pc.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
  }, [enabled, playerId, players.length]);

  return { remoteStreams };
}
