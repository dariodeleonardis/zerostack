import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Heart, Repeat, MessageSquare, Send } from "lucide-react-native";

export default function NotesScreen() {
  const [noteInput, setNoteInput] = useState("");
  const [notes, setNotes] = useState([
    {
      id: "1",
      author: "Dario De Leonardis",
      handle: "dario",
      content: "Abbiamo appena rilasciato la prima versione di ZeroStack! Completamente open-source, con supporto nativo a SDI, PEC e 0% commissioni trattenute. Cosa ne pensate del ritorno al self-hosting?",
      likes: 42,
      restacks: 15,
      time: "2h"
    },
    {
      id: "2",
      author: "Dario De Leonardis",
      handle: "dario",
      content: "Un sondaggio rapido: quale provider email preferite per le vostre newsletter? Brevo (ex Sendinblue), Resend o Amazon SES?",
      likes: 19,
      restacks: 4,
      time: "5h"
    }
  ]);

  const handlePostNote = () => {
    if (!noteInput.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      author: "Dario De Leonardis",
      handle: "dario",
      content: noteInput,
      likes: 0,
      restacks: 0,
      time: "Adesso"
    };
    setNotes([newNote, ...notes]);
    setNoteInput("");
  };

  return (
    <View style={styles.container}>
      {/* Quick composer */}
      <View style={styles.composer}>
        <TextInput
          placeholder="Cosa c'è di nuovo? Scrivi una nota rapida..."
          placeholderTextColor="#9CA3AF"
          value={noteInput}
          onChangeText={setNoteInput}
          style={styles.input}
          multiline
        />
        <View style={styles.composerFooter}>
          <TouchableOpacity
            onPress={handlePostNote}
            disabled={!noteInput.trim()}
            style={[styles.sendButton, !noteInput.trim() && { opacity: 0.5 }]}
          >
            <Send size={14} color="#FFFFFF" />
            <Text style={styles.sendButtonText}>Invia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.noteCard}>
            <View style={styles.noteAuthorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.author[0]}</Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.authorName}>{item.author}</Text>
                <Text style={styles.handle}>@{item.handle} &bull; {item.time}</Text>
              </View>
            </View>

            <Text style={styles.noteContent}>{item.content}</Text>

            <View style={styles.noteActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Heart size={16} color="#6B7280" />
                <Text style={styles.actionText}>{item.likes}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Repeat size={16} color="#6B7280" />
                <Text style={styles.actionText}>{item.restacks}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <MessageSquare size={16} color="#6B7280" />
                <Text style={styles.actionText}>Rispondi</Text>
              </TouchableOpacity>
            </View>
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
  composer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 14
  },
  input: {
    minHeight: 50,
    fontSize: 14,
    color: "#111827"
  },
  composerFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6
  },
  sendButton: {
    backgroundColor: "#0066FF",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  noteAuthorRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0066FF"
  },
  authorName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827"
  },
  handle: {
    fontSize: 11,
    color: "#9CA3AF"
  },
  noteContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 10
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 12,
    paddingTop: 10
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  actionText: {
    fontSize: 12,
    color: "#6B7280"
  }
});
