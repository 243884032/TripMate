import { GOOGLE_MAPS_API_KEY } from "@env";
import polyline from "@mapbox/polyline";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { Gyroscope } from 'expo-sensors';
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function ExploreDetail() {
    const [gyroData, setGyroData] = useState({ x: 0, y: 0, z: 0 });
    const { id } = useLocalSearchParams();
    const [place, setPlace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState<any>(null);
    const [routeCoords, setRouteCoords] = useState<any[]>([]);
    const [travelMode, setTravelMode] = useState("transit");
    const [arrivalTime, setArrivalTime] = useState("");
    const [busInfo, setBusInfo] = useState("");
    const [heading, setHeading] = useState<number | null>(null);
    const [showFullMap, setShowFullMap] = useState(false);
    const angle = Math.atan2(gyroData.y, gyroData.x) * (180 / Math.PI);


    useEffect(() => {
        const subscription = Gyroscope.addListener((result) => {
            setGyroData(result); // result 包含 x, y, z 三軸轉動數據
        });

        Gyroscope.setUpdateInterval(500); // 每 500ms 更新一次

        return () => {
            subscription.remove(); // 離開時清除訂閱
        };
    }, []);


    useEffect(() => {
        fetchPlaceDetails();
    }, [id]);

    useEffect(() => {
        if (place?.geometry?.location) {
            fetchDirections(place.geometry.location.lat, place.geometry.location.lng);
        }
    }, [place, travelMode]);

    useEffect(() => {
        const subscribeHeading = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;

            Location.watchHeadingAsync((headingData) => {
                setHeading(headingData.trueHeading);
            });
        };

        subscribeHeading();
    }, []);

    const fetchPlaceDetails = async () => {
        try {
            const res = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=name,formatted_address,formatted_phone_number,rating,opening_hours,photos,geometry&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await res.json();
            setPlace(data.result);
        } catch (err) {
            console.error("Failed to get location details", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDirections = async (destLat: number, destLng: number) => {
        try {
            const location = await Location.getCurrentPositionAsync({});
            const origin = `${location.coords.latitude},${location.coords.longitude}`;
            const destination = `${destLat},${destLng}`;
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=${travelMode}&key=${GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.routes.length) {
                const points = polyline.decode(data.routes[0].overview_polyline.points);
                const coords = points.map(([latitude, longitude]) => ({ latitude, longitude }));
                setRouteCoords(coords);

                const duration = data.routes[0].legs[0].duration.text;
                setArrivalTime(duration);

                if (travelMode === "transit") {
                    const transitSteps = data.routes[0].legs[0].steps.filter(
                        (step: any) => step.travel_mode === "TRANSIT"
                    );
                    const buses = transitSteps.map((s: any) => s.transit_details?.line?.short_name).filter(Boolean);
                    setBusInfo(buses.length ? `Bus No.: ${buses.join(", ")}` : "");
                } else {
                    setBusInfo("");
                }
            } else {
                Alert.alert("Can't find the route.");
            }
        } catch (err) {
            console.error("Cana't a the route.", err);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!place) {
        return (
            <View style={styles.center}>
                <Text>Location information not found</Text>
            </View>
        );
    }

    const photoUrl = place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
        : "https://via.placeholder.com/400x200?text=No+Image";

    const location = place.geometry?.location;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Image source={{ uri: photoUrl }} style={styles.image} />
            <Text style={styles.name}>{place.name}</Text>
            <Text style={styles.info}>Address: {place.formatted_address}</Text>
            {place.formatted_phone_number && (
                <Text style={styles.info}>Phone number: {place.formatted_phone_number}</Text>
            )}
            <Text style={styles.info}>⭐: {place.rating ?? "無"}</Text>

            {place.opening_hours?.weekday_text && (
                <>
                    <Text style={[styles.info, { marginTop: 12 }]}>Business Hours: </Text>
                    {place.opening_hours.weekday_text.map((line: string, index: number) => (
                        <Text style={styles.info} key={index}>
                            {line}
                        </Text>
                    ))}
                </>
            )}

            <View style={styles.modeRow}>
                {["walking", "driving", "transit"].map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[
                            styles.modeButton,
                            travelMode === mode && { backgroundColor: "#007AFF" },
                        ]}
                        onPress={() => setTravelMode(mode)}
                    >
                        <Text style={{ color: travelMode === mode ? "#fff" : "#007AFF" }}>
                            {mode === "walking" ? "Walk" : mode === "driving" ? "Drive" : "Bus"}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {arrivalTime && (
                <Text style={[styles.info, { marginTop: 12 }]}>Estimated time: {arrivalTime}</Text>
            )}
            {busInfo && <Text style={styles.info}>{busInfo}</Text>}

            {location && (
                <>
                    <Text style={[styles.info, { marginTop: 16 }]}>Map: </Text>
                    <TouchableOpacity onPress={() => setShowFullMap(true)}>
                        <View style={styles.mapWrapper}>
                            <MapView
                                style={styles.map}
                                scrollEnabled
                                zoomEnabled
                                initialRegion={{
                                    latitude: location.lat,
                                    longitude: location.lng,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                            >
                                {userLocation && heading !== null && (
                                    <Marker
                                        coordinate={userLocation}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                        rotation={angle}
                                        flat
                                        title="Your location"
                                    >
                                        <Image
                                            source={require("../../assets/arrow.png")}
                                            style={{ width: 40, height: 40 }}
                                        />
                                    </Marker>
                                )}
                                <Marker
                                    coordinate={{ latitude: location.lat, longitude: location.lng }}
                                    title={place.name}
                                />
                                {routeCoords.length > 0 && (
                                    <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
                                )}
                            </MapView>
                        </View>
                    </TouchableOpacity>
                </>
            )}

            <Modal visible={showFullMap} animationType="slide">
                <View style={styles.fullMapOverlay}>
                    <MapView
                        style={styles.fullMap}
                        initialRegion={{
                            latitude: location.lat,
                            longitude: location.lng,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        {userLocation && heading !== null && (
                            <Marker
                                coordinate={userLocation}
                                anchor={{ x: 0.5, y: 0.5 }}
                                rotation={angle} // 替代 heading
                                flat
                                title="Your location"
                            >
                                <Image
                                    source={require("../../assets/arrow.png")}
                                    style={{ width: 40, height: 40 }}
                                />
                            </Marker>
                        )}
                        <Marker
                            coordinate={{ latitude: location.lat, longitude: location.lng }}
                            title={place.name}
                        />
                        {routeCoords.length > 0 && (
                            <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
                        )}
                    </MapView>
                    <TouchableOpacity
                        onPress={() => setShowFullMap(false)}
                        style={styles.closeButton}
                    >
                        <Text style={{ color: "#fff", fontSize: 16 }}>✖ Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: "#fff", alignItems: "center" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    image: { width: "100%", height: 200, borderRadius: 8, marginBottom: 16 },
    name: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
    info: { fontSize: 16, color: "#333", marginBottom: 4 },
    mapWrapper: {
        width: Dimensions.get("window").width - 32,
        height: 250,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 8,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    modeRow: { flexDirection: "row", marginTop: 12, marginBottom: 8 },
    modeButton: {
        borderWidth: 1,
        borderColor: "#007AFF",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 4,
    },
    fullMapOverlay: {
        flex: 1,
        backgroundColor: "#000",
    },
    fullMap: {
        flex: 1,
    },
    closeButton: {
        position: "absolute",
        top: 50,
        // right: 20,
        left:20,
        backgroundColor: "#00000088",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
});
