import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:80";

// Helper to create client
const createClient = (projectId: string, userId: string): Socket => {
    return io(SOCKET_URL, {
        query: { projectId, userId }
    });
};

// Project A Users
const userA1 = createClient("project-A", "user-A1");
const userA2 = createClient("project-A", "user-A2");

// Project B User (Should be isolated)
const userB1 = createClient("project-B", "user-B1");

[userA1, userA2, userB1].forEach(socket => {
    socket.on("connect", () => {
        // @ts-ignore
        console.log(`Connected: ${socket.auth?.userId || socket.io.opts.query.userId}`);
    });

    socket.on("receive_message", (data) => {
        // @ts-ignore
        const receiver = socket.io.opts.query.userId;
        console.log(`[${receiver}] Received in ${data.room}: ${data.message} (from ${data.userId})`);
    });
});

// Scenario
setTimeout(() => {
    console.log("\n--- Joining General Channels ---");
    userA1.emit("join_general");
    userA2.emit("join_general");
    userB1.emit("join_general"); // Different general room
}, 1000);

setTimeout(() => {
    console.log("\n--- Testing Project Isolation (General Chat) ---");
    // A1 sends to Project A General
    userA1.emit("send_message", {
        room: "project-A:general",
        message: "Hello Project A!"
    });

    // B1 sends to Project B General
    userB1.emit("send_message", {
        room: "project-B:general",
        message: "Hello Project B!"
    });
}, 2000);

setTimeout(() => {
    console.log("\n--- Testing 1:1 DM (A1 -> A2) ---");
    // Both join the DM room
    userA1.emit("join_dm", { targetUserId: "user-A2" });
    userA2.emit("join_dm", { targetUserId: "user-A1" });
}, 3000);

setTimeout(() => {
    // A1 sends DM to A2
    // Note: In a real app, the client would know the room ID from the 'join_dm' response or logic
    // Here we manually construct it for the test: project-A:dm:user-A1:user-A2
    const dmRoom = "project-A:dm:user-A1:user-A2";
    userA1.emit("send_message", {
        room: dmRoom,
        message: "Psst, this is a private message."
    });
}, 4000);
