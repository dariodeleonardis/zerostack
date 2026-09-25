import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Play, Pause, X } from "lucide-react-native";

export const MiniPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 16 }}>🎙️</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title} numberOfLines={1}>
            Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Tech & Futuro Italia
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => setIsPlaying(!isPlaying)}
          style={styles.playButton}
        >
          {isPlaying ? <Pause size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setVisible(false)} style={{ marginLeft: 12 }}>
          <X size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60,
    left: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1
  },
  actions: {
    flexDirection: "row",
    alignItems: "center"
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0066FF",
    alignItems: "center",
    justifyContent: "center"
  }
});
