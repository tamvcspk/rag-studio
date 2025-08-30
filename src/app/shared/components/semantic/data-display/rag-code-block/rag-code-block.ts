import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopyIcon, CheckIcon } from 'lucide-angular';
import { RagIcon } from '../../../atomic';

@Component({
  selector: 'rag-code-block',
  standalone: true,
  imports: [CommonModule, RagIcon],
  templateUrl: './rag-code-block.html',
  styleUrl: './rag-code-block.scss'
})
export class RagCodeBlock {
  readonly code = input.required<string>();
  readonly language = input<string>('');
  readonly title = input<string>('');
  readonly showLineNumbers = input<boolean>(false);
  readonly copyable = input<boolean>(true);
  readonly maxHeight = input<string>('');

  readonly copied = signal(false);

  // Icon components
  readonly CopyIcon = CopyIcon;
  readonly CheckIcon = CheckIcon;

  readonly codeLines = computed(() => {
    return this.code().split('\n');
  });

  readonly blockClasses = computed(() => [
    'rag-code-block',
    this.showLineNumbers() ? 'rag-code-block--with-line-numbers' : ''
  ].filter(Boolean).join(' '));

  readonly blockStyles = computed(() => {
    const styles: Record<string, string> = {};
    if (this.maxHeight()) {
      styles['max-height'] = this.maxHeight();
    }
    return styles;
  });

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }

  readonly copyButtonIcon = computed(() => 
    this.copied() ? this.CheckIcon : this.CopyIcon
  );
}
