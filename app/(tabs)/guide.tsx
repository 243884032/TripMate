import { router } from "expo-router";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, rtdb } from "../../firebase";

export default function GuideTab() {
    const [guides, setGuides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const userGuidesRef = ref(rtdb, `guides/${user.uid}`);

        const unsubscribe = onValue(userGuidesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const guideArray = Object.entries(data).map(([id, value]: any) => ({
                    id,
                    ...value,
                }));
                setGuides(guideArray);
            } else {
                setGuides([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/guide/${item.id}`)}
        >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.count}>Total {item.places?.length || 0} locations</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={{paddingTop: 20, backgroundColor: '#fff' }}>
                <Text style={styles.header}>My Travel Guide</Text>
            </View>
            <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push("/guide/new")}
            >
                <Text style={styles.createButtonText}>➕ Creating new guidelines</Text>
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator size="large" />
            ) : guides.length === 0 ? (
                <Text style={{ textAlign: "center", marginTop: 40 }}>
                    No guidelines have been established
                </Text>
            ) : (
                <FlatList
                    data={guides}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: "#fff" },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    card: {
        backgroundColor: "#f0f0f0",
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
    },
    title: { fontSize: 18, fontWeight: "bold" },
    count: { marginTop: 4, color: "#555" },
    createButton: {
        backgroundColor: "#007AFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: "center",
    },
    createButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
});
