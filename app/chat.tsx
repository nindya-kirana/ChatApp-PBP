import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
// PERBAIKAN 1: Mengganti library image picker
import * as ImagePicker from "expo-image-picker"; // <--- Menggunakan Expo Image Picker

import {
  auth,
  db,
  messagesCollection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  getDoc,
  signOut,
} from "../firebase";

// Tipe data pesan
type MessageType = {
  id: string;
  text: string;
  userId: string;
  username: string;
  imageUrl?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
};

export default function Chat() {
  const router = useRouter();
  const currentUser = auth.currentUser;
  const STORAGE_KEY = "CHAT_HISTORY_OFFLINE";

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [username, setUsername] = useState("User");
  const [uploading, setUploading] = useState(false);

  // Fungsi Logout tetap ada (untuk dipanggil oleh header di _layout.tsx)
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", "Gagal logout: " + error.message);
    }
  };

  // --- Ambil Username & Load Pesan ---
  useEffect(() => {
    if (!currentUser) return;

    // 1. Ambil Username
    const loadUser = async () => {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setUsername(snap.data()?.username || "User");
    };
    loadUser();

    // 2. Load Pesan Lokal (Cache)
    const loadLocalMessages = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setMessages(parsedData);
        }
      } catch (e) {
        console.log("Gagal memuat data offline:", e);
      }
    };
    loadLocalMessages();

    // 3. Subscribe ke Firebase (Real-time)
    const q = query(messagesCollection, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list: MessageType[] = [];
      snapshot.forEach((d) => {
        list.push({
          id: d.id,
          ...(d.data() as Omit<MessageType, "id">),
        });
      });

      setMessages(list);

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch((err) =>
        console.error("Gagal menyimpan backup:", err)
      );
    });

    return () => unsub();
  }, [currentUser]);

  // --- Fungsi Pilih dan Kirim Gambar (Base64) ---
  const handlePickImage = async () => {
    if (!currentUser) return;

    // 1. Meminta izin (Wajib untuk Expo)
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Dibutuhkan', 'Kami butuh izin untuk mengakses galeri foto.');
      return;
    }

    // 2. Memilih gambar (Mengganti launchImageLibrary)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: false,
      base64: true, 
    });

    if (result.canceled) return; // Expo menggunakan 'canceled'

    const asset = result.assets?.[0];
    if (!asset?.base64) return;

    setUploading(true);

    try {
      // Pastikan tipe data benar untuk Base64
      const base64Img = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

      await addDoc(messagesCollection, {
        text: "Mengirim gambar...",
        userId: currentUser.uid,
        username: username,
        imageUrl: base64Img,
        createdAt: serverTimestamp(),
      });
    } catch (error: any) {
      Alert.alert("Gagal Upload", "Gambar terlalu besar/koneksi error.");
    } finally {
      setUploading(false);
    }
  };

  // --- Mengirim pesan teks biasa ---
  const sendMessage = async () => {
    if (!message.trim() || !currentUser) return;

    try {
      await addDoc(messagesCollection, {
        text: message,
        userId: currentUser.uid,
        username: username,
        createdAt: serverTimestamp(),
        imageUrl: null,
      });
      setMessage("");
    } catch (error: any) {
      Alert.alert("Error", "Gagal mengirim pesan: " + error.message);
    }
  };

  // --- Render Item Pesan ---
  const renderItem = ({ item }: { item: MessageType }) => {
    const isMe = item.userId === currentUser?.uid;

    return (
      <View style={[styles.msgBox, isMe ? styles.myMsg : styles.otherMsg]}>
        <Text style={styles.sender}>{item.username}</Text>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: 200, height: 150, borderRadius: 5, marginTop: 5 }}
            resizeMode="cover"
          />
        ) : (
          <Text>{item.text}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
      />

      <View style={styles.inputRow}>
        {/* Tombol Tambah Gambar */}
        <TouchableOpacity
          onPress={handlePickImage}
          style={styles.imgBtn}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "white", fontWeight: "bold" }}>+</Text>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Ketik pesan..."
          value={message}
          onChangeText={setMessage}
        />
        <Button title="Kirim" onPress={sendMessage} />
      </View>
      
      {/* PERBAIKAN 2: BLOCK TOMBOL LOGOUT DI BAWAH DIHAPUS */}
      {/* Tombol Logout sekarang hanya ada di header (diatur di _layout.tsx) */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  msgBox: { padding: 10, marginVertical: 6, borderRadius: 6, maxWidth: "80%" },
  myMsg: { backgroundColor: "#cce5ff", alignSelf: "flex-end" },
  otherMsg: { backgroundColor: "#eee", alignSelf: "flex-start" },
  sender: { fontWeight: "bold", marginBottom: 2, fontSize: 12, color: "#555" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    padding: 8,
    borderRadius: 20,
  },
  imgBtn: {
    backgroundColor: "#444",
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
});