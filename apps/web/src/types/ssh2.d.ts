declare module 'ssh2' {
  export class Client {
    connect(config: any): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'error', listener: (err: any) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    exec(command: string, callback: (err: any, stream: any) => void): this;
    end(): this;
  }
}

