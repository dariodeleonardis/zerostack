import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { ShieldCheck, Download, CreditCard, ChevronRight } from "lucide-react-native";

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      {/* User Header */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>D</Text>
        </View>
        <Text style={styles.userName}>Dario De Leonardis</Text>
        <Text style={styles.userEmail}>dario@zerostack.it</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <ShieldCheck size={12} color="#047857" />
            <Text style={styles.badgeText}>Abbonato Attivo</Text>
          </View>
        </View>
      </View>

      {/* Sezioni */}
      <Text style={styles.sectionTitle}>Abbonamenti & Fatturazione</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <CreditCard size={18} color="#0066FF" />
            <Text style={styles.menuItemText}>I miei abbonamenti attivi</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <ShieldCheck size={18} color="#0066FF" />
            <Text style={styles.menuItemText}>Dati Fiscali & Fattura SDI / PEC</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Preferenze di Lettura</Text>
      <View style={styles.menuGroup}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Download size={18} color="#0066FF" />
            <Text style={styles.menuItemText}>Articoli salvati offline</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB"
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#0066FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold"
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827"
  },
  userEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2
  },
  badgeRow: {
    marginTop: 10
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#047857"
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937"
  }
});
