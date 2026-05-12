import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { showMessage } from 'react-native-flash-message';
import uuid from 'react-native-uuid';
import { chatApi, streamChat, filesApi } from '../../src/services/api';
import { useChatStore, Message } from '../../src/store/useChatStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { MessageBubble } from '../../src/components/MessageBubble';
import { ModelSelector } from '../../src/components/ModelSelector';
import { VoiceInput } from '../../src/components/VoiceInput';
import { colors, spacing, borderRadius, typography } from '../../src/utils/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    messages, setMessages, addMessage, updateStreamingMessage, finishStreaming,
    selectedModel, isStreaming, setIsStreaming, setStreamingMessageId, currentConversation,
    setCurrentConversation,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const convId = id === 'new' ? null : parseInt(id, 10);

  useEffect(() => {
    if (convId) {
      loadConversation(convId);
    } else {
      setMessages([]);
      setCurrentConversation(null);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (currentConversation?.title) {
      navigation.setOptions({ title: currentConversation.title });
    }
  }, [currentConversation]);

  const loadConversation = async (cid: number) => {
    try {
      const res = await chatApi.getConversation(cid);
      const data = res.data;
      setCurrentConversation(data);
      setMessages(
        data.messages.map((m: any) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          model: m.model,
          attachments: m.attachments,
          createdAt: m.created_at,
        }))
      );
    } catch {
      showMessage({ message: 'Failed to load conversation', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');

    const userMsg: Message = {
      id: uuid.v4() as string,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    const streamingId = uuid.v4() as string;
    const aiMsg: Message = {
      id: streamingId,
      role: 'assistant',
      content: '',
      model: selectedModel,
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    addMessage(aiMsg);
    setIsStreaming(true);
    setStreamingMessageId(streamingId);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    let activeConvId = convId;

    await streamChat(
      {
        conversation_id: convId ?? undefined,
        model: selectedModel,
        message: text,
        system_prompt: user?.system_prompt ?? undefined,
        character_mode: user?.character_mode ?? undefined,
      },
      (chunk, newConvId) => {
        updateStreamingMessage(streamingId, chunk);
        if (newConvId && !activeConvId) activeConvId = newConvId;
        flatListRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        finishStreaming(streamingId);
      },
      (err) => {
        finishStreaming(streamingId);
        showMessage({ message: 'Stream error', description: err, type: 'danger' });
      }
    );
  }, [input, isStreaming, selectedModel, convId, user]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      try {
        const res = await filesApi.upload(formData);
        setInput((prev) => prev + ` [image: ${res.data.url}]`);
      } catch {
        showMessage({ message: 'Image upload failed', type: 'danger' });
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Model selector bar */}
      <View style={styles.modelBar}>
        <ModelSelector />
        {isStreaming && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.streamingText}>Generating...</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={{ paddingVertical: spacing.md, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatTitle}>Start a conversation</Text>
            <Text style={styles.emptyChatSub}>Using {selectedModel}</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
          <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <VoiceInput onTranscript={(t) => setInput((prev) => prev + t)} />

        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Message VoidLink..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={8000}
          returnKeyType="default"
        />

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || isStreaming}
          style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
        >
          <Ionicons
            name={isStreaming ? 'stop-circle' : 'arrow-up'}
            size={20}
            color={!input.trim() || isStreaming ? colors.textMuted : '#000'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  modelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  streamingIndicator: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  streamingText: { color: colors.primary, fontSize: typography.fontSizes.xs },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.sm },
  emptyChatTitle: { color: colors.textSecondary, fontSize: typography.fontSizes.xl, fontWeight: '600' },
  emptyChatSub: { color: colors.textMuted, fontSize: typography.fontSizes.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  iconBtn: { padding: spacing.sm },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceLight },
});
