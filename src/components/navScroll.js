// Marks a navbar section jump in flight; SlideInSection reads it to tell a
// passing navigation from a user swipe. Deadline self-clears because a jump
// landing where the page already sits emits no scroll events.
let timer = 0
export const navScroll = {
  active: false,
  mark() {
    this.active = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      this.active = false
    }, 1000)
  },
  clear() {
    this.active = false
    clearTimeout(timer)
  },
}
