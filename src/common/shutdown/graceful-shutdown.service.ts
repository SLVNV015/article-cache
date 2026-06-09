import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { Server } from 'http';
import { Socket } from 'net';
import pino from 'pino';

/**
 * @description Сервис для управления процессом завершения работы приложения, обертка. Завершаем прием соединений по http, ws даем время на завершение и уходим
 */
@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private readonly FORCE_TIMEOUT = 15000;
  private readonly connections = new Set<Socket>();
  private server: Server;
  private readonly logger = pino({ name: 'GracefulShutdownService' });
  private isShutingDown = false;

  /**
   * @param signal - Shutdown signal
   */
  public async beforeApplicationShutdown(signal?: string): Promise<void> {
    // this.logger.info(`Shutdown signal received: ${signal}`);

    // провека на двойной вызово
    if (this.isShutingDown) {
      return;
    }
    this.isShutingDown = true;

    this.startShutdownTimer();

    if (!this.server) {
      return;
    }

    this.server.close((err) => {
      if (err) {
        this.logger.error(err);
      } else {
        this.logger.info('HTTP server closed');
      }
    });

    this.closeIdleConnections();
  }

  public init(server: Server): void {
    this.server = server;
    this.server.on('connection', (socket) => {
      this.connections.add(socket);
      socket.once('close', () => {
        this.connections.delete(socket);
      });
    });
  }

  /**
   * @param reason - причина падения
   * @param error -
   */
  public async forceShutdown(reason: string, error: Error): Promise<void> {
    this.logger.error(
      error,
      `Force shutdown: ${reason} innit process of graceful shutdown`,
    );

    await this.beforeApplicationShutdown();
  }

  /** Закрытие сокетов */
  private closeIdleConnections(): void {
    for (const socket of this.connections) {
      socket.destroy();
      this.connections.delete(socket);
    }
  }

  /** Таймер на нормальное закртыие потом просто падаем */
  private startShutdownTimer(): void {
    setTimeout(() => {
      this.logger.error('Shutdown timeout exceeded');
      process.exit(1);
    }, this.FORCE_TIMEOUT).unref();
  }
}
