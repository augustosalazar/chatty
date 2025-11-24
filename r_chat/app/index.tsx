import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ConnectScreen() {
    const [projectId, setProjectId] = useState('');
    const [userId, setUserId] = useState('');
    const router = useRouter();

    const handleConnect = () => {
        if (projectId.trim() && userId.trim()) {
            router.push({
                pathname: '/chat',
                params: { projectId, userId }
            });
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Chat Server</Text>

            <View style={styles.form}>
                <Text style={styles.label}>Project ID</Text>
                <TextInput
                    style={styles.input}
                    value={projectId}
                    onChangeText={setProjectId}
                    placeholder="Enter project ID"
                    placeholderTextColor="#999"
                />

                <Text style={styles.label}>User ID</Text>
                <TextInput
                    style={styles.input}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="Enter user ID"
                    placeholderTextColor="#999"
                />

                <TouchableOpacity
                    style={[styles.button, (!projectId.trim() || !userId.trim()) && styles.buttonDisabled]}
                    onPress={handleConnect}
                    disabled={!projectId.trim() || !userId.trim()}
                >
                    <Text style={styles.buttonText}>Connect</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 40,
    },
    form: {
        width: '100%',
        maxWidth: 400,
    },
    label: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#fff',
    },
    button: {
        backgroundColor: '#6366f1',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 32,
    },
    buttonDisabled: {
        backgroundColor: '#4a4a5e',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
