import { useState, useEffect, useRef, useCallback } from "react";
import {
  Text,
  View,
  Platform,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Subscription } from "expo-modules-core";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationContent } from "expo-notifications";

const PAST_NOTIFICATIONS_KEY = "PAST_NOTIFICATIONS";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert("Must use physical device for Push Notifications");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  return token;
}

const handleNotificationTap = ({ url }: Record<string, unknown>) => {
  if (url) Linking.openURL(url as string);
};

const Notification = ({ title, body, data }: NotificationContent) => {
  return (
    <TouchableOpacity onPress={() => handleNotificationTap(data)}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "black",
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 20,
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4 }}>
          {title}
        </Text>
        <Text>{body}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [pastNotifications, setPastNotifications] = useState<
    NotificationContent[]
  >([]);
  const responseListener = useRef<Subscription>({ remove: () => {} });

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token || "")
    );

    AsyncStorage.getItem(PAST_NOTIFICATIONS_KEY).then((data) => {
      const notifications = data ? JSON.parse(data) : [];
      setPastNotifications(notifications);
    });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const notification = response.notification.request.content;
        setPastNotifications((prev) => {
          const pastNotifications = [notification, ...prev];
          AsyncStorage.setItem(
            PAST_NOTIFICATIONS_KEY,
            JSON.stringify(pastNotifications)
          );
          return pastNotifications;
        });

        handleNotificationTap(notification.data);
      });

    return () => {
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const copyToken = useCallback(() => {
    Clipboard.setStringAsync(expoPushToken);
    setTimeout(() => {
      setExpoPushToken(expoPushToken);
    }, 1500);
    setExpoPushToken("Copied!");
  }, [expoPushToken]);

  return (
    <SafeAreaView
      style={{ flex: 1, alignItems: "center", justifyContent: "space-around" }}
    >
      <View
        style={{
          flex: 1,
        }}
      >
        <Text style={{ fontSize: 40, fontWeight: "bold" }}>notif</Text>
      </View>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Your push token:
        </Text>
        <TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              textAlign: "center",
            }}
            onPress={copyToken}
          >
            {expoPushToken}
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          flex: 4,
          paddingHorizontal: 10,
        }}
      >
        <ScrollView>
          {pastNotifications.map((notification, index) => (
            <Notification key={index} {...notification} />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
