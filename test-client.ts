import { io } from "socket.io-client";

const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:80"; // Nginx load balancer

const client1 = io(SOCKET_URL);
const client2 = io(SOCKET_URL);

client1.on("connect", () => {
    console.log(`Client 1 connected: ${client1.id}`);
    client1.emit("join_room", "general");
});

client2.on("connect", () => {
    console.log(`Client 2 connected: ${client2.id}`);
    client2.emit("join_room", "general");
});

client1.on("receive_message", (data) => {
    console.log(`Client 1 received: ${data.message} from ${data.sender}`);
});

client2.on("receive_message", (data) => {
    console.log(`Client 2 received: ${data.message} from ${data.sender}`);
});

client1.on("history", (messages) => {
    console.log(`Client 1 History: ${messages.length} messages`);
});

setTimeout(() => {
    console.log("Sending message from Client 1...");
    client1.emit("send_message", {
        room: "general",
        sender: "Client 1",
        message: "Hello from Client 1!"
    });
}, 2000);

setTimeout(() => {
    console.log("Sending message from Client 2...");
    client2.emit("send_message", {
        room: "general",
        sender: "Client 2",
        message: "Hello back from Client 2!"
    });
}, 4000);
