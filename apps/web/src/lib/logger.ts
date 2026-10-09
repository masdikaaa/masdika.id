export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  [key: string]: any;
}

/**
 * Utility untuk mengirim log dari Next.js ke Logstash (ELK) secara otomatis
 */
export const logger = {
  async send(level: LogLevel, message: string, context?: Record<string, any>) {
    // Selalu tampilkan di console server lokal (terminal)
    const logOutput = context ? `${message} ${JSON.stringify(context)}` : message;
    
    if (level === 'error') console.error(`[${level.toUpperCase()}]`, logOutput);
    else if (level === 'warn') console.warn(`[${level.toUpperCase()}]`, logOutput);
    else console.log(`[${level.toUpperCase()}]`, logOutput);

    // Jika LOGSTASH_URL disetting (misal http://localhost:5044 atau http://logstash:5044 di Docker)
    const logstashUrl = process.env.LOGSTASH_URL;
    if (!logstashUrl) return; // Abaikan jika tidak ada setting Logstash

    try {
      const payload: LogPayload = {
        level,
        message,
        context,
        app: 'masdika-web',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };

      // Kirim ke Logstash (non-blocking / tidak menggunakan await di luar agar tidak melambatkan aplikasi)
      fetch(logstashUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Timeout pendek agar Next.js tidak hang jika Logstash mati
        signal: AbortSignal.timeout(3000), 
      }).catch((err) => {
        // Jangan crash aplikasi jika gagal mengirim ke Logstash
        console.error('[LOGSTASH_ERROR] Gagal mengirim log:', err.message);
      });
    } catch (error) {
      console.error('[LOGSTASH_ERROR] Error internal saat menyusun log:', error);
    }
  },

  info(message: string, context?: Record<string, any>) {
    return this.send('info', message, context);
  },
  warn(message: string, context?: Record<string, any>) {
    return this.send('warn', message, context);
  },
  error(message: string, context?: Record<string, any>) {
    return this.send('error', message, context);
  },
  debug(message: string, context?: Record<string, any>) {
    // Debug log hanya dikirim jika di development
    if (process.env.NODE_ENV === 'development') {
      return this.send('debug', message, context);
    }
  }
};
