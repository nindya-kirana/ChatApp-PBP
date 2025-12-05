import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import { auth, onAuthStateChanged, signOut } from "../firebase"; 
import { Alert, Button, View, ActivityIndicator, StyleSheet } from "react-native";
import { useEffect, useState } from "react";

function useAuthRedirect() {
  const segments = useSegments();
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const [usernameDisplay, setUsernameDisplay] = useState("Memuat...");

  const AUTH_ROUTES = ['index', 'register']; 

  // 1. Cek status Firebase & Load Username
  useEffect(() => {
    // Fungsi pembantu untuk memuat username
    const loadUsername = async (currentUser: typeof user) => {
        if (!currentUser) {
            setUsernameDisplay(""); // Kosongkan jika tidak ada user
            return;
        }
        try {
            const storedName = await AsyncStorage.getItem('userName');
            if (storedName) {
                // Prioritas 1: Gunakan username dari AsyncStorage
                setUsernameDisplay(storedName);
            } else {
                // Fallback: Gunakan bagian email sebelum @
                const fallbackName = currentUser.email?.split('@')[0] || "User";
                setUsernameDisplay(fallbackName);
            }
        } catch (e) {
            console.error("Gagal load username di layout:", e);
            setUsernameDisplay(currentUser.email?.split('@')[0] || "Error");
        }
    };

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Panggil fungsi loadUsername saat status auth berubah
      loadUsername(currentUser); 
      setIsLoading(false); 
    });

    return () => unsub();
  }, []);

  // 2. Logika Redirect
  useEffect(() => {
    if (isLoading) return; 

    const currentSegment = segments[0] || 'index'; 
    const isAuthRoute = AUTH_ROUTES.includes(currentSegment);
    const isChatRoute = currentSegment === 'chat';

    if (user) { 
      if (isAuthRoute) {
        router.replace("/chat");
      }
    } else {
      if (isChatRoute) {
        router.replace("/");
      }
    }
  }, [user, isLoading, segments]); 
  return { isLoading, user, usernameDisplay };
}

// --- Fungsi Logout (Wajib menghapus username lokal) ---
const handleLogout = async (router: ReturnType<typeof useRouter>) => {
  try {
    await AsyncStorage.removeItem('userName'); // Hapus username lokal
    await signOut(auth);
  } catch (error: any) {
    Alert.alert("Error", "Gagal logout: " + error.message);
  }
};


export default function RootLayout() {
  const router = useRouter();
  const { isLoading, user, usernameDisplay } = useAuthRedirect();

  // Tampilkan loading screen jika status autentikasi belum didapatkan
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
      <Stack.Screen
        name="chat"
        options={{
          title: usernameDisplay ? `${usernameDisplay}` : 'Chat Room', 
          headerRight: () => (
            // Tampilkan tombol logout hanya jika user sudah login
            user ? (
              <Button
                title="Logout"
                color="red"
                onPress={() => handleLogout(router)}
              />
            ) : null
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    }
});
