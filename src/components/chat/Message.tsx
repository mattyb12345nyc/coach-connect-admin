/**
 * Message Component
 * 
 * Displays individual chat messages with rich formatting support.
 * 
 * Features:
 * - Markdown rendering with GitHub Flavored Markdown
 * - Syntax highlighting for code blocks
 * - Copy functionality for code and messages
 * - User feedback (thumbs up/down)
 * - Citation display and interaction
 * - Animated entrance and streaming cursor
 * - Different layouts for user vs assistant messages
 * 
 * Customization:
 * - Modify avatar styles in the component
 * - Adjust markdown prose styles
 * - Customize code block themes (currently using oneDark)
 * - Change animation settings
 */

'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighterComponent } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Type assertion to work around TypeScript issue with react-syntax-highlighter
const SyntaxHighlighter = SyntaxHighlighterComponent as any;
import { motion } from 'framer-motion';
import { 
  Bot, 
  User, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCw,
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';

import type { MessageProps, Citation, ChatMessage } from '@/types';
import { cn, copyToClipboard, formatTimestamp } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AgentAvatar, UserAvatar } from '@/components/ui/avatar';
import { CitationList } from './CitationList';
import { MessageDetails } from './MessageDetails';
import { useMessageStore } from '@/store/messages';
import { useConversationStore } from '@/store/conversations';

interface CodeBlockProps {
  /** Programming language for syntax highlighting */
  language: string;
  /** Code content to display */
  value: string;
}

/**
 * CodeBlock Component
 * 
 * Renders code with syntax highlighting and a copy button.
 * Uses react-syntax-highlighter with the oneDark theme.
 * Copy button appears on hover.
 */
const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-6 px-2 text-xs bg-foreground text-background hover:bg-foreground/90"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

/**
 * StreamingCursor Component
 * 
 * Animated blinking cursor shown at the end of streaming messages
 * to indicate the AI is still generating content
 */
const StreamingCursor: React.FC = () => (
  <span className="inline-block w-0.5 h-4 bg-foreground animate-blink ml-0.5 align-middle" />
);

interface MessageContentProps {
  /** Markdown content to render */
  content: string;
  /** Whether the message is currently being streamed */
  isStreaming?: boolean;
}

/**
 * MessageContent Component
 * 
 * Renders message content with full markdown support including:
 * - Headers, lists, tables (via GFM)
 * - Inline and block code with syntax highlighting
 * - Links that open in new tabs
 * - Streaming cursor when content is being generated
 */
const MessageContent: React.FC<MessageContentProps> = ({ content, isStreaming }) => {
  // Remove <CONTEXT> and </CONTEXT> tags from the content
  const cleanedContent = content.replace(/<CONTEXT>|<\/CONTEXT>/g, '').trim();
  
  return (
    <div className="prose prose-sm max-w-none text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return !isInline && match ? (
              <CodeBlock
                language={match[1]}
                value={String(children).replace(/\n$/, '')}
                {...props}
              />
            ) : (
              <code className="px-1 py-0.5 rounded bg-muted text-sm font-medium" {...props}>
                {children}
              </code>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 no-underline hover:underline inline-flex items-center gap-1"
              >
                {children}
                <ExternalLink className="w-3 h-3" />
              </a>
            );
          },
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
      {isStreaming && <StreamingCursor />}
    </div>
  );
};

interface MessageActionsProps {
  /** The message object containing content and metadata */
  message: ChatMessage;
  /** Handler for user feedback */
  onFeedback?: (feedback: 'like' | 'dislike') => void;
  /** Whether this is the last assistant message */
  isLastAssistant?: boolean;
}

/**
 * MessageActions Component
 * 
 * Action buttons for assistant messages:
 * - Copy message content
 * - Thumbs up/down feedback
 * - Regenerate response (placeholder)
 * 
 * Only visible on hover for cleaner UI
 */
