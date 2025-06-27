import { GOOGLE_MAPS_API_KEY } from "@env";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { onValue, ref as rtdbRef, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, rtdb } from "../../firebase";


type Guide = {
  id: string;
  uid: string;
  title: string;
  places: any[];
};

const CATEGORY_MAP: Record<string, string> = {
  attraction: "tourist_attraction",
  restaurant: "restaurant",
};

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<"attraction" | "restaurant">("attraction");
  const [availableGuides, setAvailableGuides] = useState<Guide[]>([]);
  // const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [sortOption, setSortOption] = useState<"distance" | "rating">("distance");


  useEffect(() => {
    fetchNearbyPlaces();
    fetchUserGuides();
  }, [category, sortOption]);

  const fetchNearbyPlaces = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Unable to obtain location privileges");
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=${CATEGORY_MAP[category]}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await response.json();

      const sorted = json.results.sort((a: any, b: any) => {
        if (sortOption === "distance") {
          return a.distance_meters - b.distance_meters;
        } else {
          return (b.rating || 0) - (a.rating || 0);
        }
      });
      setPlaces(sorted);

    } catch (error) {
      console.error("Search error in neighborhood", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchPlaces = async () => {
    if (!searchQuery.trim()) {
      fetchNearbyPlaces();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          searchQuery
        )}&type=${CATEGORY_MAP[category]}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await response.json();

      let sorted = json.results;

      if (sortOption === "rating") {
        sorted = [...json.results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      }

      setPlaces(sorted);
    } catch (error) {
      console.error("Search Error", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGuides = () => {
    const user = auth.currentUser;
    if (!user) return;

    const userGuidesRef = rtdbRef(rtdb, `guides/${user.uid}`);
    onValue(userGuidesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const guidesArray = Object.entries(data).map(([key, value]: any) => ({
        id: key,
        ...value,
      }));
      setAvailableGuides(guidesArray);
    });
  };
  const { showActionSheetWithOptions } = useActionSheet();

  const handleAddToGuide = async (place: any) => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Please login");
    if (availableGuides.length === 0) {
      await fetchUserGuides();
    }

    const options = availableGuides.map((g) => g.title);
    options.push("Cancel");

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        title: "Opt-in guides",
      },
      (selectedIndex?: number) => {
        if (
          selectedIndex === undefined ||
          selectedIndex === options.length - 1
        ) {
          return;
        }
        const selectedGuide = availableGuides[selectedIndex];
        confirmAddToGuide(selectedGuide, place);
      }
    );
  };



  const confirmAddToGuide = async (guide: Guide, place: any) => {
    const newPlace = {
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      photo: place.photos?.[0]?.photo_reference ?? "",
    };

    const updatedPlaces = [...(guide.places || []), newPlace];

    const guideRef = rtdbRef(rtdb, `guides/${auth.currentUser?.uid}/${guide.id}`);
    await update(guideRef, { places: updatedPlaces });

    Alert.alert("Added to the guide");
  };


  const startVoiceInput = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Voice input is only supported on the web platform");
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        Alert.alert("This browser does not support speech recognition");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "zh-TW";
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        Alert.alert("Voice Recognition Complete", transcript);
      };

      recognition.onerror = (e: any) => {
        Alert.alert("Voice Recognition Error", e.error);
      };

      recognition.start();
    } catch (err) {
      console.error("Voice Recognition Failure", err);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const photo = item.photos?.[0]?.photo_reference;
    const imageUrl = photo
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo}&key=${GOOGLE_MAPS_API_KEY}`
      : "https://via.placeholder.com/400x200?text=No+Image";

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/explore/[id]",
              params: {
                id: item.place_id,
                city: item.name,
                image: imageUrl,
                description: item.formatted_address || item.vicinity,
                price: "$999",
                rating: String(item.rating ?? "N/A"),
              },
            })
          }
        >
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.city}>{item.name}</Text>
            <Text style={styles.description}>
              {item.formatted_address || item.vicinity}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addToGuideButton}
          onPress={() => handleAddToGuide(item)}
        >
          <Text style={{ color: "#fff" }}>Join my guide</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: 20, backgroundColor: '#fff' }}>
        <Text style={styles.title}>Explore the City</Text>
      </View>
      <View style={styles.tabRow}>
        {["attraction", "restaurant"].map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.tabButton, category === c && styles.tabButtonActive]}
            onPress={() => setCategory(c as typeof category)}
          >
            <Text style={category === c ? styles.tabTextActive : styles.tabText}>
              {c === "attraction" ? "Viewpoints" : "Restaurant"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Attractions / Restaurants..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchPlaces}
        />
        <TouchableOpacity style={styles.micButton} onPress={startVoiceInput}>
          <Ionicons name="mic" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchButton} onPress={fetchPlaces}>
          <Text style={{ color: "#fff" }}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by：</Text>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortOption === "distance" && styles.sortOptionSelected,
          ]}
          onPress={() => setSortOption("distance")}
        >
          <Text style={sortOption === "distance" ? styles.sortTextSelected : styles.sortText}>
            Distance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortOption,
            sortOption === "rating" && styles.sortOptionSelected,
          ]}
          onPress={() => setSortOption("rating")}
        >
          <Text style={sortOption === "rating" ? styles.sortTextSelected : styles.sortText}>
            Rating
          </Text>
        </TouchableOpacity>
      </View>


      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={places}
          renderItem={renderItem}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 12 },
  tabRow: { flexDirection: "row", justifyContent: "center", marginBottom: 12 },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  tabButtonActive: {
    backgroundColor: "#007AFF",
  },
  tabText: { color: "#333" },
  tabTextActive: { color: "#fff" },
  searchRow: { flexDirection: "row", marginBottom: 12 },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    marginLeft: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  micButton: {
    backgroundColor: "#34C759",
    marginLeft: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    paddingBottom: 8,
  },
  image: { width: "100%", height: 180 },
  info: { padding: 12 },
  city: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  description: { color: "#555" },
  addToGuideButton: {
    backgroundColor: "#FF9800",
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  modalTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 12 },
  modalItem: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
  },
  cancelButton: { color: "#007AFF", textAlign: "center", marginTop: 8 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sortLabel: {
    marginRight: 8,
    fontSize: 16,
  },
  sortOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    marginHorizontal: 4,
  },
  sortOptionSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  sortText: {
    color: "#333",
  },
  sortTextSelected: {
    color: "#fff",
  },

});
