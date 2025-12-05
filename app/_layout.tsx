import { Stack, useRouter, useSegments } from "expo-router";
// PASTIKAN onAuthStateChanged diimpor dari firebase.ts
import { auth, onAuthStateChanged, signOut } from "../firebase"; 
import { Alert, Button, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";

// --- Custom Hook untuk mengelola status autentikasi ---
// File: _layout.tsx (Hanya bagian useAuthRedirect yang diubah)

function useAuthRedirect() {
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);

  const AUTH_ROUTES = ['index', 'register']; 

  // 1. Cek status Firebase saat komponen dimuat
  useEffect(() => {
    // LOG 1: Deteksi Awal Status
    console.log("LOG 1: Memulai pengecekan status Auth...");

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsReady(true);
      
      // LOG 2: Hasil Cek Status
      if (currentUser) {
          console.log("LOG 2: Auth State Changed. User DITEMUKAN:", currentUser.uid);
      } else {
          console.log("LOG 2: Auth State Changed. User TIDAK DITEMUKAN.");
      }
    });

    return () => unsub();
  }, []);

  // 2. Logika Redirect
  useEffect(() => {
    if (!isReady) {
        console.log("LOG 3: Belum siap, navigasi ditahan.");
        return; 
    }
    
    // LOG 4: Logika Redirect Dimulai
    console.log("LOG 4: Siap. Memulai logika redirect.");
    console.log("LOG 4: User:", user ? user.uid : 'null');
    console.log("LOG 4: Segmen Aktif:", segments[0] || 'index');


    const currentSegment = segments[0] || 'index'; 
    const isAuthRoute = AUTH_ROUTES.includes(currentSegment);
    const isChatRoute = currentSegment === 'chat';

    if (user) {
      if (isAuthRoute) {
        console.log("LOG 5: MENGALIHKAN ke /chat karena user ada di rute Auth.");
        router.replace("/chat");
      }
    } else {
      if (isChatRoute) {
        console.log("LOG 5: MENGALIHKAN ke / karena user tidak ada di rute Chat.");
        router.replace("/");
      }
    }
  }, [user, isReady, segments]);
  
  return { isReady, user };
}

// ... (Sisa kode RootLayout tetap sama)

// ... (handleLogout tetap sama)
const handleLogout = async (router: ReturnType<typeof useRouter>) => {
  try {
    await signOut(auth);
  } catch (error: any) {
    Alert.alert("Error", "Gagal logout: " + error.message);
  }
};


export default function RootLayout() {
  const router = useRouter();
  const { isReady, user } = useAuthRedirect();

  // Tampilkan loading screen jika status autentikasi belum didapatkan
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
// ... (Stack.Screen tetap sama)
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
      <Stack.Screen
        name="chat"
        options={{
          title: `Chat ${user?.email ? '(' + user.email.split('@')[0] + ')' : ''}`,
          headerRight: () => (
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