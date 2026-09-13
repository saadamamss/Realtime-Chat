<template>
  <div
    :data-r-id="message.rId"
    class="flex gap-2 max-w-[85%] group"
    :class="direction === 'outbound' ? 'flex-row-reverse' : 'flex-row'"
  >
    <img
      :src="message.sender.image"
      :alt="message.sender.name"
      class="w-6 h-6 rounded-full object-cover shrink-0 mt-1"
    />

    <div
      class="rounded-2xl px-3.5 py-2.5 min-w-0 relative"
      :class="direction === 'outbound'
        ? 'bg-accent text-white rounded-br-sm'
        : 'bg-surface text-text-primary border border-border rounded-bl-sm'"
    >
        <button
          ref="menuBtnRef"
          class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm transition-opacity z-10 cursor-pointer"
          @click.stop="toggleMenu"
        >
          <UIcon name="ph-dots-three-vertical" class="w-3 h-3 text-text-secondary" />
        </button>
        <div
          v-if="message.reply_to"
          class="mb-2 flex items-stretch gap-2 cursor-pointer"
          :class="direction === 'outbound' ? 'bg-white/15' : 'bg-gray-100'"
          style="border-radius: 8px; overflow: hidden;"
          @click="$emit('scroll-to-message', message.reply_to.rId)"
        >
          <div
            class="w-1 shrink-0"
            :class="direction === 'outbound' ? 'bg-blue-300' : 'bg-accent'"
          />
          <div class="py-1.5 pr-2 min-w-0">
            <p
              class="text-xs font-semibold truncate"
              :class="direction === 'outbound' ? 'text-blue-200' : 'text-accent'"
            >
              {{ message.reply_to.sender.name }}
            </p>
            <p class="text-xs truncate" :class="direction === 'outbound' ? 'text-white/70' : 'text-text-secondary'">
              {{ message.reply_to.content || (message.reply_to.file ? 'File' : '') || 'Message' }}
            </p>
          </div>
        </div>
      <div v-if="message.file" class="mb-2">
        <div v-if="isImageFile(message.file_extension)" class="relative group -mx-1 -mt-1">
          <img
            :src="message.file"
            :alt="message.content || 'Image'"
            class="max-w-56 max-h-40 rounded-xl object-cover cursor-pointer"
            @click="$emit('file-preview', message.file, message.file_extension)"
          />
          <div
            v-if="messageStatus === 'sending' || messageStatus === 'failed'"
            class="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center"
          >
            <CircleProgress v-if="messageStatus === 'sending'" :size="40" :percent="messageProgress">
              <template #inner>
                <UIcon
                  name="ph-x-bold"
                  class="w-4 h-4 text-white cursor-pointer hover:scale-110 transition-transform"
                  @click="cancelMessageSend"
                />
              </template>
            </CircleProgress>
            <button
              v-if="messageStatus === 'failed'"
              @click="$emit('retry-send-message', message)"
              class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <UIcon name="ph-arrow-counter-clockwise" class="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>

        <div v-else-if="isVideoFile(message.file_extension)" class="relative group -mx-1 -mt-1">
          <video
            :src="message.file"
            class="max-w-56 max-h-40 rounded-xl object-cover cursor-pointer"
            @click="$emit('file-preview', message.file, message.file_extension)"
          >
            Your browser does not support the video tag.
          </video>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <UIcon name="ph-play-fill" class="w-6 h-6 text-white" />
            </div>
          </div>
          <div
            v-if="messageStatus === 'sending' || messageStatus === 'failed'"
            class="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center"
          >
            <CircleProgress v-if="messageStatus === 'sending'" :size="40" :percent="messageProgress">
              <template #inner>
                <UIcon
                  name="ph-x-bold"
                  class="w-4 h-4 text-white cursor-pointer hover:scale-110 transition-transform"
                  @click="cancelMessageSend"
                />
              </template>
            </CircleProgress>
            <button
              v-if="messageStatus === 'failed'"
              @click="$emit('retry-send-message', message)"
              class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <UIcon name="ph-arrow-counter-clockwise" class="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>

        <div v-else-if="isAudioFile(message.file_extension)" class="min-w-[200px]">
          <audio ref="audioPlayer" :key="message.file" :src="message.file" class="hidden"
            @loadedmetadata="onAudioLoaded"
            @durationchange="onDurationChange"
            @canplay="onAudioLoaded"
            @timeupdate="onAudioTimeUpdate"
            @play="onAudioPlay"
            @ended="onAudioEnded"
            @pause="onAudioPause"
          />
          <div
            class="flex items-center gap-3 p-2 rounded-xl"
            :class="direction === 'outbound' ? 'bg-white/15' : 'bg-gray-100'"
          >
            <CircleProgress v-if="messageStatus === 'sending'" :size="28" :percent="messageProgress">
              <template #inner>
                <UIcon name="ph-x-bold" class="w-3 h-3 cursor-pointer" @click="cancelMessageSend" />
              </template>
            </CircleProgress>
            <button
              v-else-if="messageStatus === 'failed'"
              @click="$emit('retry-send-message', message)"
              class="cursor-pointer"
            >
              <UIcon name="ph-arrow-counter-clockwise" class="w-5 h-5" />
            </button>
            <button v-else @click="playAudio(message.file)" class="cursor-pointer">
              <UIcon :name="isPlaying ? 'ph-pause-circle-fill' : 'ph-play-circle-fill'" class="w-6 h-6" />
            </button>
            <div class="flex-1">
              <div class="h-1.5 rounded-full" :class="direction === 'outbound' ? 'bg-white/30' : 'bg-gray-300'">
                <div
                  class="h-full rounded-full transition-all"
                  :class="direction === 'outbound' ? 'bg-white' : 'bg-accent'"
                  :style="{ width: progress + '%' }"
                />
              </div>
            </div>
            <span class="text-xs shrink-0" :class="direction === 'outbound' ? 'text-white/80' : 'text-text-secondary'">
              {{ progress > 0 ? currentTime : duration }}
            </span>
          </div>
        </div>

        <div v-else class="relative">
          <div
            class="flex items-center gap-3 p-3 rounded-xl"
            :class="direction === 'outbound' ? 'bg-white/15' : 'bg-gray-100'"
          >
            <CircleProgress v-if="messageStatus === 'sending'" :size="28" :percent="messageProgress">
              <template #inner>
                <UIcon name="ph-x-bold" class="w-3 h-3 cursor-pointer" @click="cancelMessageSend" />
              </template>
            </CircleProgress>
            <button
              v-else-if="messageStatus === 'failed'"
              @click="$emit('retry-send-message', message)"
              class="cursor-pointer"
            >
              <UIcon name="ph-arrow-counter-clockwise" class="w-5 h-5" />
            </button>
            <UIcon v-else :name="getFileIcon(message.file_extension)" class="w-6 h-6 shrink-0" />
            <div class="min-w-0 flex-1">
              <a
                :href="message.file"
                target="_blank"
                class="text-sm font-medium truncate block hover:underline"
              >
                {{ getFileName(message.file) }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <p v-if="message.content" class="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {{ message.content }}
      </p>

      <div class="flex items-center justify-end gap-1 mt-1" :class="direction === 'outbound' ? 'text-white/70' : 'text-text-secondary'">
        <span class="text-[11px]">{{ message.created_at_time }}</span>
        <UIcon
          v-if="messageStatus === 'sending'"
          name="ph-clock"
          class="w-3 h-3"
        />
        <UIcon
          v-else-if="messageStatus === 'sent' && direction === 'outbound'"
          :name="message.read_at ? 'ph-checks' : (message.delivered_at ? 'ph-checks' : 'ph-check')"
          class="w-3 h-3"
          :class="message.read_at ? 'text-blue-300' : (message.delivered_at ? 'text-white/70' : '')"
        />
        <UIcon
          v-else-if="messageStatus === 'failed'"
          name="ph-warning-circle"
          class="w-3 h-3 text-danger"
        />
      </div>
    </div>
    <teleport to="body">
      <div v-if="showMenu" class="fixed inset-0 z-40" @click="showMenu = false" />
      <div
        v-if="showMenu"
        class="fixed z-50 bg-white rounded-xl shadow-xl border border-border py-1 w-32"
        :style="{ top: menuPosition.top + 'px', right: menuPosition.right + 'px' }"
        @click.stop
      >
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-primary hover:bg-gray-50 transition-colors cursor-pointer"
          @click="emitReply"
        >
          <UIcon name="ph-arrow-bend-up-left" class="w-4 h-4" />
          Reply
        </button>
        <div class="border-t border-border my-1" />
        <button
          class="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-red-50 transition-colors cursor-pointer"
          @click="emitDelete"
        >
          <UIcon name="ph-trash" class="w-4 h-4" />
          Delete
        </button>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from "../types";

interface Props {
  message: ChatMessage;
  direction: "inbound" | "outbound";
  status: "sending" | "sent" | "failed";
  progress: number;
  cancelTokenSource: AbortController | null;
}

interface Emits {
  (e: "file-preview", fileUrl: string, fileExt: string | undefined): void;
  (e: "file-download", fileUrl: string, fileName: string): void;
  (e: "retry-send-message", message: ChatMessage): void;
  (e: "delete-message", message: ChatMessage): void;
  (e: "reply-message", message: ChatMessage): void;
  (e: "scroll-to-message", rId: string): void;
}

const props = defineProps<Props>();
const messageStatus = computed(() => props.status);
const messageProgress = computed(() => props.progress);
const emit = defineEmits<Emits>();

onUnmounted(() => {
  stopProgressLoop()
});

const showMenu = ref(false);
const menuBtnRef = ref<HTMLElement | null>(null);
const menuPosition = ref({ top: 0, right: 0 });

function toggleMenu() {
  showMenu.value = !showMenu.value;
  if (showMenu.value && menuBtnRef.value) {
    const rect = menuBtnRef.value.getBoundingClientRect();
    menuPosition.value = {
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    };
  }
}

function emitDelete() {
  showMenu.value = false;
  emit("delete-message", props.message);
}

function emitReply() {
  showMenu.value = false;
  emit("reply-message", props.message);
}

const audioPlayer = ref<HTMLAudioElement | null>(null);
const currentTime = ref("0:00");
const duration = ref("0:00");
const progress = ref(0);
const isPlaying = ref(false);

import { isImageFile, isVideoFile, isAudioFile, getFileIcon, getFileName } from '../utils/fileType'
import { formatDuration } from '../utils/format'

const cancelMessageSend = () => {
  if (props.cancelTokenSource) props.cancelTokenSource.abort();
};

const playAudio = (audioUrl: string) => {
  if (audioPlayer.value) {
    if (window.currentAudioPlayer && window.currentAudioPlayer !== audioPlayer.value) {
      window.currentAudioPlayer.pause();
    }
    window.currentAudioPlayer = audioPlayer.value;
    isPlaying.value ? audioPlayer.value.pause() : audioPlayer.value.play();
  }
};

const onAudioLoaded = () => {
  if (audioPlayer.value && isFinite(audioPlayer.value.duration) && audioPlayer.value.duration > 0) {
    duration.value = formatDuration(Math.floor(audioPlayer.value.duration));
  }
};

const onAudioEnded = () => {
  isPlaying.value = false;
  if (audioPlayer.value) audioPlayer.value.currentTime = 0;
};

let rafId: number | null = null

function startProgressLoop() {
  const update = () => {
    if (audioPlayer.value && isPlaying.value) {
      const current = audioPlayer.value.currentTime
      currentTime.value = formatDuration(Math.floor(current))
      if (isFinite(audioPlayer.value.duration) && audioPlayer.value.duration > 0) {
        const total = audioPlayer.value.duration
        progress.value = (current / total) * 100
      }
    }
    rafId = requestAnimationFrame(update)
  }
  rafId = requestAnimationFrame(update)
}

function stopProgressLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const onAudioTimeUpdate = () => {
  if (audioPlayer.value) {
    const current = Math.floor(audioPlayer.value.currentTime);
    currentTime.value = formatDuration(current);
    if (isFinite(audioPlayer.value.duration) && audioPlayer.value.duration > 0) {
      const total = Math.floor(audioPlayer.value.duration);
      progress.value = total > 0 ? (current / total) * 100 : 0;
    }
  }
};

const onDurationChange = () => {
  if (audioPlayer.value && isFinite(audioPlayer.value.duration) && audioPlayer.value.duration > 0) {
    duration.value = formatDuration(Math.floor(audioPlayer.value.duration));
  }
};

const onAudioPlay = () => {
  isPlaying.value = true
  startProgressLoop()
}

const onAudioPause = () => {
  isPlaying.value = false
  stopProgressLoop()
}
</script>
