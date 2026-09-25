import React from "react";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Inbox, MessageSquare, Radio, User } from "lucide-react-native";
import { View } from "react-native";
import { MiniPlayer } from "../components/MiniPlayer";

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#0066FF",
          tabBarInactiveTintColor: "#8E8E93",
          tabBarStyle: {
            borderTopColor: "#E5E5EA",
            backgroundColor: "#FFFFFF",
            height: 60,
            paddingBottom: 8,
            paddingTop: 6
          },
          headerStyle: {
            backgroundColor: "#FFFFFF"
          },
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 18,
            color: "#111827"
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Posta",
            headerTitle: "ZeroStack Feed",
            tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Note",
            headerTitle: "Note & Dispacci",
            tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />
          }}
        />
        <Tabs.Screen
          name="podcasts"
          options={{
            title: "Podcast",
            headerTitle: "Ascolto Podcast",
            tabBarIcon: ({ color, size }) => <Radio size={size} color={color} />
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profilo",
            headerTitle: "Il Tuo Account",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
