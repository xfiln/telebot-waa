// plugins/autofix-monitor.js
const fs = require('fs');
const path = require('path');
const syntaxError = require('syntax-error');
const { GoogleGenAI } = require('@google/genai');
const cp = require('child_process');
const { promisify } = require('util');

const exec = promisify(cp.exec).bind(cp);

class AutoCodeMonitor {
  constructor(config = {}) {
    this.conn = null;
    this.pluginsDir = config.pluginsDir || __dirname;
    this.backupDir = config.backupDir || path.join(this.pluginsDir, '../backups');
    this.ownerIds = (global.ownerid || []).map(String);
    this.checkInterval = Number(config.checkInterval || 30000);
    this.autoFix = config.autoFix !== undefined ? !!config.autoFix : true;
    this.isRunning = false;
    this.fileHashes = new Map();
    this.errorFiles = new Set();
    this.fixQueue = [];
    this.isFixing = false;
    this.projectRoot = config.projectRoot || path.join(this.pluginsDir, '..');

    const apiKey = (global.geminiKey || process.env.GEMINI_API_KEY || '').trim();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true });
  }

  setConn(conn) {
    if (!this.conn) this.conn = conn;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scanAllFiles();
    this.setupWatcher();
    this.intervalId = setInterval(() => this.scanAllFiles(), this.checkInterval);
    this.startFixQueue();
    this.notifyOwner('🤖 *Auto Code Monitor Started*');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.watcher) this.watcher.close();
    if (this.intervalId) clearInterval(this.intervalId);
    this.notifyOwner('⚠️ Auto Code Monitor Stopped');
  }

  setupWatcher() {
    try {
      this.watcher = fs.watch(this.pluginsDir, { persistent: true }, (_, filename) => {
        if (filename && filename.endsWith('.js')) setTimeout(() => this.checkFile(filename), 1000);
      });
    } catch (e) {
      console.error('[AUTO MONITOR] Watcher error:', e.message);
    }
  }

  async scanAllFiles() {
    try {
      const files = fs.readdirSync(this.pluginsDir).filter(f => f.endsWith('.js'));
      for (const file of files) await this.checkFile(file);
    } catch (e) {
      console.error('[AUTO MONITOR] Scan error:', e.message);
    }
  }

  async checkFile(filename) {
    try {
      const filePath = path.join(this.pluginsDir, filename);
      if (!fs.existsSync(filePath)) return false;

      const code = fs.readFileSync(filePath, 'utf8');
      const hash = this.hashCode(code);
      const oldHash = this.fileHashes.get(filename);
      if (oldHash === hash) return false;
      this.fileHashes.set(filename, hash);

      const err = syntaxError(code, filename);
      if (err) {
        this.errorFiles.add(filename);
        if (this.autoFix && this.ai) {
          this.addToFixQueue(filename, {
            type: 'syntax',
            message: err.message,
            line: err.line || 'unknown',
            stack: ''
          });
        }
        this.notifyOwner(`⚠️ Error: \`${filename}\`\n${err.message}`);
        return true;
      }

      const runtimeErr = this.loadCheck(filePath, filename);
      if (runtimeErr) {
        const msg = runtimeErr.message || '';
        const missingMatch = msg.match(/Cannot find module '([^']+)'/i);
        let errorInfo = {
          type: 'runtime',
          message: runtimeErr.message,
          line: runtimeErr.line || 'unknown',
          stack: runtimeErr.stack || ''
        };

        if (missingMatch) {
          errorInfo = {
            type: 'module_not_found',
            module: missingMatch[1],
            message: runtimeErr.message,
            line: runtimeErr.line || 'unknown',
            stack: runtimeErr.stack || ''
          };
        }

        this.errorFiles.add(filename);
        if (this.autoFix && this.ai) this.addToFixQueue(filename, errorInfo);

        if (errorInfo.type === 'module_not_found') {
          this.notifyOwner(`⚠️ Missing module in \`${filename}\`:\n\`${errorInfo.module}\`\n${errorInfo.message}`);
        } else {
          this.notifyOwner(`⚠️ Runtime: \`${filename}\`\n${runtimeErr.message}`);
        }
        return true;
      }

      if (this.errorFiles.has(filename)) {
        this.errorFiles.delete(filename);
        this.notifyOwner(`✅ Fixed: \`${filename}\``);
      }
      return false;
    } catch (e) {
      console.error(`[AUTO MONITOR] Check file error (${filename}):`, e.message);
      return false;
    }
  }

  loadCheck(fullPath, filename) {
    try {
      if (require.cache[fullPath]) delete require.cache[fullPath];
      require(fullPath);
      if (require.cache[fullPath]) delete require.cache[fullPath];
      return null;
    } catch (e) {
      const info = { message: e?.message || String(e), stack: e?.stack || '' };
      const m = info.stack && info.stack.match(new RegExp(`${filename}:(\\d+):(\\d+)`));
      info.line = m ? Number(m[1]) : 'unknown';
      return info;
    }
  }

  addToFixQueue(filename, error) {
    if (!this.fixQueue.find(item => item.filename === filename && item.error.type === error.type)) {
      this.fixQueue.push({ filename, error, addedAt: Date.now() });
    }
  }

  async startFixQueue() {
    setInterval(async () => {
      if (this.isFixing || this.fixQueue.length === 0) return;
      this.isFixing = true;
      const item = this.fixQueue.shift();
      try {
        const res = await this.fixFile(item.filename, item.error);
        if (res?.saved) {
          this.notifyOwner(`🧰 Auto-Fix: \`${item.filename}\`\n${res.changes}`);
        } else if (res?.reason) {
          this.notifyOwner(`❌ Auto-Fix: \`${item.filename}\`\n${res.reason}`);
        }
      } catch (e) {
        console.error(`[AUTO MONITOR] Fix error (${item.filename}):`, e.message);
      }
      this.isFixing = false;
    }, 5000);
  }

  async runInstall(moduleName) {
    try {
      const cmd = `npm install ${moduleName}`;
      const { stdout, stderr } = await exec(cmd, { cwd: this.projectRoot });
      if (stdout && stdout.trim()) {
        const out = stdout.length > 1500 ? stdout.slice(0, 1500) + '\n...[trimmed]' : stdout;
        await this.notifyOwner('```\n' + out + '\n```');
      }
      if (stderr && stderr.trim()) {
        const err = stderr.length > 1500 ? stderr.slice(0, 1500) + '\n...[trimmed]' : stderr;
        await this.notifyOwner('```\n' + err + '\n```');
      }
      return { ok: true };
    } catch (e) {
      await this.notifyOwner(`❌ npm install error: \`${moduleName}\`\n${e.message}`);
      return { ok: false, error: e };
    }
  }

  async fixFile(filename, error) {
    try {
      if (error.type === 'module_not_found') {
        const mod = error.module;
        if (!mod) return { saved: false, reason: 'Module name missing' };

        await this.notifyOwner(`📦 Auto-installing missing module: \`${mod}\``);
        const inst = await this.runInstall(mod);
        if (!inst.ok) return { saved: false, reason: `Install failed for ${mod}` };

        const filePath = path.join(this.pluginsDir, filename);
        const code = fs.readFileSync(filePath, 'utf8');
        const err = syntaxError(code, filename);
        if (!err) {
          this.reloadPlugin(filename);
          return { saved: true, changes: `Module \`${mod}\` installed` };
        }

        if (!this.ai) return { saved: false, reason: `Installed ${mod}, but verification failed: ${err.message}` };

        const fixRes = await this.fixWithAI(filename, code, {
          type: 'syntax',
          message: err.message,
          line: err.line || 'unknown',
          stack: ''
        });
        return fixRes;
      }

      const filePath = path.join(this.pluginsDir, filename);
      const originalCode = fs.readFileSync(filePath, 'utf8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${filename}.${timestamp}.bak`;
      const backupPath = path.join(this.backupDir, backupFilename);
      fs.writeFileSync(backupPath, originalCode);

      if (!this.ai) return { saved: false, reason: 'AI client not initialized' };

      const res = await this.fixWithAI(filename, originalCode, error);
      if (res.saved) res.backup = backupFilename;
      return res;
    } catch (e) {
      console.error('[AUTO MONITOR] Fix error:', e.message);
      return { saved: false, reason: e.message };
    }
  }

  async fixWithAI(filename, originalCode, error) {
    const prompt = `You are an expert JavaScript/Node.js developer for Telegraf-like plugins.
Fix the ${error.type === 'runtime' ? 'runtime' : 'syntax'} error without changing functionality.

Error: ${error.message}
At line: ${error.line}
Stack:
${error.stack || '(no stack)'}

\`\`\`javascript
${originalCode}
\`\`\`

Return only the fixed code in a JavaScript code block.`;

    const result = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });

    const fixedCodeRaw = result?.response?.text || result?.text || '';
    if (!fixedCodeRaw || typeof fixedCodeRaw !== 'string') return { saved: false, reason: 'Empty AI response' };

    const match = fixedCodeRaw.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/);
    const fixedCode = match ? match[1] : fixedCodeRaw.trim();
    if (!fixedCode) return { saved: false, reason: 'No code extracted' };

    const fixedErr = syntaxError(fixedCode, filename);
    if (fixedErr) return { saved: false, reason: `Verification failed: ${fixedErr.message}` };

    const filePath = path.join(this.pluginsDir, filename);
    fs.writeFileSync(filePath, fixedCode);
    this.reloadPlugin(filename);

    const changes = this.summarizeChanges(originalCode, fixedCode);
    return { saved: true, changes };
  }

  summarizeChanges(a, b) {
    const la = a.split('\n').length;
    const lb = b.split('\n').length;
    if (la === lb) return 'Syntax fix only';
    return lb > la ? `Added ${lb - la} lines` : `Removed ${la - lb} lines`;
  }

  reloadPlugin(filename) {
    try {
      const fullPath = path.join(this.pluginsDir, filename);
      if (require.cache[fullPath]) delete require.cache[fullPath];
      if (global.plugins && global.plugins[filename]) {
        global.plugins[filename] = require(fullPath);
      } else {
        require(fullPath);
      }
    } catch (e) {
      console.error(`[AUTO MONITOR] Reload error (${filename}):`, e.message);
    }
  }

  async notifyOwner(message) {
    if (!this.conn || !this.ownerIds || this.ownerIds.length === 0) return;
    for (const ownerId of this.ownerIds) {
      try {
        await this.conn.telegram.sendMessage(ownerId, message, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error(`[AUTO MONITOR] Notify error (${ownerId}):`, e.message);
      }
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      autoFix: this.autoFix,
      totalFiles: this.fileHashes.size,
      errorFiles: Array.from(this.errorFiles),
      queue: this.fixQueue.length,
      fixing: this.isFixing,
      pluginsDir: this.pluginsDir
    };
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

const monitor = global.__autoCodeMonitor || new AutoCodeMonitor({});
global.__autoCodeMonitor = monitor;

let handler = async (m, { conn, command, text }) => {
  monitor.setConn(conn);
  if (!monitor.isRunning) monitor.start();

  switch (command) {
    case 'monstatus':
    case 'monitorstatus': {
      const s = monitor.getStatus();
      let msg = `📊 *Auto Code Monitor*\n`;
      msg += `Status: ${s.running ? '🟢 Running' : '🔴 Stopped'}\n`;
      msg += `AutoFix: ${s.autoFix ? '✅' : '❌'}\n`;
      msg += `Files: ${s.totalFiles}\n`;
      msg += `Errors: ${s.errorFiles.length}\n`;
      msg += `Queue: ${s.queue}\n`;
      msg += `Fixing: ${s.fixing ? 'Yes' : 'No'}\n`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: { message_id: m.id } });
      break;
    }
    case 'monstart':
    case 'monitorstart':
      monitor.start();
      await m.reply('✅ Monitor started');
      break;
    case 'monstop':
    case 'monitorstop':
      monitor.stop();
      await m.reply('⚠️ Monitor stopped');
      break;
    case 'montoggle':
    case 'monitortoggle':
      if (String(text).trim() === 'autofix') {
        monitor.autoFix = !monitor.autoFix;
        await m.reply(`🔧 AutoFix ${monitor.autoFix ? 'enabled' : 'disabled'}`);
      } else {
        await m.reply('Gunakan: /montoggle autofix');
      }
      break;
    default:
      await m.reply('Perintah: /monstatus, /monstart, /monstop, /montoggle autofix');
  }
};

handler.help = ['monstatus', 'monstart', 'monstop', 'montoggle'];
handler.tags = ['owner'];
handler.command = /^(monitorstatus|monstatus|monitorstart|monstart|monitorstop|monstop|monitortoggle|montoggle)$/i;
handler.owner = true;

module.exports = handler;