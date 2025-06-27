import { Stack } from "expo-router";

export default function GuideLayout() {
    return (
        <Stack
            screenOptions={({ route }) => {
                switch (route.name) {
                    case "new":
                        return { title: "Creating a guide", headerTitleAlign: "center" };
                    case "[id]":
                        return { title: "Guide Details", headerTitleAlign: "center" }; // 可用程式碼再改成實際名稱
                    default:
                        return { title: "Guide", headerTitleAlign: "center" };
                }
            }}
        />
    );
}
