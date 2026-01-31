# 🚚 Stash Daemon Development Roadmap

**Your GPS for building a mesh routing daemon from first principles**

---

## 🎯 Core Metaphor

You are building a **post office**, not a delivery truck.

- You don't carry the mail
- You don't decide what's in it
- You **route it, store it, and forward it** when paths exist

---

## 🧭 THE PHASE MAP

Whenever you feel lost, come back to this.

### 🟩 Phase 1 — The Post Office Exists
**"I run forever and react to events."**

- Daemon lifecycle
- Event queue
- One brain loop
- No messages yet

**Success criteria:** It wakes up, sleeps, wakes up again.

---

### 🟨 Phase 2 — Mail Has a Shape
**"I know what a message is."**

- Packet structure
- Message IDs
- TTL

**Success criteria:** Bytes can become "mail".

---

### 🟦 Phase 3 — I Don't Deliver Twice
**"I remember what I've seen."**

- Deduplication
- Drop logic

**Success criteria:** Same message never delivered twice.

---

### 🟪 Phase 4 — I Know Where Mail Can Go
**"I decide deliver / forward / store."**

- Routing rules
- Peer knowledge

**Success criteria:** Correct decision every time.

---

### 🟧 Phase 5 — I Can Wait
**"I hold mail when roads are closed."**

- Store & forward
- Expiry

**Success criteria:** Offline becomes survivable.

---

### 🟥 Phase 6 — Trucks Exist
**"Mail actually moves."**

- Transport abstraction
- BLE plugged in later

**Success criteria:** Logic unchanged when transport changes.

---

### ⬛ Phase 7 — The Outside World Talks to Me
**"I'm embeddable."**

- C ABI
- Swift calls
- Events emitted

**Success criteria:** Clean boundary.

---

### 🔐 Phase 8 — Envelopes Are Sealed
**"Privacy, not architecture."**

- Encryption last

**Success criteria:** Nothing else breaks.

---

## 🟢 CURRENT PHASE: Phase 1

**We are starting Phase 1.**

That means:
- ❌ No packets
- ❌ No peers
- ❌ No BLE
- ❌ No crypto

Just:
**"A thing that runs, waits, and reacts."**

---

## 🧠 Phase 1 — What You Are Building (Mentally)

Forget "daemon" for a second.

You are building this loop:

```c
while (running) {
    wait for event
    handle event
}
```

That's it. But done **correctly**.

---

## 🔑 Key Questions for Phase 1

Over the next steps, we will decide:

- One thread or many?
- Blocking queue or polling?
- Who owns events?
- How do we shut down cleanly?

**These answers shape everything else.**

---

## 🧩 Phase 1 Success Criteria

You're done with Phase 1 when you can say:

> "I can inject fake events and watch the daemon react deterministically, without leaking threads or state."

**Nothing more.**

