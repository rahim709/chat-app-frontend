"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWS } from "../../WebSocketProvider";

type Message = {
  text: string;
  senderId: string;
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const { ready, send, addMessageListener } = useWS() ?? {};

  const [text, setText] = useState("");
  const [userCount, setUserCount] = useState(1);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasJoinedRef = useRef(false);
  const roomIdString = Array.isArray(roomId) ? roomId[0] : roomId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [timeLeft, setTimeLeft] = useState(20 * 60);

  useEffect(() => {
    if (!roomIdString) return;

    const saved = localStorage.getItem(`chat-room-${roomIdString}`);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Message[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(parsed);
    } catch {
      // ignore corrupt storage
    }
  }, [roomIdString]);

  useEffect(() => {
    if (!roomIdString) return;
    localStorage.setItem(`chat-room-${roomIdString}`, JSON.stringify(messages));
  }, [messages, roomIdString]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!roomIdString) return;

    const savedStart = localStorage.getItem(`start-time-${roomIdString}`);
    if (!savedStart) return;

    const startTime = Number(savedStart);
    const secondsPassed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = 20 * 60 - secondsPassed;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(remaining > 0 ? remaining : 0);
  }, [roomIdString]);

  useEffect(() => {
    if (!roomIdString) return;

    if (timeLeft <= 0) {
      localStorage.removeItem(`start-time-${roomIdString}`);
      localStorage.removeItem(`chat-room-${roomIdString}`);
      alert("Session expired!");
      window.location.href = "/";
      return;
    }

    const savedStart = localStorage.getItem(`start-time-${roomIdString}`);
    if (!savedStart) {
      localStorage.setItem(`start-time-${roomIdString}`, String(Date.now()));
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem(`start-time-${roomIdString}`);
          localStorage.removeItem(`chat-room-${roomIdString}`);
          alert("Session expired!");
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [roomIdString, setTimeLeft, timeLeft]);

  useEffect(() => {
    if (!ready) {
      hasJoinedRef.current = false;
    }
  }, [ready]);

  useEffect(() => {
    if (!ready || !send || !addMessageListener || !roomIdString) return;

    const remove = addMessageListener((rawData) => {
      if (typeof rawData !== "object" || rawData === null) return;
      const data = rawData as Record<string, unknown>;

      if (data.type === "chat" && typeof data.message === "string") {
        const incomingText = data.message as string;
        const senderId = typeof data.senderId === "string" ? data.senderId : "Unknown";
        setMessages((prev) => [...prev, { text: incomingText, senderId }]);
      }

      if (data.type === "user_count" && typeof data.count === "number") {
        setUserCount(data.count);
      }

      if (data.type === "join_success") {
        if (typeof data.userId === "string") {
          setUserId(data.userId);
        }
        setError("");
      }

      if (data.type === "join_failed" && typeof data.message === "string") {
        setError(data.message);
      }

      if (data.type === "timeout") {
        localStorage.removeItem(`start-time-${roomIdString}`);
        localStorage.removeItem(`chat-room-${roomIdString}`);
        alert("Session expired after 20 minutes.");
        window.location.href = "/";
      }
    });

    if (!hasJoinedRef.current) {
      send({ type: "join", payload: { roomId: roomIdString } });
      hasJoinedRef.current = true;
    }

    return remove;
  }, [ready, send, addMessageListener, roomIdString]);

  const sendMessage = () => {
    if (!text.trim() || !send || !roomIdString || !userId) return;

    send({
      type: "chat",
      payload: { roomId: roomIdString, message: text },
    });

    setMessages((prev) => [...prev, { text, senderId: userId }]);
    setText("");
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center items-center">
      <div className="w-full max-w-[550px] bg-[#0f0f0f] border border-gray-700 p-4 sm:p-6 rounded-xl">
        <h1 className="text-2xl font-bold mb-1">💬 Real Time Chat</h1>

        <div className="flex justify-between text-gray-400 text-sm mb-4">
          <span>Session expires in</span>
          <span className="text-red-400 font-semibold">{formatTime(timeLeft)}</span>
        </div>

        <div className="flex justify-between items-center bg-[#1a1a1a] px-4 py-2 rounded-md border border-gray-700 mb-4">
          <span>Room Code: {roomIdString}</span>
          <span className="text-green-400">Users: {userCount}</span>
        </div>

        {error && (
          <p className="text-red-400 text-center mb-4 font-semibold">{error}</p>
        )}

        <div className="h-[350px] overflow-y-auto bg-[#0a0a0a] border border-gray-700 rounded-md p-4 space-y-3">
          {messages.map((msg, i) => {
            const isMe = msg.senderId === userId;
            return (
              <div
                key={i}
                className={`flex items-end gap-2 ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                {!isMe && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                    {msg.senderId}
                  </div>
                )}
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    isMe
                      ? "bg-blue-600 text-right"
                      : "bg-gray-800 text-left"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}></div>
        </div>

        <div className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md"
          />
          <button
            onClick={sendMessage}
            disabled={!ready}
            className="cursor-pointer px-4 bg-white text-black font-semibold rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
