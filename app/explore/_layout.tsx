import { Stack } from "expo-router";

export default function GuideLayout() {
    return (
        <Stack
            screenOptions={({ route }) => {
                switch (route.name) {
                    case "[id]":
                        return { title: "Details", headerTitleAlign: "center" };
                    default:
                        return { title: "Details", headerTitleAlign: "center" };
                }
            }}
        />
    );
}
