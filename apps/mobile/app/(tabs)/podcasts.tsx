import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Play, Clock } from "lucide-react-native";

const episodes = [
  {
    id: "1",
    title: "Ep. 01: L'evoluzione dell'AI applicata allo sviluppo web",
    publication: "Tech & Futuro Italia",
    duration: "6 min 12 sec",
    date: "25 Settembre"
  },
  {
    id: "2",
    title: "Ep. 02: Gestione fiscale, Partita IVA e fatturazione elettronica",
    publication: "Caffè Finanziario",
    duration: "7 min 40 sec",
    date: "20 Settembre"
  }
];

export default function PodcastsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.publication}>{item.publication}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.timeRow}>
                <Clock size={12} color="#9CA3AF" />
                <Text style={styles.timeText}>{item.duration} &bull; {item.date}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.playBtn}>
              <Play size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  publication: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7E22CE"
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
    lineHeight: 18
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF"
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7E22CE",
    alignItems: "center",
    justifyContent: "center"
  }
});
