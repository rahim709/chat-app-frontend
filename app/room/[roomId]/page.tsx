"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWS } from "../../WebSocketProvider";

type Message = {
  sender: "me" | "other";
  text: string;
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const ws = useWS();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userCount, setUserCount] = useState(1);

  // ⏳ Timer (remaining seconds)
  const [timeLeft, setTimeLeft] = useState(20 * 60); // default 20 min

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ----------------------------------------------------------
     1️⃣ Load saved messages from localStorage
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!roomId) return;

    const saved = localStorage.getItem(`chat-room-${roomId}`);
    if (saved) setMessages(JSON.parse(saved));
  }, [roomId]);

  /* ----------------------------------------------------------
     2️⃣ Save messages to localStorage
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!roomId) return;
    localStorage.setItem(`chat-room-${roomId}`, JSON.stringify(messages));
  }, [messages, roomId]);

  /* ----------------------------------------------------------
     3️⃣ Auto scroll to bottom when new message arrives
  ----------------------------------------------------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ----------------------------------------------------------
     4️⃣ Countdown Timer (Does NOT reset on refresh)
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!roomId) return;

    const TOTAL = 20 * 60; // 20 min in seconds

    const savedStart = localStorage.getItem(`start-time-${roomId}`);
    let startTime: number;

    if (savedStart) {
      startTime = Number(savedStart);
    } else {
      startTime = Date.now();
      localStorage.setItem(`start-time-${roomId}`, String(startTime));
    }

    const secondsPassed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = TOTAL - secondsPassed;

    if (remaining <= 0) {
      localStorage.removeItem(`start-time-${roomId}`);
      alert("Session expired!");
      window.location.href = "/";
      return;
    }

    setTimeLeft(remaining);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem(`start-time-${roomId}`);
          alert("Session expired!");
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId]);

  /* ----------------------------------------------------------
     5️⃣ WebSocket join + listeners
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!ws || !roomId) return;

    const joinPayload = JSON.stringify({
      type: "join",
      payload: { roomId },
    });

    if (ws.readyState === WebSocket.OPEN) ws.send(joinPayload);
    else if (ws.readyState === WebSocket.CONNECTING)
      ws.onopen = () => ws.send(joinPayload);

    const handler = (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      if (data.messgae) {
        setMessages((prev) => [
          ...prev,
          { sender: "other", text: data.messgae },
        ]);
      }

      if (data.type === "user_count") {
        setUserCount(data.count);
      }

      if (data.type === "timeout") {
        localStorage.removeItem(`start-time-${roomId}`);
        alert("Session expired after 20 minutes.");
        window.location.href = "/";
      }
    };

    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws, roomId]);

  /* ----------------------------------------------------------
     6️⃣ Send Message
  ----------------------------------------------------------- */
  const sendMessage = () => {
    if (!text.trim() || !ws || !roomId) return;

    const payload = JSON.stringify({
      type: "chat",
      payload: { roomId, message: text },
    });

    if (ws.readyState === WebSocket.OPEN) ws.send(payload);

    setMessages((prev) => [...prev, { sender: "me", text }]);
    setText("");
  }

  /* Format countdown time */
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  /* ----------------------------------------------------------
     UI
  ----------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center">
      <div className="w-[550px] bg-[#0f0f0f] border border-gray-700 p-6 rounded-xl">

        <h1 className="text-2xl font-bold mb-1">💬 Real Time Chat</h1>

        <div className="flex justify-between text-gray-400 text-sm mb-4">
          <span>Session expires in</span>
          <span className="text-red-400 font-semibold">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex justify-between items-center bg-[#1a1a1a] px-4 py-2 rounded-md border border-gray-700 mb-4">
          <span>Room Code: {roomId}</span>
          <span className="text-green-400">Users: {userCount}</span>
        </div>

        <div className="h-[350px] overflow-y-auto bg-[#0a0a0a] border border-gray-700 rounded-md p-4 space-y-3">
          {messages.map((msg, i) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={i}
                className={`max-w-[70%] px-4 py-2 rounded-lg ${
                  isMe
                    ? "bg-blue-600 ml-auto text-right"
                    : "bg-gray-800 mr-auto text-left"
                }`}
              >
                {msg.text}
              </div>
            );
          })}
          <div ref={bottomRef}></div>
        </div>

        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md"
          />
          <button
            onClick={sendMessage}
            className="cursor-pointer px-4 bg-white text-black font-semibold rounded-md hover:bg-gray-200"
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}