const MessageActions: React.FC<MessageActionsProps> = ({ message, onFeedback, isLastAssistant = false }) => {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(
    message.feedback || null
  );

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      toast.success('Message copied to clipboard');
    }
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    onFeedback?.(type);
    toast.success('Thanks for your feedback!');
  };

  const regenerateLastResponse = useMessageStore(state => state.regenerateLastResponse);
  
  const handleRegenerate = async () => {
    try {
      await regenerateLastResponse();
    } catch (error) {
      // Error handling is done in the store, so we don't need to do anything here
      console.error('Failed to regenerate response:', error);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="icon"
        variant="ghost"
        onClick={handleCopy}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Copy message"
      >
        <Copy className="h-4 w-4" />
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={() => handleFeedback('like')}
        className={cn(
          'h-8 w-8 text-muted-foreground hover:text-foreground',
          feedback === 'like' && 'text-success hover:text-success/90'
        )}
        title="Good response"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={() => handleFeedback('dislike')}
        className={cn(
          'h-8 w-8 text-muted-foreground hover:text-foreground',
          feedback === 'dislike' && 'text-destructive hover:text-destructive/90'
        )}
        title="Bad response"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
      
      {isLastAssistant && (
        <Button
          size="icon"
          variant="ghost"
          onClick={handleRegenerate}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Regenerate response"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

/**
 * Message Component - Main Export
 * 
 * Renders a complete message with avatar, content, citations, and actions.
 * 
 * Layout:
 * - User messages: White background, user avatar, plain text
 * - Assistant messages: Gray background, bot avatar, markdown content
 * 
 * Features:
 * - Smooth entrance animation with Framer Motion
 * - Hover effects for action visibility
 * - Status indicators (sending, error)
 * - Timestamp display
 * - Citation list integration
 * 
 * @param message - The message data to display
 * @param isStreaming - Whether this message is being streamed
 * @param isLast - Whether this is the last message (affects scrolling)
 * @param onCitationClick - Handler for citation interactions
 * @param onFeedback - Handler for user feedback
 * @param className - Additional CSS classes
 */
export const Message: React.FC<MessageProps> = ({
  message,
  agent,
  isStreaming = false,
  isLast = false,
  onCitationClick,
  onPreviewClick,
  onFeedback,
  mode = 'standalone',
  enableCitations,
  className
}) => {
  const isUser = message.role === 'user';

  // Determine if citations should be shown
  // Priority: enableCitations prop > mode-based logic
  const shouldShowCitations = enableCitations !== undefined
    ? enableCitations
    : mode === 'standalone';

  // Debug logging for citations
  React.useEffect(() => {
    if (!isUser && message.citations) {
      console.log('[Message] Citation debug:', {
        messageId: message.id,
        mode,
        enableCitations,
        shouldShowCitations,
        hasCitations: !!message.citations,
        citationCount: message.citations?.length || 0,
        citations: message.citations
      });
    }
  }, [message.citations, mode, enableCitations, shouldShowCitations, isUser, message.id]);
  
  // Get messages from the conversation to check if this is the last assistant message
  const messages = useMessageStore(state => {
    const conversationStore = useConversationStore.getState();
    const currentConversation = conversationStore.currentConversation;
    if (!currentConversation) return [];
    return state.getMessagesForConversation(currentConversation.id.toString());
  });
  
  // Check if this is the last assistant message
  const isLastAssistant = !isUser && messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].id === message.id;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'group relative px-4 py-6 transition-colors',
        isUser ? 'bg-background' : 'bg-muted border-y border-border',
        'hover:bg-opacity-80',
        className
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <UserAvatar 
              size="md" 
              className="bg-secondary"
            />
          ) : (
            <AgentAvatar 
              agent={agent}
              size="md"
              className="bg-background border border-border"
            />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Message Status */}
          {message.status && message.status !== 'sent' && (
            <div className="mb-2 text-xs text-muted-foreground">
              {message.status === 'sending' && 'Sending...'}
              {message.status === 'error' && (
                <span className="text-red-500">Failed to send</span>
              )}
            </div>
          )}
          
          {/* Message Content */}
          {isUser ? (
            <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MessageContent 
              content={message.content} 
              isStreaming={isStreaming}
            />
          )}
          
          {/* Citations - Shown based on enableCitations prop or mode */}
          {shouldShowCitations && message.citations && message.citations.length > 0 && (
            <CitationList
              citations={message.citations}
              onCitationClick={onCitationClick}
              onPreviewClick={onPreviewClick}
            />
          )}
          
          {/* Timestamp */}
          <div className="mt-2 text-xs text-muted-foreground">
            {formatTimestamp(message.timestamp)}
          </div>
          
          {/* Message Details (hidden by default) */}
          <MessageDetails details={message.details} />
          
          {/* Actions */}
          {!isUser && !isStreaming && (
            <MessageActions 
              message={message}
              onFeedback={onFeedback}
              isLastAssistant={isLastAssistant}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};