// Avoid keeping a free database awake with continuous queue polling.
// IPC notifications are latched so a notification during work is never lost.
export class WorkerWake {
  pending = false;
  resolve?: () => void;
  constructor() { process.on("message", message => { if ((message as { type?: string })?.type === "recipe-job-enqueued") this.notify(); }); }
  notify() { this.pending = true; this.resolve?.(); }
  async wait() {
    if (this.pending) { this.pending = false; return; }
    await new Promise<void>(resolve => {
      const timer = setTimeout(done, process.env.RECIPE_DATABASE_URL ? 360000 : 2000);
      const self = this;
      function done() { clearTimeout(timer); self.resolve = undefined; resolve(); }
      this.resolve = done;
    });
    this.pending = false;
  }
}
