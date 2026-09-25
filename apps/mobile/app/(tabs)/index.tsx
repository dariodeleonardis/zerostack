import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Clock, ShieldCheck } from "lucide-react-native";

const mockPosts = [
  {
    id: "1",
    publication: "Tech & Futuro Italia",
    title: "Perché l'ecosistema creator italiano ha bisogno di un'alternativa a Substack",
    subtitle: "Commissioni al 10%, assenza di fatturazione elettronica e server oltreoceano: come riconquistare la sovranità...",
    author: "Dario De Leonardis",
    date: "Oggi",
    readTime: "4 min",
    isPaid: false
  },
  {
    id: "2",
    publication: "Caffè Finanziario",
    title: "Tassi BCE, inflazione e scenari per le imprese italiane",
    subtitle: "L'impatto delle recenti decisioni sui mutui e sui finanziamenti aziendali...",
    author: "Marco B.",
    date: "Ieri",
    readTime: "6 min",
    isPaid: true
  }
];

export default function FeedScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={mockPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.7} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.publicationName}>{item.publication}</Text>
              <View style={styles.timeRow}>
                <Clock size={12} color="#9CA3AF" />
                <Text style={styles.timeText}>{item.date} &bull; {item.readTime}</Text>
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.authorText}>Di {item.author}</Text>
              {item.isPaid ? (
                <View style={styles.badgePaid}>
                  <Text style={styles.badgePaidText}>🔒 Premium</Text>
                </View>
              ) : (
                <View style={styles.badgeFree}>
                  <Text style={styles.badgeFreeText}>Gratuito</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  publicationName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0066FF"
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 3
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 22,
    marginBottom: 6
  },
  subtitle: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10
  },
  authorText: {
    fontSize: 12,
    color: "#6B7280"
  },
  badgePaid: {
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgePaidText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7E22CE"
  },
  badgeFree: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeFreeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857"
  }
});
