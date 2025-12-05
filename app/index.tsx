import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore"; 
import AsyncStorage from "@react-native-async-storage/async-storage"; 

export default function Login() {
  const [login, setLogin] = useState(""); // bisa email atau username
  const [password, setPassword] = useState("");
  const router = useRouter();

  const findEmailByUsername = async (username: string) => {
    const snap = await getDocs(collection(db, "users"));
    const user = snap.docs.find(d => d.data().username === username);
    return user?.data().email;
  };

  const handleLogin = async () => {
    if (!login || !password) return Alert.alert("Error", "Isi email/username dan password.");
    
    try {
      let email = login;

      if (!login.includes("@")) {
        const foundEmail = await findEmailByUsername(login);
        if (!foundEmail) {
          Alert.alert("Gagal Login", "Username tidak ditemukan");
          return;
        }
        email = foundEmail;
      }

      await signInWithEmailAndPassword(auth, email, password);
      
      // DITAMBAH: Simpan username ke AsyncStorage setelah login berhasil
      // Cari dokumen user berdasarkan email
      const snap = await getDocs(collection(db, "users"));
      const userDoc = snap.docs.find(d => d.data().email === email);
      const username = userDoc?.data().username;
      
      if (username) {
        await AsyncStorage.setItem('userName', username);
      } else {
        Alert.alert("Peringatan", "Username tidak ditemukan di database. Menggunakan email.");
      }
      
      router.replace("/chat");
    } catch (err: any) {
      Alert.alert("Login Gagal", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Email atau Username" 
        value={login} 
        onChangeText={setLogin} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="Password" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />

      <Button title="Login" onPress={handleLogin} />

      <Pressable onPress={() => router.push("/register")}>
        <Text style={styles.link}>Belum punya akun? Daftar sekarang</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 15 },
  link: { marginTop: 15, color: "blue", textAlign: "center" },
});
