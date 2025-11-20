/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Screen responses untuk Flow Pemasangan WiFi
const SCREEN_RESPONSES = {
  FORM_PASANG_WIFI: {
    screen: "FORM_PASANG_WIFI",
    data: {
      // Data untuk RadioButton tipe lokasi (jika diperlukan dari server)
      tipe_lokasi_options: [
        {
          id: "rumah",
          title: "Rumah"
        },
        {
          id: "kantor",
          title: "Kantor"
        }
      ]
    }
  },
  KONFIRMASI: {
    screen: "KONFIRMASI",
    data: {
      screen_0_nama: "",
      screen_0_alamat: "",
      screen_0_kota: "",
      screen_0_tipe_lokasi: "",
      screen_0_nomor_hp: ""
    }
  },
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN"
        }
      }
    }
  }
};

export const getNextScreen = async (decryptedBody: any) => {
  const { screen, data, version, action, flow_token } = decryptedBody;
  
  // Handle health check request
  if (action === "ping") {
    return {
      data: {
        status: "active"
      }
    };
  }

  // Handle error notification
  if (data?.error) {
    console.warn("⚠️ Received client error:", data);
    return {
      data: {
        acknowledged: true
      }
    };
  }

  // Handle initial request - tampilkan form pemasangan WiFi
  if (action === "INIT") {
    console.log("🚀 Flow initialized - showing FORM_PASANG_WIFI");
    return {
      ...SCREEN_RESPONSES.FORM_PASANG_WIFI
    };
  }

  if (action === "data_exchange") {
    // Handle request berdasarkan screen saat ini
    switch (screen) {
      // Handle navigasi dari FORM_PASANG_WIFI ke KONFIRMASI
      case "FORM_PASANG_WIFI":
        console.log("\n📝 ===== DATA DARI FORM PEMASANGAN WIFI =====");
        console.log("Raw data received:", JSON.stringify(data, null, 2));
        console.log("Nama:", data.screen_0_nama);
        console.log("Alamat:", data.screen_0_alamat);
        console.log("Kota:", data.screen_0_kota);
        console.log("Tipe Lokasi:", data.screen_0_tipe_lokasi);
        console.log("Nomor HP:", data.screen_0_nomor_hp);
        console.log("============================================\n");
        
        // Siapkan data untuk screen KONFIRMASI
        const confirmationData = {
          screen_0_nama: data.screen_0_nama || "",
          screen_0_alamat: data.screen_0_alamat || "",
          screen_0_kota: data.screen_0_kota || "",
          screen_0_tipe_lokasi: data.screen_0_tipe_lokasi || "",
          screen_0_nomor_hp: data.screen_0_nomor_hp || ""
        };
        
        console.log("📤 Sending to KONFIRMASI screen:", JSON.stringify(confirmationData, null, 2));
        
        return {
          screen: "KONFIRMASI",
          data: confirmationData
        };

      // Handle submit dari KONFIRMASI
      case "KONFIRMASI":
        console.log("\n✅ ===== FINAL SUBMISSION - DATA PEMASANGAN WIFI =====");
        console.log("Raw data received:", JSON.stringify(data, null, 2));
        console.log("─────────────────────────────────────────────────");
        console.log("👤 Nama          :", data.nama);
        console.log("📍 Alamat        :", data.alamat);
        console.log("🏙️  Kota          :", data.kota);
        console.log("🏠 Tipe Lokasi   :", data.tipe_lokasi);
        console.log("📱 Nomor HP      :", data.nomor_hp);
        console.log("⏰ Timestamp     :", new Date().toISOString());
        console.log("🔐 Flow Token    :", flow_token);
        console.log("═════════════════════════════════════════════════\n");
        
        // TODO: Simpan data pemasangan WiFi ke database
        // Contoh struktur data untuk disimpan:
        const installationData = {
          nama: data.nama,
          alamat: data.alamat,
          kota: data.kota,
          tipe_lokasi: data.tipe_lokasi,
          nomor_hp: data.nomor_hp,
          status: 'pending',
          created_at: new Date().toISOString(),
          flow_token: flow_token
        };
        
        console.log("💾 Data untuk database:", JSON.stringify(installationData, null, 2));
        
        // TODO: Uncomment untuk save ke database
        // await saveWifiInstallation(installationData);
        
        // TODO: Kirim notifikasi ke tim instalasi
        // await sendNotificationToInstallationTeam(installationData);
        
        // TODO: Kirim konfirmasi WhatsApp ke customer
        // await sendConfirmationMessage(data.nomor_hp, installationData);
        
        // Return success response untuk menutup flow
        return {
          screen: "SUCCESS",
          data: {
            extension_message_response: {
              params: {
                flow_token,
                // Data tambahan yang bisa digunakan untuk response message
                customer_name: data.nama,
                location: data.kota,
                installation_type: data.tipe_lokasi
              }
            }
          }
        };

      default:
        console.error("❌ Unknown screen:", screen);
        break;
    }
  }

  console.error("❌ Unhandled request body:", decryptedBody);
  throw new Error(
    "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
  );
};