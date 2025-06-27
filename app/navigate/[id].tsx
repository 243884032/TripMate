// import { GOOGLE_MAPS_API_KEY } from "@env";
// import polyline from "@mapbox/polyline";
// import * as Location from "expo-location";
// import { useLocalSearchParams } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//     ActivityIndicator,
//     Alert,
//     Dimensions,
//     StyleSheet,
//     Text,
//     View,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";

// export default function NavigatePage() {
//     const { id, lat, lng, name } = useLocalSearchParams<{
//         id: string;
//         lat: string;
//         lng: string;
//         name: string;
//     }>();

//     const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
//     const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
//     const [loading, setLoading] = useState(true);

//     const destination = {
//         latitude: parseFloat(lat),
//         longitude: parseFloat(lng),
//     };

//     // ⬇️ 取得目前 GPS 位置
//     const getCurrentLocation = async () => {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//             Alert.alert("❌ 請開啟定位權限");
//             return;
//         }
//         const loc = await Location.getCurrentPositionAsync({});
//         setOrigin({
//             latitude: loc.coords.latitude,
//             longitude: loc.coords.longitude,
//         });
//     };

//     // ⬇️ 呼叫 Google Directions API
//     const fetchRoute = async () => {
//         if (!origin) return;
//         const res = await fetch(
//             `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`
//         );
//         const json = await res.json();
//         if (json.routes.length) {
//             const points = polyline.decode(json.routes[0].overview_polyline.points);
//             const coords = points.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
//             setRouteCoords(coords);
//         } else {
//             Alert.alert("⚠️ 找不到路線");
//         }
//         setLoading(false);
//     };

//     useEffect(() => {
//         (async () => {
//             await getCurrentLocation();
//         })();
//     }, []);

//     useEffect(() => {
//         if (origin) fetchRoute();
//     }, [origin]);

//     if (!origin || loading) {
//         return (
//             <View style={styles.center}>
//                 <ActivityIndicator size="large" />
//                 <Text style={{ marginTop: 12 }}>正在建立路線...</Text>
//             </View>
//         );
//     }

//     return (
//         <MapView
//             style={styles.map}
//             initialRegion={{
//                 latitude: origin.latitude,
//                 longitude: origin.longitude,
//                 latitudeDelta: 0.01,
//                 longitudeDelta: 0.01,
//             }}
//         >
//             <Marker coordinate={origin} title="你的位置" pinColor="blue" />
//             <Marker coordinate={destination} title={name} />
//             <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#007AFF" />
//         </MapView>
//     );
// }

// const styles = StyleSheet.create({
//     map: {
//         flex: 1,
//         width: Dimensions.get("window").width,
//     },
//     center: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//     },
// });
