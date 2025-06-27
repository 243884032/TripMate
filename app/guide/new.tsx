import { router } from "expo-router";
import { push, ref } from "firebase/database";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
} from "react-native";
import { auth, rtdb } from "../../firebase";

export default function NewGuidePage() {
    const [title, setTitle] = useState("");
    const colorScheme = useColorScheme();

    const isDark = colorScheme === "dark";
    const inputTextColor = isDark ? "#fff" : "#000";
    const inputBgColor = isDark ? "#1c1c1e" : "#fff";
    const placeholderColor = isDark ? "#aaa" : "#888";

    const handleCreate = async () => {
        const user = auth.currentUser;
        if (!user || !title.trim()) {
            Alert.alert("Please enter the name of the guide");
            return;
        }

        const guideData = {
            title: title.trim(),
            createdAt: { ".sv": "timestamp" },
            places: [],
        };

        try {
            const newRef = await push(ref(rtdb, `guides/${user.uid}`), guideData);
            Alert.alert("Guidelines have been established", "Please opt-in");
            setTimeout(() => {
                router.replace("/(tabs)/explore");
            }, 500);
        } catch (e) {
            Alert.alert("Establish Failure", String(e));
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#f4f6f8" }]}>
            <Text style={[styles.heading, { color: isDark ? "#fff" : "#222" }]}>
                Create a new travel guide
            </Text>

            <TextInput
                placeholder="Please enter the name of the guide"
                placeholderTextColor={placeholderColor}
                value={title}
                onChangeText={setTitle}
                style={[
                    styles.input,
                    { backgroundColor: inputBgColor, color: inputTextColor },
                ]}
            />

            <TouchableOpacity style={styles.button} onPress={handleCreate}>
                <Text style={styles.buttonText}>Creating a guide</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
    },
    heading: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 24,
        textAlign: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 24,
    },
    button: {
        backgroundColor: "#007AFF",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});
