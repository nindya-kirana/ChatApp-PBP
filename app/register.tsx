import { View, Text, TextInput, Button, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { auth, createUserWithEmailAndPassword, db } from "../firebase"; 
import { doc, setDoc } from "firebase/firestore"; 
import AsyncStorage from "@react-native-async-storage/async-storage"; 

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); 
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !username) return Alert.alert("Error", "Isi semua field.");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 1. SIMPAN USERNAME DI FIRESTORE
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        username: username,
      });

      // 2. SIMPAN USERNAME DI ASYNCSTORAGE (Untuk persistensi auto-login cepat)
      await AsyncStorage.setItem('userName', username);
      
      Alert.alert("Sukses", "Pendaftaran berhasil");
      router.replace("/chat");
    } catch (e: any) {
      Alert.alert("Pendaftaran Gagal", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      {/* DITAMBAH: Input Username */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />

      <Button title="Register" onPress={handleRegister} />

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Sudah punya akun? Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 15 },
  link: { marginTop: 15, textAlign: "center", color: "blue" },
});
