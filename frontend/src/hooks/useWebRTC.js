import { useEffect, useRef, useState } from 'react';
import socket from '../socket.js';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'turn:openrelay.metered.ca:80',               username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

export default function useWebRTC({ players, playerId, localStreamRef, enabled }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef       = useRef({});
  const iceBufRef      = useRef({}); // buffer ICE candidates before remote desc is set

  useEffect(() => {
    if (!enabled || !playerId || players.length < 2) return;
    let cancelled = false;

    function createPC(peerId) {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Add local tracks from the shared MediaPipe stream
      const stream = localStreamRef?.current;
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = ({ streams: [s] }) => {
        if (!cancelled) setRemoteStreams(prev => ({ ...prev, [peerId]: s }));
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('webrtc_ice_candidate', { to: peerId, candidate });
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC ${peerId}] connection: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          console.warn(`[WebRTC ${peerId}] ICE failed — restarting`);
          pc.restartIce();
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`[WebRTC ${peerId}] ICE gathering: ${pc.iceGatheringState}`);
      };

      pc.onsignalingstatechange = () => {
        console.log(`[WebRTC ${peerId}] signaling: ${pc.signalingState}`);
      };

      console.log(`[WebRTC] createPC for ${peerId}, stream tracks: ${localStreamRef?.current?.getTracks().length ?? 0}`);

      peersRef.current[peerId] = pc;
      return pc;
    }

    async function addBufferedCandidates(peerId) {
      const pc  = peersRef.current[peerId];
      const buf = iceBufRef.current[peerId] || [];
      for (const c of buf) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
      }
      delete iceBufRef.current[peerId];
    }

    const onOffer = async ({ from, offer }) => {
      console.log(`[WebRTC] received offer from ${from}`);
      if (!peersRef.current[from]) createPC(from);
      const pc = peersRef.current[from];
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await addBufferedCandidates(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { to: from, answer });
    };

    const onAnswer = async ({ from, answer }) => {
      console.log(`[WebRTC] received answer from ${from}`);
      const pc = peersRef.current[from];
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await addBufferedCandidates(from);
    };

    const onIce = async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      } else {
        // Buffer until remote description is ready
        if (!iceBufRef.current[from]) iceBufRef.current[from] = [];
        iceBufRef.current[from].push(candidate);
      }
    };

    socket.on('webrtc_offer',         onOffer);
    socket.on('webrtc_answer',        onAnswer);
    socket.on('webrtc_ice_candidate', onIce);

    // Small delay so both players finish mounting their socket handlers
    const initTimer = setTimeout(async () => {
      if (cancelled) return;
      console.log(`[WebRTC] init — localStream tracks: ${localStreamRef?.current?.getTracks().length ?? 0}`);
      const others = players.filter(p => p.id !== playerId);
      for (const peer of others) {
        const pc = createPC(peer.id);
        if (playerId < peer.id) {
          console.log(`[WebRTC] sending offer to ${peer.id}`);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_offer', { to: peer.id, offer });
          } catch (e) {
            console.warn('WebRTC offer failed:', e);
          }
        }
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      socket.off('webrtc_offer',         onOffer);
      socket.off('webrtc_answer',        onAnswer);
      socket.off('webrtc_ice_candidate', onIce);
      Object.values(peersRef.current).forEach(pc => { try { pc.close(); } catch (_) {} });
      peersRef.current = {};
      iceBufRef.current = {};
    };
  }, [enabled, playerId, players.length]);

  return { remoteStreams };
}
