<script setup lang="ts">
const props = defineProps({
  percent: { type: Number, default: 0, validator: (v: number) => v >= 0 },
  size: { type: Number, default: 40 },
});

const STROKE = 3;
const radius = computed(() => (props.size - STROKE) / 2);
const circum = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => circum.value - (props.percent / 100) * circum.value);
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 40 40" class="-rotate-90">
    <circle cx="20" cy="20" r="18.5" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
    <circle
      cx="20" cy="20" :r="18.5"
      fill="none" stroke="white" stroke-width="3"
      stroke-linecap="round"
      :stroke-dasharray="circum"
      :stroke-dashoffset="offset"
      class="transition-all duration-300"
    />
    <foreignObject x="8" y="8" width="24" height="24">
      <div class="w-full h-full flex items-center justify-center">
        <slot name="inner" />
      </div>
    </foreignObject>
  </svg>
</template>
