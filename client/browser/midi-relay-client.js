/**
 * Browser MIDI Relay Client
 *
 * Connects to the MIDI relay server via WebSocket, binds to Web MIDI API
 * devices, and routes MIDI data between local devices and the relay.
 */

class MidiRelayClient {
  /** @type {WebSocket | null} */
  #ws = null;

  /** @type {MIDIAccess | null} */
  #midiAccess = null;

  /** @type {MIDIInput | null} */
  #activeInput = null;

  /** @type {MIDIOutput | null} */
  #activeOutput = null;

  /** @type {number} */
  #reconnectDelay = 1000;

  /** @type {number} */
  #maxReconnectDelay = 30000;

  /** @type {number | null} */
  #reconnectTimer = null;

  /** @type {boolean} */
  #shouldReconnect = false;

  /** @type {string} */
  #url = '';

  /** @type {string} */
  #room = '';

  /** @type {string} */
  #role = '';

  /** @type {string} */
  #name = '';

  /** @type {number | null} */
  #pingTimer = null;

  /** @type {number} */
  #lastPingSent = 0;

  /**
   * Connect to the relay server.
   *
   * @param {string} url — WebSocket URL
   * @param {string} room — room name
   * @param {string} role — 'sender' or 'receiver'
   * @param {string} [name] — optional display name
   */
  connect(url, room, role, name = '') {
    this.#url = url;
    this.#room = room;
    this.#role = role;
    this.#name = name;
    this.#shouldReconnect = true;
    this.#reconnectDelay = 1000;

    this.#openConnection();
  }

  /** Disconnect and stop reconnection attempts. */
  disconnect() {
    this.#shouldReconnect = false;
    this.#clearReconnectTimer();
    this.#clearPingTimer();

    if (this.#ws) {
      this.#ws.close();
      this.#ws = null;
    }

    this.#updateConnectionStatus('disconnected');
    this.#log('info', 'Disconnected.');
  }

  /** @returns {boolean} */
  get connected() {
    return this.#ws?.readyState === WebSocket.OPEN;
  }

  // ── WebSocket lifecycle ─────────────────────────────────────────

  #openConnection() {
    this.#updateConnectionStatus('connecting');
    this.#log('info', `Connecting to ${this.#url}…`);

    try {
      this.#ws = new WebSocket(this.#url);
      this.#ws.binaryType = 'arraybuffer';
    } catch (err) {
      this.#log('error', `Failed to create WebSocket: ${err.message}`);
      this.#scheduleReconnect();
      return;
    }

    this.#ws.addEventListener('open', () => {
      this.#reconnectDelay = 1000;
      this.#log('info', 'WebSocket connected. Joining room…');

      const joinMsg = { type: 'join', room: this.#room, role: this.#role };
      if (this.#name) joinMsg.name = this.#name;
      this.#ws.send(JSON.stringify(joinMsg));

      this.#startPing();
    });

