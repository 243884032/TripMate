import { GOOGLE_MAPS_API_KEY } from "@env";
import Checkbox from "expo-checkbox";
import { router, useLocalSearchParams } from "expo-router";
import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform, Share, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { auth, rtdb } from "../../firebase";

export default function GuideDetailPage() {
    const { id } = useLocalSearchParams();
    const [guide, setGuide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [places, setPlaces] = useState<any[]>([]);
    const [selectedPlaceIndexes, setSelectedPlaceIndexes] = useState<number[]>([]);
    const [wasDeleted, setWasDeleted] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user || !id) {
            Alert.alert("error", "No access to users or guides ID");
            return;
        }

        const guideRef = ref(rtdb, `guides/${user.uid}/${id}`);
        const unsubscribe = onValue(guideRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGuide(data);
                setPlaces(data.places || []);
            }
            // else {
            //     if (!wasDeleted) {
            //         Alert.alert("Can't find this guide");
            //     }
            // }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id, wasDeleted]);

    const toggleSelectPlace = (index: number) => {
        setSelectedPlaceIndexes((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const handleDeleteSelected = () => {
        if (selectedPlaceIndexes.length === 0) return;

        Alert.alert(
            "Confirm Delete",
            `Are you sure you want to delete this ${selectedPlaceIndexes.length} location？`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const user = auth.currentUser;
                        if (!user) return;

                        const newPlaces = places.filter((_, idx) => !selectedPlaceIndexes.includes(idx));
                        try {
                            await update(ref(rtdb, `guides/${user.uid}/${id}`), {
                                places: newPlaces,
                            });
                            setSelectedPlaceIndexes([]);
                        } catch (error) {
                            const msg = error instanceof Error ? error.message : String(error);
                            Alert.alert("Delete Failed", msg);
                        }
                    },
                },
            ]
        );
    };

    const handleDragEnd = async ({ data }: { data: any[] }) => {
        setPlaces(data);
        const user = auth.currentUser;
        if (user) {
            await update(ref(rtdb, `guides/${user.uid}/${id}`), {
                places: data,
            });
        }
    };

    const handleShareGuide = async () => {
        try {
            if (!guide) return;

            const message = `I created a travel guide in TripMate: ${guide.title}\Creation time: ${new Date(guide.createdAt).toLocaleString()}\Come check out my favorite attractions!`;

            await Share.share({
                message,
            });
        } catch (error) {
            Alert.alert("Share Failure", String(error));
        }
    };

    const handleEditTitle = () => {
        if (Platform.OS === "ios") {
            Alert.prompt(
                "Editing Guide Name",
                "Please enter a new name",
                async (newTitle) => {
                    if (!newTitle || !newTitle.trim()) return;
                    try {
                        await update(ref(rtdb, `guides/${auth.currentUser?.uid}/${id}`), {
                            title: newTitle.trim(),
                        });
                        Alert.alert("Name updated");
                    } catch (error) {
                        Alert.alert("Failed to update", String(error));
                    }
                },
                "plain-text",
                guide?.title || ""
            );
        } else {
            Alert.alert("Only support iOS native prompt, Android please use custom Modal input box instead.");
        }
    };

    const handleDeleteGuide = () => {
        const guideId = Array.isArray(id) ? id[0] : id;
        if (typeof guideId !== "string") {
            Alert.alert("Ineffective Guidelines ID");
            return;
        }

        Alert.alert("Confirm Delete", "Are you sure you want to delete the whole guide?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        setWasDeleted(true);
                        await update(ref(rtdb, `guides/${auth.currentUser?.uid}`), {
                            [guideId]: null,
                        });
                        Alert.alert("Deleted Guide");
                        router.back();
                    } catch (error) {
                        Alert.alert("Delete Failed", String(error));
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#28a745" />
            </View>
        );
    }

    if (!guide) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "#999" }}>Can't find the guide</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.editButton} onPress={handleEditTitle}>
                    <Text style={styles.editText}>Editor name</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareGuide}>
                    <Text style={styles.editText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteGuideButton} onPress={handleDeleteGuide}>
                    <Text style={styles.editText}>Deletion guide</Text>
                </TouchableOpacity>
            </View>


            <View style={styles.container}>
                <Text style={styles.title}>{guide.title}</Text>
                <Text style={styles.subtitle}>
                    Established: {new Date(guide.createdAt).toLocaleString()}
                </Text>
                <Text style={styles.sectionTitle}>List of places: </Text>

                <DraggableFlatList
                    data={places}
                    onDragEnd={handleDragEnd}
                    keyExtractor={(_, index) => `place-${index}`}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item, drag, getIndex }: RenderItemParams<any>) => {
                        const index = getIndex?.();
                        if (index == null) return null;

                        const imageUrl = item.photo
                            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photo}&key=${GOOGLE_MAPS_API_KEY}`
                            : "https://via.placeholder.com/400x200?text=No+Image";

                        return (
                            <ScaleDecorator>
                                <Animated.View
                                    entering={FadeIn}
                                    exiting={FadeOut}
                                    style={[
                                        styles.placeItem,
                                        selectedPlaceIndexes.includes(index) && styles.placeSelected,
                                    ]}
                                >
                                    <TouchableOpacity onLongPress={drag}>
                                        <View style={styles.placeHeader}>
                                            <Checkbox
                                                value={selectedPlaceIndexes.includes(index)}
                                                onValueChange={() => toggleSelectPlace(index)}
                                            />
                                            <Text style={styles.placeText}>
                                                {item.name || "Unnamed location"}
                                            </Text>
                                        </View>
                                        <Image source={{ uri: imageUrl }} style={styles.placeImage} />
                                    </TouchableOpacity>
                                </Animated.View>
                            </ScaleDecorator>
                        );
                    }}
                />
            </View>

            {selectedPlaceIndexes.length > 0 && (
                <View style={styles.fixedDeleteButton}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
                        <Text style={{ color: "#fff", textAlign: "center" }}>
                            Delete {selectedPlaceIndexes.length} location
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f6f8",
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f4f6f8",
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    subtitle: {
        color: "#777",
        marginBottom: 16,
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 20,
        marginBottom: 10,
        color: "#333",
    },
    placeItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    placeHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 10,
    },
    placeText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#333",
    },
    placeImage: {
        width: "100%",
        height: 180,
        borderRadius: 10,
    },
    placeSelected: {
        backgroundColor: "#eafaf1",
    },
    deleteButton: {
        backgroundColor: "#FF3B30",
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    fixedDeleteButton: {
        position: "absolute",
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    headerButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: "#f4f6f8",
    },
    editButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    deleteGuideButton: {
        backgroundColor: "#FF3B30",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    editText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    shareButton: {
        backgroundColor: "#34C759",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
});
