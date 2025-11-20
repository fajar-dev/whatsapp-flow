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
        // Data untuk RadioButton tipe lokasi
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

type DecryptedBody = {
    screen?: string;
    data?: any;
    version?: string | number;
    action?: string;
    flow_token?: string;
};

export const getNextScreen = async (decryptedBody: DecryptedBody) => {
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
        console.warn("Received client error:", data);
        return {
        data: {
            acknowledged: true
        }
        };
    }

    // Handle initial request - tampilkan form pemasangan WiFi
    if (action === "INIT") {
        return {
        ...SCREEN_RESPONSES.FORM_PASANG_WIFI
        };
    }

    if (action === "data_exchange") {
        // Handle request berdasarkan screen saat ini
        switch (screen) {
        // Handle navigasi dari FORM_PASANG_WIFI ke KONFIRMASI
        case "FORM_PASANG_WIFI":
            console.log("📝 Data form pemasangan WiFi:", data);
            
            // Ambil data dari form dan siapkan untuk konfirmasi
            return {
            ...SCREEN_RESPONSES.KONFIRMASI,
            data: {
                screen_0_nama: data.screen_0_nama || "",
                screen_0_alamat: data.screen_0_alamat || "",
                screen_0_kota: data.screen_0_kota || "",
                screen_0_tipe_lokasi: data.screen_0_tipe_lokasi || "",
                screen_0_nomor_hp: data.screen_0_nomor_hp || ""
            }
            };

        // Handle submit dari KONFIRMASI
        case "KONFIRMASI":
            console.log("✅ Data pemasangan WiFi final:", data);
            
            // TODO: Simpan data pemasangan WiFi ke database
            // Contoh:
            // await saveWifiInstallation({
            //   nama: data.nama,
            //   alamat: data.alamat,
            //   kota: data.kota,
            //   tipe_lokasi: data.tipe_lokasi,
            //   nomor_hp: data.nomor_hp,
            //   created_at: new Date()
            // });
            
            // TODO: Kirim notifikasi ke tim instalasi
            // await sendNotificationToInstallationTeam(data);
            
            // TODO: Kirim konfirmasi WhatsApp ke customer
            // await sendConfirmationMessage(data.nomor_hp, data);
            
            // Return success response untuk menutup flow
            return {
            ...SCREEN_RESPONSES.SUCCESS,
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
            break;
        }
    }

    console.error("Unhandled request body:", decryptedBody);
    throw new Error(
        "Unhandled endpoint request. Make sure you handle the request action & screen logged above."
    );
};