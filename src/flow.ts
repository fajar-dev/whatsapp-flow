/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface DropdownOption {
  id: string;
  title: string;
  enabled?: boolean;
}

interface DetailsData {
  property_types: DropdownOption[];
}

interface SummaryData {
  registration_details: string;
  name: string;
  address: string;
  city: string;
  property_type: string;
  phone: string;
}

interface SuccessData {
  extension_message_response: {
    params: {
      flow_token: string;
      some_param_name?: string;
    };
  };
}

interface ScreenResponse<T = any> {
  screen: string;
  data: T;
}

interface DecryptedBody {
  screen?: string;
  data?: any;
  version?: string;
  action: string;
  flow_token?: string;
}

// this object is generated from Flow Builder under "..." > Endpoint > Snippets > Responses
const SCREEN_RESPONSES = {
  DETAILS: {
    screen: "DETAILS",
    data: {
      property_types: [
        {
          id: "rumah",
          title: "Rumah",
        },
        {
          id: "kantor",
          title: "Kantor",
        },
      ],
    } as DetailsData,
  } as ScreenResponse<DetailsData>,
  SUMMARY: {
    screen: "SUMMARY",
    data: {
      registration_details:
        "Nama: John Doe\nAlamat: Jl. Contoh No. 123\nKota: Jakarta Selatan\nTipe Properti: Rumah\nNomor HP: 08123456789",
      name: "John Doe",
      address: "Jl. Contoh No. 123",
      city: "Jakarta Selatan",
      property_type: "rumah",
      phone: "08123456789",
    } as SummaryData,
  } as ScreenResponse<SummaryData>,
  TERMS: {
    screen: "TERMS",
    data: {},
  } as ScreenResponse<{}>,
  SUCCESS: {
    screen: "SUCCESS",
    data: {
      extension_message_response: {
        params: {
          flow_token: "REPLACE_FLOW_TOKEN",
          some_param_name: "PASS_CUSTOM_VALUE",
        },
      },
    } as SuccessData,
  } as ScreenResponse<SuccessData>,
};

export const getNextScreen = async (
  decryptedBody: DecryptedBody
): Promise<ScreenResponse> => {
  const { screen, data, version, action, flow_token } = decryptedBody;

  // handle health check request
  if (action === "ping") {
    return {
      screen: "PING",
      data: {
        status: "active",
      },
    };
  }

  // handle error notification
  if (data?.error) {
    console.warn("Received client error:", data);
    return {
      screen: "ERROR",
      data: {
        acknowledged: true,
      },
    };
  }

  // handle initial request when opening the flow and display DETAILS screen
  if (action === "INIT") {
    return SCREEN_RESPONSES.DETAILS;
  }

  if (action === "data_exchange") {
    // handle the request based on the current screen
    switch (screen) {
      // handles when user completes DETAILS screen (registration form)
      case "DETAILS": {
        // map property_type id to display name
        const propertyTypeOption =
          SCREEN_RESPONSES.DETAILS.data.property_types.find(
            (type) => type.id === data.property_type
          );

        if (!propertyTypeOption) {
          throw new Error("Invalid property type");
        }

        const registration_details = `Nama: ${data.name}
Alamat: ${data.address}
Kota: ${data.city}
Tipe Properti: ${propertyTypeOption.title}
Nomor HP: ${data.phone}`;

        return {
          ...SCREEN_RESPONSES.SUMMARY,
          data: {
            registration_details,
            // return the same fields sent from client back to submit in the next step
            name: data.name,
            address: data.address,
            city: data.city,
            property_type: data.property_type,
            phone: data.phone,
          },
        };
      }

      // handles when user completes SUMMARY screen
      case "SUMMARY":
        // TODO: save registration to your database
        console.log("Saving registration:", data);
        
        // send success response to complete and close the flow
        return {
          ...SCREEN_RESPONSES.SUCCESS,
          data: {
            extension_message_response: {
              params: {
                flow_token: flow_token || "",
              },
            },
          },
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