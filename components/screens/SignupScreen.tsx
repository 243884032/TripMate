import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";
import { auth, db } from "../../firebase";

export default function SignupScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSignup = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("✅ User created:", userCredential.user);

            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                role: "user",
                createdAt: new Date(),
            });

            Alert.alert("Registration Successful", "", [
                {
                    text: "OK",
                    onPress: () => {
                        console.log("➡️ Redirecting to login...");
                        router.push("/login");
                    },
                },
            ]);

        } catch (error: any) {
            console.log("Error:", error.message);
            Alert.alert("Registration Failure", error.message);
        }
    };



    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.container}
        >
            <Text style={styles.title}>Register for a TripMate account</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#aaa"
            />

            <TextInput
                style={styles.input}
                placeholder="Password (at least 6 words)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#aaa"
            />

            <TouchableOpacity style={styles.button} onPress={handleSignup}>
                <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text style={styles.linkText}>Already have an account? Go back to the login page</Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f6f6f6",
        justifyContent: "center",
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 30,
        textAlign: "center",
        color: "#333",
    },
    input: {
        height: 48,
        borderColor: "#ccc",
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: "#fff",
        fontSize: 16,
    },
    button: {
        backgroundColor: "#28a745",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 12,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    linkText: {
        color: "#0066cc",
        textAlign: "center",
        marginTop: 8,
        fontSize: 14,
    },
});
