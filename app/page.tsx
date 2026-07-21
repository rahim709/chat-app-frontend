"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWS } from "./WebSocketProvider";

export default function Home() {
  const { ready, send, addMessageListener } = useWS() ?? {};
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  useEffect(() => {
    if (!addMessageListener) return;

    const remove = addMessageListener((data) => {
      if (
        typeof data !== "object" ||
        data === null ||
        !("type" in data)
      ) {
        return;
      }

      const message = data as { type: string; roomId?: string };

      if (message.type === "room_created" && message.roomId) {
        setGeneratedCode(message.roomId);
        setRoomCode(message.roomId);
        send?.({ type: "join", payload: { roomId: message.roomId } });
      }

      if (message.type === "join_success" && message.roomId) {
        router.push(`/room/${message.roomId}`);
      }

      if (message.type === "join_failed") {
        showError("Room not found.");
      }
    });

    return remove;
  }, [addMessageListener, router, send]);

  const createRoom = () => {
    if (!ready || !send) return;
    send({ type: "create_room" });
  };

  const joinRoom = () => {
    if (roomCode.length !== 6) {
      showError("Enter a valid 6-digit room code");
      return;
    }

    if (!ready || !send) return;

    send({
      type: "join",
      payload: { roomId: roomCode },
    });
  };

  return (
    <div className=" min-h-screen flex justify-center items-center text-white">
      <div className="w-full  overflow-hidden max-w-[420px] bg-[#0e0e0e] border border-gray-700 p-4 sm:p-8 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">💬 Real Time Chat</h1>
        <p className="text-gray-400 text-sm mb-6">
          temporary room that expires in 20min
        </p>

        {errorMessage && (
          <p className="text-red-400 text-center mb-4 font-semibold">
            {errorMessage}
          </p>
        )}

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

        {!generatedCode && (
          <button
            onClick={createRoom}
            disabled={!ready}
            className="cursor-pointer w-full py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create New Room
          </button>
        )}

        <div className="mt-6 flex gap-2">
          <input
            placeholder="Enter Room Code"
            className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button
            onClick={joinRoom}
            disabled={!ready}
            className="cursor-pointer px-4 bg-white text-black rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
