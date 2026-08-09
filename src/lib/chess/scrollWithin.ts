/**
 * Scroll `child` into view inside `container` only.
 * Unlike Element.scrollIntoView(), this never moves the window.
 */
export function scrollChildWithinContainer(
  container: HTMLElement,
  child: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  const deltaTop = childRect.top - containerRect.top;
  const deltaBottom = childRect.bottom - containerRect.bottom;

  if (deltaTop < 0) {
    container.scrollTop += deltaTop;
  } else if (deltaBottom > 0) {
    container.scrollTop += deltaBottom;
  }
}
