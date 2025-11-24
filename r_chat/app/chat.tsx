import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io, Socket } from 'socket.io-client';

interface Message {
    userId: string;
    message: string;
    timestamp: Date;
}

const SOCKET_URL = 'http://localhost:80';

export default function ChatScreen() {
    const { projectId, userId } = useLocalSearchParams<{ projectId: string; userId: string }>();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!projectId || !userId) {
            router.replace('/');
            return;
        }

        const socket = io(SOCKET_URL, {
            query: { projectId, userId }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to chat server');
            setConnected(true);
            socket.emit('join_general');
        });

        socket.on('history', (data: { messages: Message[] }) => {
            setMessages(data.messages || []);
        });

        socket.on('receive_message', (data: Message) => {
            setMessages(prev => [...prev, data]);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from chat server');
            setConnected(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [projectId, userId]);

    const handleSend = () => {
        if (inputText.trim() && socketRef.current) {
            socketRef.current.emit('send_message', {
                room: `${projectId}:general`,
                message: inputText.trim()
            });
            setInputText('');
        }
    };

    const handleExit = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        router.replace('/');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>General Chat</Text>
                    <Text style={styles.headerSubtitle}>
                        {projectId} • {userId}
                    </Text>
                </View>
                <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
                    <Text style={styles.exitButtonText}>Exit</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statusBar}>
                <View style={[styles.statusDot, connected && styles.statusDotConnected]} />
                <Text style={styles.statusText}>
                    {connected ? 'Connected' : 'Connecting...'}
                </Text>
            </View>

            <FlatList
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                style={styles.messageList}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageBubble,
                        item.userId === userId && styles.messageBubbleOwn
                    ]}>
                        {item.userId !== userId && (
                            <Text style={styles.messageUser}>{item.userId}</Text>
                        )}
                        <Text style={styles.messageText}>{item.message}</Text>
                    </View>
                )}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim()}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#1a1a2e',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    exitButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    exitButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#1a1a2e',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#666',
        marginRight: 8,
    },
    statusDotConnected: {
        backgroundColor: '#10b981',
    },
    statusText: {
        fontSize: 12,
        color: '#999',
    },
    messageList: {
        flex: 1,
        padding: 16,
    },
    messageBubble: {
        backgroundColor: '#1a1a2e',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        maxWidth: '80%',
        alignSelf: 'flex-start',
    },
    messageBubbleOwn: {
        backgroundColor: '#6366f1',
        alignSelf: 'flex-end',
    },
    messageUser: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#1a1a2e',
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        backgroundColor: '#0f0f23',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#fff',
        marginRight: 8,
    },
    sendButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#4a4a5e',
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