    this.#ws.addEventListener('message', (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.#handleBinaryMessage(new Uint8Array(event.data));
      } else {
        this.#handleTextMessage(event.data);
      }
    });

    this.#ws.addEventListener('close', () => {
      this.#clearPingTimer();
      this.#updateConnectionStatus('disconnected');

      if (this.#shouldReconnect) {
        this.#log('warn', 'Connection lost. Reconnecting…');
        this.#scheduleReconnect();
      }
    });

    this.#ws.addEventListener('error', () => {
      // The close event will fire after this — reconnection handled there
    });
  }

  /** @param {string} data */
  #handleTextMessage(data) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      this.#log('warn', 'Received invalid JSON from server.');
      return;
    }

    switch (msg.type) {
      case 'joined':
        this.#updateConnectionStatus('connected');
        this.#log(
          'info',
          `Joined room "${msg.room}" as ${msg.role} (${msg.members} member${msg.members !== 1 ? 's' : ''}).`,
        );
        ui.roomStatus.textContent = msg.room;
        break;

      case 'room-update':
        ui.sendersCount.textContent = msg.senders;
        ui.receiversCount.textContent = msg.receivers;
        break;

      case 'pong':
        if (this.#lastPingSent > 0) {
          const latency = Date.now() - this.#lastPingSent;
          ui.latencyDisplay.textContent = `${latency} ms`;
        }
        break;

      case 'error':
        this.#log('error', `Server error: ${msg.message}`);
        break;

      default:
        break;
    }
  }

  /** @param {Uint8Array} data */
  #handleBinaryMessage(data) {
    // Log MIDI bytes (first few bytes for brevity)
    const hex = [...data]
      .slice(0, 6)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const suffix = data.length > 6 ? ` … (${data.length} bytes)` : '';
    this.#log('midi', `← ${hex}${suffix}`);

    // Forward to MIDI output if available (receiver mode)
    if (this.#activeOutput) {
      this.#activeOutput.send(data);
    }
  }

  // ── Reconnection ────────────────────────────────────────────────

  #scheduleReconnect() {
    this.#clearReconnectTimer();

    const delay = this.#reconnectDelay;
    this.#log('info', `Reconnecting in ${(delay / 1000).toFixed(1)}s…`);

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.#openConnection();
    }, delay);

    // Exponential backoff with cap
    this.#reconnectDelay = Math.min(
      this.#reconnectDelay * 2,
      this.#maxReconnectDelay,
    );
  }

  #clearReconnectTimer() {
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }

  // ── Application-level ping ─────────────────────────────────────

  #startPing() {
    this.#clearPingTimer();
    this.#pingTimer = setInterval(() => {
      if (this.#ws?.readyState === WebSocket.OPEN) {
        this.#lastPingSent = Date.now();
        this.#ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);
  }

  #clearPingTimer() {
    if (this.#pingTimer !== null) {
      clearInterval(this.#pingTimer);
      this.#pingTimer = null;
    }
  }

  // ── Web MIDI API ────────────────────────────────────────────────

  /** Request Web MIDI access and populate device lists. */
  async initMidi() {
    if (!navigator.requestMIDIAccess) {
      ui.midiStatus.textContent =
        'Web MIDI API is not supported in this browser.';
      this.#log('error', 'Web MIDI API not available.');
      return;
    }

    try {
      this.#midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      ui.midiStatus.textContent = 'MIDI access granted.';
      this.#log('info', 'Web MIDI access granted.');

      this.#midiAccess.addEventListener('statechange', () => {
        this.#populateDevices();
      });

      this.#populateDevices();
    } catch (err) {
      ui.midiStatus.textContent = `MIDI access denied: ${err.message}`;
      this.#log('error', `MIDI access denied: ${err.message}`);
    }
  }

  /** Populate the device <select> based on the current role. */
  #populateDevices() {
    const select = ui.midiDevice;
    const role = ui.clientRole.value;
    select.innerHTML = '';

    const devices =
      role === 'sender'
        ? this.#midiAccess.inputs
        : this.#midiAccess.outputs;

    if (devices.size === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = `— No MIDI ${role === 'sender' ? 'inputs' : 'outputs'} found —`;
      select.appendChild(opt);
      return;
    }

    for (const [id, device] of devices) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = device.name || id;
      select.appendChild(opt);
    }

    // Auto-select first device
    this.#bindDevice(select.value);
  }

  /**
   * Bind to the selected MIDI device.
   *
   * @param {string} deviceId
   */
  #bindDevice(deviceId) {
    if (!this.#midiAccess || !deviceId) return;

    const role = ui.clientRole.value;

    if (role === 'sender') {
      // Unbind previous input
      if (this.#activeInput) {
        this.#activeInput.onmidimessage = null;
      }

      this.#activeInput = this.#midiAccess.inputs.get(deviceId) || null;
      if (this.#activeInput) {
        this.#activeInput.onmidimessage = (event) => {
          if (this.#ws?.readyState === WebSocket.OPEN) {
            this.#ws.send(event.data);

            const hex = [...event.data]
              .slice(0, 6)
              .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
              .join(' ');
            this.#log('midi', `→ ${hex}`);
          }
        };
        this.#log('info', `Bound to MIDI input: ${this.#activeInput.name}`);
      }
    } else {
      this.#activeOutput = this.#midiAccess.outputs.get(deviceId) || null;
      if (this.#activeOutput) {
        this.#log(
          'info',
          `Bound to MIDI output: ${this.#activeOutput.name}`,
        );
      }
    }
  }

  /** Refresh device list and rebind. */
  refreshDevices() {
    if (this.#midiAccess) {
      this.#populateDevices();
    }
  }

  /** Select a specific device by ID. */
  selectDevice(deviceId) {
    this.#bindDevice(deviceId);
  }

  // ── UI helpers ──────────────────────────────────────────────────

  /**
   * @param {'connected' | 'connecting' | 'disconnected'} state
   */
  #updateConnectionStatus(state) {
    const el = ui.connectionStatus;
    el.textContent =
      state.charAt(0).toUpperCase() + state.slice(1);
    el.className = `status-value ${state}`;
  }

  /**
   * Append a line to the activity log.
   *
   * @param {'info' | 'warn' | 'error' | 'midi'} level
   * @param {string} text
   */
  #log(level, text) {
    const log = ui.activityLog;
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-${level}">${escapeHtml(text)}</span>`;

    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;

    // Keep log from growing unbounded
    while (log.children.length > 200) {
      log.removeChild(log.firstChild);
    }
  }
}

