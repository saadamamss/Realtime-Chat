<template>
  <div
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
          <audio ref="audioPlayer" :src="message.file" class="hidden"
            @loadedmetadata="onAudioLoaded"
            @timeupdate="onAudioTimeUpdate"
            @play="isPlaying = true"
            @ended="onAudioEnded"
            @pause="isPlaying = false"
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
          :name="message.read_at ? 'ph-checks' : 'ph-check'"
          class="w-3 h-3"
          :class="message.read_at ? 'text-blue-300' : ''"
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
}

const props = defineProps<Props>();
const messageStatus = computed(() => props.status);
const messageProgress = computed(() => props.progress);
const emit = defineEmits<Emits>();

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

const audioPlayer = ref<HTMLAudioElement | null>(null);
const currentTime = ref("0:00");
const duration = ref("0:00");
const progress = ref(0);
const isPlaying = ref(false);

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const VIDEO_EXTENSIONS = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac", "flac"];

const isImageFile = (ext: string | undefined) => ext ? IMAGE_EXTENSIONS.includes(ext.toLowerCase()) : false;
const isVideoFile = (ext: string | undefined) => ext ? VIDEO_EXTENSIONS.includes(ext.toLowerCase()) : false;
const isAudioFile = (ext: string | undefined) => ext ? AUDIO_EXTENSIONS.includes(ext.toLowerCase()) : false;

const getFileIcon = (ext: string | undefined) => {
  const iconMap: Record<string, string> = {
    pdf: "ph-file-pdf", doc: "ph-file-text", docx: "ph-file-text",
    xls: "ph-file-spreadsheet", xlsx: "ph-file-spreadsheet",
    ppt: "ph-file-presentation", pptx: "ph-file-presentation",
    jpg: "ph-image", webp: "ph-image", jpeg: "ph-image", png: "ph-image",
    gif: "ph-image", svg: "ph-image", bmp: "ph-image",
    mp3: "ph-music-note", wav: "ph-music-note", ogg: "ph-music-note",
    m4a: "ph-music-note", aac: "ph-music-note", flac: "ph-music-note",
    mp4: "ph-video", avi: "ph-video", mov: "ph-video",
    wmv: "ph-video", webm: "ph-video", mkv: "ph-video",
    zip: "ph-archive", rar: "ph-archive",
  };
  return (ext && iconMap[ext.toLowerCase()]) || "ph-file";
};

const getFileName = (filePath: string) => filePath.split("/").pop() || "file";

const cancelMessageSend = () => {
  if (props.cancelTokenSource) props.cancelTokenSource.abort();
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  if (audioPlayer.value) {
    duration.value = formatDuration(Math.floor(audioPlayer.value.duration));
  }
};

const onAudioEnded = () => {
  isPlaying.value = false;
  if (audioPlayer.value) audioPlayer.value.currentTime = 0;
};

const onAudioTimeUpdate = () => {
  if (audioPlayer.value) {
    const current = Math.floor(audioPlayer.value.currentTime);
    const total = Math.floor(audioPlayer.value.duration);
    currentTime.value = formatDuration(current);
    progress.value = total > 0 ? (current / total) * 100 : 0;
  }
};
</script>
