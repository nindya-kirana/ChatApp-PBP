import { useEffect, useState, useRef } from "react"; // DITAMBAH: import useRef
import { View, Text, FlatList, TextInput, Button, StyleSheet, Image, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { auth, db } from "../firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, doc, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker'; 

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [username, setUsername] = useState("Memuat...");
  const [sending, setSending] = useState(false);
  
  // FIX ERROR: Menggunakan useRef untuk referensi FlatList
  const flatListRef = useRef<FlatList>(null);

  const currentUser = auth.currentUser;

  useEffect(() => {
    // 1. Load Username (AsyncStorage Quick Load)
    const loadUser = async () => {
      if (!currentUser) return;
      
      let currentUsername = "User";
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) {
          currentUsername = storedName;
        } else {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          currentUsername = snap.data()?.username || currentUser.email?.split('@')[0] || "User";
          await AsyncStorage.setItem('userName', currentUsername);
        }
      } catch (e) {
        console.error("Gagal memuat username:", e);
      }
      setUsername(currentUsername);
    };

    loadUser();

    // 2. Load Messages (Firestore Listener)
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsub;
  }, [currentUser]); 

  // --- FUNGSI AMBIL GAMBAR (Expo Image Picker) ---
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Izin untuk mengakses galeri diperlukan untuk mengirim gambar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.2, 
      base64: true, 
    });

    if (result.canceled) return;

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];

      if (asset.base64 && asset.base64.length > 1500000) { 
        Alert.alert("Error", "Ukuran gambar terlalu besar setelah kompresi!");
        return;
      }

      if (asset.base64) {
        const mimeType = asset.mimeType || 'image/jpeg';
        const imageString = `data:${mimeType};base64,${asset.base64}`;
        
        sendMessage("", imageString); 
      } else {
          Alert.alert("Error", "Gagal mendapatkan data Base64 gambar.");
      }
    }
  };

  // --- FUNGSI KIRIM PESAN ---
  const sendMessage = async (txt: string, imgBase64: string | null = null) => {
    const textToSend = txt.trim();
    if (!textToSend && !imgBase64) return;
    if (!currentUser) return;
    if (username === "Memuat...") return Alert.alert("Tunggu", "Username masih dimuat, coba lagi.");
    
    if (imgBase64) setSending(true);

    try {
      await addDoc(collection(db, "messages"), {
        text: textToSend,
        imageUrl: imgBase64,
        userId: currentUser.uid,
        username: username,
        createdAt: serverTimestamp(),
      });

      setMessage("");
      // Otomatis scroll ke bawah setelah pesan terkirim
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    } catch (error) {
        console.error("Gagal kirim:", error);
        Alert.alert("Gagal Kirim", "Terjadi kesalahan saat mengirim pesan.");
    } finally {
        setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{textAlign: 'center', fontWeight: 'bold', marginBottom: 5}}>Anda Login Sebagai: {username}</Text>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        // FIX ERROR: Menggunakan flatListRef
        ref={flatListRef} 
        
        renderItem={({ item }) => {
          const isMe = item.userId === currentUser?.uid;

          return (
            <View style={[styles.bubble, isMe ? styles.right : styles.left]}>
              <Text style={[styles.name, { color: isMe ? '#fff' : '#000' }]}>
                {item.username || item.userId?.substring(0, 5)}
              </Text>
              
              {item.imageUrl && (
                <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 200, height: 200, borderRadius: 10, marginVertical: 5, backgroundColor: '#ddd' }}
                    resizeMode="cover"
                />
              )}

              {item.text ? <Text style={{color: isMe ? '#fff' : '#000'}}>{item.text}</Text> : null}

              <Text style={styles.time}>
                {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "..."}
              </Text>
            </View>
          );
        }}
        // FIX ERROR: Memastikan scroll ke bawah saat data dimuat pertama kali
        onContentSizeChange={() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }}
        onLayout={() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={pickImage} disabled={sending} style={styles.imgBtn}>
             <Text style={{fontSize: 24}}>📷</Text>
        </TouchableOpacity>

        <TextInput 
            style={styles.input} 
            value={message} 
            onChangeText={setMessage} 
            placeholder="Ketik pesan..." 
        />
        
        {sending ? (
            <ActivityIndicator size="small" color="#007AFF" style={{marginRight: 10}}/>
        ) : (
            <Button 
                title="Kirim" 
                onPress={() => sendMessage(message)} 
                disabled={username === "Memuat..."}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f0f0f0' },
  bubble: { padding: 10, borderRadius: 10, marginVertical: 5, maxWidth: "70%" },
  left: { alignSelf: "flex-start", backgroundColor: "#fff" },
  right: { alignSelf: "flex-end", backgroundColor: "#007AFF" },
  name: { fontWeight: "bold", fontSize: 12, marginBottom: 2 },
  time: { fontSize: 9, color: '#aaa', alignSelf: 'flex-end', marginTop: 5 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: '#fff', paddingVertical: 5, borderTopWidth: 1, borderColor: '#ccc' },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 20, padding: 10, marginRight: 10 },
  imgBtn: { marginRight: 10, paddingHorizontal: 5 }
});
