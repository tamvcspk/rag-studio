import { Component, input, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Clock } from 'lucide-angular';
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';

@Component({
  selector: 'rag-timestamp',
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-timestamp.html',
  styleUrl: './rag-timestamp.scss'
})
export class RagTimestamp {
  readonly timestamp = input.required<Date | string | number>();
  readonly format = input<'relative' | 'absolute' | 'both'>('relative');
  readonly showIcon = input<boolean>(false);
  readonly precision = input<'seconds' | 'minutes' | 'hours' | 'days'>('minutes');
  readonly updateInterval = input<boolean>(true);

  // Icon constants
  readonly ClockIcon = Clock;

  private readonly now = signal(new Date());

  constructor() {
    // Update current time every minute for relative timestamps
    if (this.updateInterval()) {
      const interval = setInterval(() => {
        this.now.set(new Date());
      }, 60000);

      // Cleanup interval on destroy
      effect((onCleanup) => {
        onCleanup(() => clearInterval(interval));
      });
    }
  }

  readonly parsedDate = computed(() => {
    const ts = this.timestamp();
    if (ts instanceof Date) return ts;
    if (typeof ts === 'string') return new Date(ts);
    if (typeof ts === 'number') return new Date(ts);
    return new Date();
  });

  readonly relativeTime = computed(() => {
    const date = this.parsedDate();
    const now = this.now();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 0) return 'in the future';
    
    const precision = this.precision();
    
    if (precision === 'seconds') {
      if (diffSec < 60) return diffSec <= 1 ? 'just now' : `${diffSec}s ago`;
    }
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) {
      if (precision === 'minutes') return `${diffMin}m ago`;
    }
    
    if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    if (diffHour < 24) {
      if (precision === 'hours') return `${diffHour}h ago`;
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    }
    
    if (diffDay < 7) {
      if (precision === 'days') return `${diffDay}d ago`;
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    }
    
    if (diffDay < 30) {
      const weeks = Math.floor(diffDay / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    
    if (diffDay < 365) {
      const months = Math.floor(diffDay / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    
    const years = Math.floor(diffDay / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  });

  readonly absoluteTime = computed(() => {
    const date = this.parsedDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const isThisYear = date.getFullYear() === today.getFullYear();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }

    if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }

    if (isThisYear) {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  readonly displayText = computed(() => {
    const format = this.format();
    
    switch (format) {
      case 'absolute':
        return this.absoluteTime();
      case 'both':
        return `${this.relativeTime()} (${this.absoluteTime()})`;
      default:
        return this.relativeTime();
    }
  });

  readonly containerClasses = computed(() => [
    'rag-timestamp',
    this.showIcon() ? 'rag-timestamp--with-icon' : ''
  ].filter(Boolean).join(' '));
}