// ── HTML escaping ────────────────────────────────────────────────

/** @param {string} str */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── UI references ────────────────────────────────────────────────

const ui = {
  relayUrl: document.getElementById('relay-url'),
  roomName: document.getElementById('room-name'),
  clientRole: document.getElementById('client-role'),
  clientName: document.getElementById('client-name'),
  connectBtn: document.getElementById('connect-btn'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  midiDevice: document.getElementById('midi-device'),
  midiDeviceLabel: document.getElementById('midi-device-label'),
  midiRefreshBtn: document.getElementById('midi-refresh-btn'),
  midiStatus: document.getElementById('midi-status'),
  connectionStatus: document.getElementById('connection-status'),
  roomStatus: document.getElementById('room-status'),
  sendersCount: document.getElementById('senders-count'),
  receiversCount: document.getElementById('receivers-count'),
  latencyDisplay: document.getElementById('latency-display'),
  activityLog: document.getElementById('activity-log'),
  clearLogBtn: document.getElementById('clear-log-btn'),
};

// ── Initialise ───────────────────────────────────────────────────

const client = new MidiRelayClient();

// Connect button
ui.connectBtn.addEventListener('click', () => {
  const url = ui.relayUrl.value.trim();
  const room = ui.roomName.value.trim();
  const role = ui.clientRole.value;
  const name = ui.clientName.value.trim();

  if (!url || !room) {
    alert('Please enter a relay URL and room name.');
    return;
  }

  ui.connectBtn.disabled = true;
  ui.disconnectBtn.disabled = false;
  client.connect(url, room, role, name);
});

// Disconnect button
ui.disconnectBtn.addEventListener('click', () => {
  client.disconnect();
  ui.connectBtn.disabled = false;
  ui.disconnectBtn.disabled = true;
});

// Role change updates device label and list
ui.clientRole.addEventListener('change', () => {
  const role = ui.clientRole.value;
  ui.midiDeviceLabel.textContent =
    role === 'sender' ? 'Input Device (Sender)' : 'Output Device (Receiver)';
  client.refreshDevices();
});

// MIDI device selection
ui.midiDevice.addEventListener('change', () => {
  client.selectDevice(ui.midiDevice.value);
});

// Refresh MIDI devices
ui.midiRefreshBtn.addEventListener('click', () => {
  client.refreshDevices();
});

// Clear log
ui.clearLogBtn.addEventListener('click', () => {
  ui.activityLog.innerHTML = '';
});

// Initialise Web MIDI
client.initMidi();
