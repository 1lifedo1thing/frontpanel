// The radio group's keys from the keyboard, in Chromium: Reka's roving focus finds its keys through
// the DOM in ways happy-dom doesn't support, so these run beside the axe scan.
import type { VueWrapper } from '@vue/test-utils'
import type { FpKeyOption } from './keys'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import FpRadioGroup from './FpRadioGroup.vue'

const mounted: VueWrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.innerHTML = ''
})

const sources: FpKeyOption[] = [
  { value: 'cd', label: 'CD' },
  { value: 'tape', label: 'Tape' },
  { value: 'aux', label: 'Aux', color: 'amber' },
  { value: 'line', label: 'Line', disabled: true },
]

const settle = () => new Promise(resolve => setTimeout(resolve, 20))

// Mounted and given a moment, as a page is before anyone reaches it: Reka wires each key's keyboard
// handling after the first render.
async function sourceGroup(props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  const wrapper = mount(FpRadioGroup, {
    attachTo: document.body,
    props: {
      'options': sources,
      'modelValue': 'tape',
      'onUpdate:modelValue': (value: string | undefined) => wrapper.setProps({ modelValue: value }),
      ...props,
    },
    attrs,
  })
  mounted.push(wrapper)
  await settle()
  return wrapper
}

const keys = (wrapper: VueWrapper) => wrapper.findAll<HTMLButtonElement>('[role="radio"]').map(key => key.element)
const latched = (wrapper: VueWrapper) => keys(wrapper).map(key => key.getAttribute('aria-checked'))

// A key pressed and let go in the same moment, with no hold, as a quick tap or a busy page gives.
function tap(target: HTMLElement, key: string) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
}

describe('fpRadioGroup from the keyboard', () => {
  it('latches the key an arrow moves to, even on a tap with no hold', async () => {
    const wrapper = await sourceGroup()
    keys(wrapper)[1]!.focus()
    tap(keys(wrapper)[1]!, 'ArrowRight')
    await settle()
    expect(document.activeElement).toBe(keys(wrapper)[2])
    expect(wrapper.emitted('update:modelValue')).toEqual([['aux']])
    expect(latched(wrapper)).toEqual(['false', 'false', 'true', 'false'])
  })

  it('latches once for a held arrow', async () => {
    const wrapper = await sourceGroup()
    keys(wrapper)[1]!.focus()
    await settle()
    keys(wrapper)[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    await settle()
    expect(wrapper.emitted('update:modelValue')).toEqual([['aux']])
  })

  it('wraps at the ends and skips a disabled key', async () => {
    const wrapper = await sourceGroup({ modelValue: 'aux' })
    keys(wrapper)[2]!.focus()
    tap(keys(wrapper)[2]!, 'ArrowRight')
    await settle()
    expect(document.activeElement).toBe(keys(wrapper)[0])
    tap(keys(wrapper)[0]!, 'ArrowLeft')
    await settle()
    expect(document.activeElement).toBe(keys(wrapper)[2])
    expect(wrapper.emitted('update:modelValue')).toEqual([['cd'], ['aux']])
  })

  // As the WAI-ARIA radio group pattern has it: Right and Down move on, Left and Up move back,
  // whichever way the keys stand.
  it.each(['horizontal', 'vertical'])('moves along the row on all four arrows, %s', async (orientation) => {
    const wrapper = await sourceGroup({ orientation, modelValue: 'cd' })
    keys(wrapper)[0]!.focus()
    await settle()
    for (const arrow of ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'])
      await userEvent.keyboard(`{${arrow}}`)
    await settle()
    expect(wrapper.emitted('update:modelValue')).toEqual([['tape'], ['aux'], ['tape'], ['cd']])
    expect(document.activeElement).toBe(keys(wrapper)[0])
  })

  it('moves on with the left arrow when the row reads right to left', async () => {
    const wrapper = await sourceGroup({ modelValue: 'cd' }, { dir: 'rtl' })
    keys(wrapper)[0]!.focus()
    await settle()
    await userEvent.keyboard('{ArrowLeft}')
    expect(wrapper.emitted('update:modelValue')).toEqual([['tape']])
  })
})
