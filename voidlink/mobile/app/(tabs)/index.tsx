import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { showMessage } from 'react-native-flash-message';
import { chatApi } from '../../src/services/api';
import { useChatStore, Conversation, Folder } from '../../src/store/useChatStore';
import { colors, spacing, borderRadius, typography } from '../../src/utils/theme';
import { formatDistanceToNow } from 'date-fns';

export default function ChatsScreen() {
  const router = useRouter();
  const { conversations, setConversations, folders, setFolders, loadCachedConversations } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);

  useEffect(() => {
    loadCachedConversations();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [convsRes, foldersRes] = await Promise.all([
        chatApi.getConversations(selectedFolder ?? undefined),
        chatApi.getFolders(),
      ]);
      setConversations(convsRes.data);
      setFolders(foldersRes.data);
    } catch {
      // Use cached data on failure
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [selectedFolder]);

  const deleteConv = async (id: number) => {
    Alert.alert('Delete Chat', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await chatApi.deleteConversation(id);
            setConversations(conversations.filter((c) => c.id !== id));
            showMessage({ message: 'Chat deleted', type: 'success' });
          } catch {
            showMessage({ message: 'Delete failed', type: 'danger' });
          }
        },
      },
    ]);
  };

  const filtered = conversations.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchFolder = selectedFolder == null || c.folderId === selectedFolder;
    return matchSearch && matchFolder;
  });

  const renderRightActions = (id: number) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteConv(id)}
    >
      <Ionicons name="trash" size={20} color="#fff" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Conversation }) => {
    const folder = folders.find((f) => f.id === item.folderId);
    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push(`/chat/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.itemLeft}>
            <View style={[styles.modelDot, { backgroundColor: modelColor(item.model) }]} />
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemMetaText}>{item.model}</Text>
                {folder && (
                  <>
                    <Text style={styles.itemMetaDot}>·</Text>
                    <View style={[styles.folderChip, { backgroundColor: folder.color + '22' }]}>
                      <Text style={[styles.folderText, { color: folder.color }]}>{folder.name}</Text>
                    </View>
                  </>
                )}
                {item.updatedAt && (
                  <>
                    <Text style={styles.itemMetaDot}>·</Text>
                    <Text style={styles.itemMetaText}>
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search chats..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {/* Folder tabs */}
      {folders.length > 0 && (
        <View style={styles.folderRow}>
          <TouchableOpacity
            style={[styles.folderTab, selectedFolder == null && styles.activeFolderTab]}
            onPress={() => setSelectedFolder(null)}
          >
            <Text style={[styles.folderTabText, selectedFolder == null && styles.activeFolderTabText]}>
              All
            </Text>
          </TouchableOpacity>
          {folders.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.folderTab, selectedFolder === f.id && { borderColor: f.color }]}
              onPress={() => setSelectedFolder(f.id === selectedFolder ? null : f.id)}
            >
              <Text style={[styles.folderTabText, selectedFolder === f.id && { color: f.color }]}>
                {f.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptyHint}>Tap NEW to start chatting</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </View>
  );
}

function modelColor(model: string): string {
  if (model.includes('llama')) return '#00ff88';
  if (model.includes('mistral')) return '#ff6600';
  if (model.includes('deepseek')) return '#0088ff';
  if (model.includes('qwen')) return '#ff00aa';
  return '#8888aa';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: { padding: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.textPrimary, paddingVertical: spacing.sm, fontSize: typography.fontSizes.md },
  folderRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
  folderTab: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: borderRadius.full },
  activeFolderTab: { borderColor: colors.primary, backgroundColor: colors.surfaceLight },
  folderTabText: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
  activeFolderTabText: { color: colors.primary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  modelDot: { width: 8, height: 8, borderRadius: 4 },
  itemContent: { flex: 1 },
  itemTitle: { color: colors.textPrimary, fontSize: typography.fontSizes.md, fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2, flexWrap: 'wrap' },
  itemMetaText: { color: colors.textMuted, fontSize: typography.fontSizes.xs },
  itemMetaDot: { color: colors.textMuted, fontSize: typography.fontSizes.xs },
  folderChip: { paddingHorizontal: spacing.xs, paddingVertical: 1, borderRadius: borderRadius.sm },
  folderText: { fontSize: typography.fontSizes.xs, fontWeight: '600' },
  deleteAction: { backgroundColor: colors.error, justifyContent: 'center', alignItems: 'center', width: 70 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: typography.fontSizes.lg, fontWeight: '600' },
  emptyHint: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
});
