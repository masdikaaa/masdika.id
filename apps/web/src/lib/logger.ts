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

    // Telemetry Pipeline Endpoint: Vector.dev (Ultra-Lightweight Rust Pipeline) / Logstash
    const rawPipelineUrl = process.env.VECTOR_URL || process.env.LOGSTASH_URL;
    const pipelineUrl = rawPipelineUrl ? rawPipelineUrl.replace(/^["']|["']$/g, '').trim() : undefined;
    if (!pipelineUrl) return; // Abaikan jika tidak ada setting telemetry pipeline

    try {
      // Automatic Elastic APM Distributed Tracing Correlation (Gojek / Tokopedia Enterprise standard)
      let traceId: string | undefined;
      let transactionId: string | undefined;
      try {
        const apm = (globalThis as any).elasticApm;
        if (apm && typeof apm.isStarted === 'function' && apm.isStarted()) {
          const ids = apm.currentTraceIds;
          if (ids) {
            traceId = ids['trace.id'];
            transactionId = ids['transaction.id'];
          }
        }
      } catch {
        // APM trace capture fallback
      }

      const mergedContext = {
        ...(context || {}),
        ...(traceId ? { trace_id: traceId } : {}),
        ...(transactionId ? { transaction_id: transactionId } : {}),
      };

      const payload: LogPayload = {
        level,
        message,
        context: mergedContext,
        app: 'masdika-web',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      };

      // Kirim ke Vector/Logstash (non-blocking / tidak menggunakan await di luar agar tidak melambatkan aplikasi)
      fetch(pipelineUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Timeout pendek agar Next.js tidak hang jika pipeline log sedang busy
        signal: AbortSignal.timeout(3000), 
      }).catch((err) => {
        // Jangan crash aplikasi jika gagal mengirim ke pipeline
        console.error('[LOG_PIPELINE_ERROR] Gagal mengirim log:', err.message);
      });
    } catch (error) {
      console.error('[LOG_PIPELINE_ERROR] Error internal saat menyusun log:', error);
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
