"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWS } from "./WebSocketProvider";

export default function Home() {
  const ws = useWS();
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); //  NEW error state

  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "room_created") {
        setGeneratedCode(data.roomId);
        setRoomCode(data.roomId);
      }

      if (data.type === "join_success") {
        router.push(`/room/${data.roomId}`);
      }

      if (data.type === "join_failed") {
        showError("Room not found.");
      }
    };
  }, [ws]);

  //  Error handling helper
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 3000); // Hide after 3 seconds
  };

  const createRoom = () => {
    if (!ws) return;

    const payload = JSON.stringify({ type: "create_room" });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      ws.onopen = () => ws.send(payload);
    }
  };

  const joinRoom = () => {
    if (roomCode.length !== 6) {
      showError("Enter a valid 6-digit room code");
      return;
    }

    if (!ws) return;

    const payload = JSON.stringify({
      type: "join",
      payload: { roomId: roomCode },
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      ws.onopen = () => ws.send(payload);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center text-white">
      <div className="w-[420px] bg-[#0e0e0e] border border-gray-700 p-8 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">💬 Real Time Chat</h1>
        <p className="text-gray-400 text-sm mb-6">
          temporary room that expires in 20min
        </p>

        {/* Error Message UI */}
        {errorMessage && (
          <p className="text-red-400 text-center mb-4 font-semibold">
            {errorMessage}
          </p>
        )}

        {/* Created Room Code Box */}
        {generatedCode ? (
          <div className="mb-6 text-center">
            <p className="text-lg font-semibold">Room Created</p>
            <p className="text-xl mt-2 bg-[#1a1a1a] border border-gray-700 py-2 rounded-md">
              Code: <span className="font-bold">{generatedCode}</span>
            </p>
            <p className="text-gray-400 text-sm mt-3">
              Share this code with the other user.
            </p>
          </div>
        ) : null}

        {/* Create Room */}
        {!generatedCode && (
          <button
            onClick={createRoom}
            className="cursor-pointer w-full py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200"
          >
            Create New Room
          </button>
        )}

        {/* Join Room Input */}
        <div className="mt-6 flex gap-2">
          <input
            placeholder="Enter Room Code"
            className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button
            onClick={joinRoom}
            className="cursor-pointer px-4 bg-white text-black rounded-md hover:bg-gray-200"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}