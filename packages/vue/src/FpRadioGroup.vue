<script setup lang="ts">
// A row of latching piano keys: pressing one latches it down and lets the last one up. Reka's
// RadioGroup supplies the behaviour and ARIA (a radiogroup of radio buttons, one stop for Tab);
// this adds the labels printed over the keys, the group's label under them, and the arrows that
// move the latch along the row. Reka writes the orientation onto the group as `data-orientation`,
// which lays the keys out.
import type { FpLedColor } from './FpLed.vue'
import type { FpKeyLed, FpKeyOption } from './keys'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed, useAttrs, useId } from 'vue'
import { ledColorClass } from './keys'

export interface FpRadioGroupProps {
  /** The keys, left to right or top to bottom. */
  options: FpKeyOption[]
  /** A silkscreen label under the keys, which also names the group. Without one, give it an `aria-label`. */
  label?: string
  /** Keys standing side by side, or on their side and stacked. */
  orientation?: 'vertical' | 'horizontal'
  /** Where the light is: the strip at the foot of each key, an LED over each label, or none. */
  led?: FpKeyLed
  /** The colour the LEDs light in, unless an option sets its own. */
  color?: FpLedColor
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<FpRadioGroupProps>(), { orientation: 'horizontal', led: 'strip', color: 'green' })

const model = defineModel<string>()

const id = useId()
const labelId = `${id}-label`
const keyLabelId = (index: number) => `${id}-key-${index}`

const colorOf = (option: FpKeyOption) => ledColorClass[option.color ?? props.color]

// Class and style place the group and its label together; everything else (a name, a form name,
// an id, listeners) belongs on the group.
const attrs = useAttrs()
const unitAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const groupAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

// The arrows move the latch along the row, wrapping at the ends and skipping disabled keys. Reka
// moves focus, then latches only if the arrow is still held when a timer runs, so a quick tap could
// leave the latch behind; and it takes only the arrows along its orientation, where a radio group
// takes all four. So the group takes the arrows first and presses the key it moves to.
const steps: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }

function moveLatch(event: KeyboardEvent) {
  const step = steps[event.key]
  if (!step || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return
  const group = event.currentTarget as HTMLElement
  const keys = [...group.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)')]
  const from = keys.indexOf(event.target as HTMLElement)
  if (from < 0)
    return
  event.preventDefault()
  // Right to left, the left arrow moves on along the row.
  const across = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
  const toward = across && getComputedStyle(group).direction === 'rtl' ? -step : step
  const key = keys[(from + toward + keys.length) % keys.length]!
  key.focus()
  key.click()
}
</script>

<template>
  <div class="fp-unit" v-bind="unitAttrs">
    <RadioGroupRoot
      v-bind="groupAttrs"
      v-model="model"
      class="fp-keys"
      :orientation="props.orientation"
      :disabled="props.disabled"
      :aria-labelledby="props.label ? labelId : undefined"
      @keydown.capture="moveLatch"
    >
      <template v-for="(option, index) in props.options" :key="option.value">
        <span :id="keyLabelId(index)" class="fp-silk" :aria-hidden="option.ariaLabel ? 'true' : undefined">
          <span
            v-if="props.led === 'above'"
            class="fp-led"
            :class="[colorOf(option), { 'fp-led-lit': model === option.value }]"
            aria-hidden="true"
          />{{ option.label }}
        </span>
        <RadioGroupItem
          :value="option.value"
          :disabled="option.disabled"
          class="fp-key"
          :class="props.led === 'strip' ? colorOf(option) : undefined"
          :data-strip="props.led === 'strip' ? undefined : 'plain'"
          :aria-label="option.ariaLabel"
          :aria-labelledby="option.ariaLabel ? undefined : keyLabelId(index)"
        />
      </template>
    </RadioGroupRoot>
    <span v-if="props.label" :id="labelId" class="fp-silk">{{ props.label }}</span>
  </div>
</template>
