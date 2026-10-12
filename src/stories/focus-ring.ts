import { expect, userEvent, waitFor } from 'storybook/test'

// Walks the page with Tab until the element has focus. Pressing Tab (not calling .focus()) is what makes
// :focus-visible apply, the same way a keyboard user reaches the control.
export const tabTo = async (element: HTMLElement, maxPresses = 30) => {
  for (let press = 0; press < maxPresses && document.activeElement !== element; press++) {
    await userEvent.tab()
  }
  await expect(element).toHaveFocus()
}

// The stock Button draws its keyboard focus as a 3px ring (a box-shadow); an unfocused control has none.
// ringOn: the box that draws the ring when it is not the focused control itself (a whole row around its link).
export const expectFocusRing = async (element: HTMLElement, ringOn: HTMLElement = element) => {
  await expect(getComputedStyle(ringOn).boxShadow).toBe('none')
  await tabTo(element)
  // :focus-visible only matches while this frame is the focused one; under parallel load another frame can hold it.
  await expect(document.hasFocus(), 'the test frame is not the focused frame, so :focus-visible cannot match').toBe(true)
  await waitFor(() => expect(getComputedStyle(ringOn).boxShadow).not.toBe('none'))
}
